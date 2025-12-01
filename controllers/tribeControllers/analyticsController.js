import { db } from "../../config/firebase.js";

const gameSessionsCollection = db.collection("gameSessions");
const gamesCollection = db.collection("games");
const categoriesCollection = db.collection("gamesCategories");

// Start a game session
export const startGameSession = async (req, res) => {
  try {
    const { gameId, userEmail } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    // Create a new game session
    const sessionData = {
      gameId,
      userEmail: userEmail || "anonymous",
      startTime: new Date(),
      endTime: null,
      duration: 0,
      completed: false,
      createdAt: new Date(),
    };

    const docRef = await gameSessionsCollection.add(sessionData);
    
    res.status(201).json({
      success: true,
      sessionId: docRef.id,
      message: "Game session started successfully"
    });

  } catch (error) {
    console.error("Error starting game session:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to start game session" 
    });
  }
};

// End a game session
export const endGameSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { completed = false } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Get the session document
    const sessionDoc = await gameSessionsCollection.doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    const sessionData = sessionDoc.data();
    const endTime = new Date();
    const duration = Math.round((endTime - sessionData.startTime.toDate()) / 1000); // Duration in seconds

    // Update the session
    await gameSessionsCollection.doc(sessionId).update({
      endTime,
      duration,
      completed,
      updatedAt: new Date()
    });

    // Update game statistics
    await updateGameStats(sessionData.gameId, duration);

    res.json({
      success: true,
      duration,
      message: "Game session ended successfully"
    });

  } catch (error) {
    console.error("Error ending game session:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to end game session" 
    });
  }
};

// Get most played games with time-based filtering
export const getMostPlayedGames = async (req, res) => {
  try {
    const { limit = 10, period = 'all', startDate: startDateParam, endDate: endDateParam } = req.query;

    // Calculate date range based on period or custom dates
    let startDate = null;
    let endDate = null;
    const now = new Date();
    
    // Check if custom date range is provided
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    } else if (startDateParam) {
      // Single date - show data for that specific day
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Use period-based filtering
      switch (period) {
        case 'day':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0); // Start of today
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999); // End of today
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7); // 7 days ago
          endDate = new Date(now);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30); // 30 days ago
          endDate = new Date(now);
          break;
        case 'all':
        default:
          startDate = null; // No date filter
          endDate = null;
          break;
      }
    }

    let gamePlayCounts = {};
    let gamePlayTimes = {};
    let gameDetails = {};

    if (startDate) {
      // For time-based periods, count sessions within the date range
      const queryEndDate = endDate || now;
      console.log(`Filtering sessions from ${startDate.toISOString()} to ${queryEndDate.toISOString()}`);
      
      const sessionsQuery = gameSessionsCollection
        .where("startTime", ">=", startDate)
        .where("startTime", "<=", queryEndDate);
      
      const sessionsSnapshot = await sessionsQuery.get();
      
      // Count plays per game from sessions
      sessionsSnapshot.forEach(doc => {
        const sessionData = doc.data();
        const gameId = sessionData.gameId;
        
        if (gameId) {
          gamePlayCounts[gameId] = (gamePlayCounts[gameId] || 0) + 1;
          gamePlayTimes[gameId] = (gamePlayTimes[gameId] || 0) + (sessionData.duration || 0);
        }
      });

      // Get game details for games that have plays in this period
      const gameIds = Object.keys(gamePlayCounts);
      if (gameIds.length > 0) {
        for (const gameId of gameIds) {
          try {
            const gameDoc = await gamesCollection.doc(gameId).get();
            if (gameDoc.exists) {
              gameDetails[gameId] = gameDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching game ${gameId}:`, error);
          }
        }
      }
    } else {
      // For 'all' period, use the existing totalPlayTime from games collection
      const gamesSnapshot = await gamesCollection
        .orderBy("totalPlayTime", "desc")
        .limit(parseInt(limit) * 2) // Get more to account for filtering
        .get();

      gamesSnapshot.forEach(doc => {
        const gameData = doc.data();
        const gameId = doc.id;
        
        if ((gameData.totalPlayTime || 0) > 0) {
          gamePlayCounts[gameId] = gameData.totalPlays || 0;
          gamePlayTimes[gameId] = gameData.totalPlayTime || 0;
          gameDetails[gameId] = gameData;
        }
      });
    }

    // Get all categories to map IDs to names
    const categoriesSnapshot = await categoriesCollection.get();
    const categoriesMap = {};
    
    categoriesSnapshot.forEach(doc => {
      const categoryData = doc.data();
      categoriesMap[doc.id] = categoryData.name || categoryData.title || 'Unknown Category';
    });

    // Sort games by total play time (highest first) and create response
    const gameEntries = Object.keys(gamePlayCounts).map(gameId => {
      const gameData = gameDetails[gameId];
      if (!gameData) return null;

      const categoryName = gameData.category 
        ? categoriesMap[gameData.category] || 'Unknown Category'
        : 'Uncategorized';

      const playCount = gamePlayCounts[gameId] || 0;
      const totalPlayTime = gamePlayTimes[gameId] || 0;
      const averagePlayTime = playCount > 0 ? Math.round(totalPlayTime / playCount) : 0;
        
      return {
        id: gameId,
        title: gameData.title,
        category: categoryName,
        categoryId: gameData.category,
        image: gameData.image,
        totalPlays: playCount,
        totalPlayTime: totalPlayTime,
        averagePlayTime: averagePlayTime,
        rating: gameData.rating || 0,
        period: period
      };
    }).filter(game => game !== null);

    // Sort by total play time (highest first)
    const sortedGames = gameEntries
      .sort((a, b) => b.totalPlayTime - a.totalPlayTime)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: sortedGames,
      period: period,
      dateRange: startDate ? {
        from: startDate.toISOString(),
        to: (endDate || now).toISOString()
      } : null
    });

  } catch (error) {
    console.error("Error getting most played games:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get most played games" 
    });
  }
};

// Get analytics summary
export const getAnalyticsSummary = async (req, res) => {
  try {
    // Get total sessions count
    const sessionsSnapshot = await gameSessionsCollection.get();
    const totalSessions = sessionsSnapshot.size;

    // Calculate total play time and average session duration
    let totalPlayTime = 0;
    let completedSessions = 0;
    
    sessionsSnapshot.forEach(doc => {
      const session = doc.data();
      if (session.duration) {
        totalPlayTime += session.duration;
      }
      if (session.completed) {
        completedSessions++;
      }
    });

    const averageSessionDuration = totalSessions > 0 ? Math.round(totalPlayTime / totalSessions) : 0;

    // Get total games count
    const gamesSnapshot = await gamesCollection.get();
    const totalGames = gamesSnapshot.size;

    // Get games with plays
    let gamesWithPlays = 0;
    gamesSnapshot.forEach(doc => {
      const game = doc.data();
      if ((game.totalPlays || 0) > 0) {
        gamesWithPlays++;
      }
    });

    // Get recent sessions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSessionsSnapshot = await gameSessionsCollection
      .where("startTime", ">=", sevenDaysAgo)
      .get();
    
    const recentSessions = recentSessionsSnapshot.size;

    res.json({
      success: true,
      data: {
        totalSessions,
        totalPlayTime,
        averageSessionDuration,
        totalGames,
        gamesWithPlays,
        recentSessions,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
      }
    });

  } catch (error) {
    console.error("Error getting analytics summary:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get analytics summary" 
    });
  }
};

// Helper function to update game statistics
const updateGameStats = async (gameId, sessionDuration) => {
  try {
    const gameRef = gamesCollection.doc(gameId);
    const gameDoc = await gameRef.get();

    if (gameDoc.exists) {
      const gameData = gameDoc.data();
      const currentTotalPlays = gameData.totalPlays || 0;
      const currentTotalPlayTime = gameData.totalPlayTime || 0;

      await gameRef.update({
        totalPlays: currentTotalPlays + 1,
        totalPlayTime: currentTotalPlayTime + sessionDuration,
        lastPlayed: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error("Error updating game stats:", error);
    // Don't throw error - this is optional
  }
};

// Get game-specific analytics
export const getGameAnalytics = async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    // Get game sessions for this game
    const sessionsSnapshot = await gameSessionsCollection
      .where("gameId", "==", gameId)
      .orderBy("startTime", "desc")
      .get();

    const sessions = [];
    let totalDuration = 0;
    let completedSessions = 0;

    sessionsSnapshot.forEach(doc => {
      const sessionData = doc.data();
      sessions.push({
        id: doc.id,
        ...sessionData,
        startTime: sessionData.startTime.toDate(),
        endTime: sessionData.endTime ? sessionData.endTime.toDate() : null
      });

      if (sessionData.duration) {
        totalDuration += sessionData.duration;
      }
      if (sessionData.completed) {
        completedSessions++;
      }
    });

    const totalSessions = sessions.length;
    const averageDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    res.json({
      success: true,
      data: {
        gameId,
        totalSessions,
        totalDuration,
        averageDuration,
        completionRate,
        sessions: sessions.slice(0, 20) // Return latest 20 sessions
      }
    });

  } catch (error) {
    console.error("Error getting game analytics:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get game analytics" 
    });
  }
};

// Get detailed game players (users who played the game)
export const getGamePlayers = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { limit = 100 } = req.query;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required"
      });
    }

    // Get all game sessions for this game
    const sessionsSnapshot = await gameSessionsCollection
      .where("gameId", "==", gameId)
      .get();

    // Track unique users and their session data
    const userMap = new Map(); // email -> { userData, sessions: [] }
    const usersCollection = db.collection("users");

    // Helper to convert Firestore Timestamp or Date to Date
    const toDate = (value) => {
      if (!value) return null;
      if (value.toDate && typeof value.toDate === "function") {
        return value.toDate();
      }
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === "string" || typeof value === "number") {
        return new Date(value);
      }
      return null;
    };

    // Process sessions
    sessionsSnapshot.forEach(doc => {
      const sessionData = doc.data();
      const userEmail = sessionData.userEmail || sessionData.email;
      const userId = sessionData.userId;

      // Skip anonymous users
      if ((!userEmail || userEmail === "anonymous") && !userId) return;

      // Use email as key, or userId if no email
      const userKey = userEmail || userId;
      if (!userKey) return;

      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          email: userEmail || null,
          userId: userId || null,
          sessions: [],
          totalPlays: 0,
          totalPlayTime: 0,
          lastPlayed: null
        });
      }

      const userData = userMap.get(userKey);
      const startTime = toDate(sessionData.startTime);
      if (!startTime) return; // Skip if we can't parse start time
      
      userData.sessions.push({
        sessionId: doc.id,
        startTime: startTime.toISOString(),
        endTime: toDate(sessionData.endTime)?.toISOString() || null,
        duration: sessionData.duration || 0,
        completed: sessionData.completed || false
      });

      userData.totalPlays += 1;
      userData.totalPlayTime += (sessionData.duration || 0);
      
      if (!userData.lastPlayed || startTime > new Date(userData.lastPlayed)) {
        userData.lastPlayed = startTime.toISOString();
      }
    });

    // Fetch user profile data (gamerTag, displayName) from users collection
    const usersList = Array.from(userMap.values());
    const userProfiles = new Map();

    // Try to get user profiles by userId first (more efficient), then by email
    for (const user of usersList) {
      try {
        let userDoc = null;
        let profileData = null;

        // Try to get by userId first (if available)
        if (user.userId) {
          try {
            userDoc = await usersCollection.doc(user.userId).get();
            if (userDoc.exists) {
              profileData = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching profile by userId ${user.userId}:`, error);
          }
        }

        // If not found by userId, try by email
        if (!userDoc?.exists && user.email) {
          try {
            const userQuery = await usersCollection
              .where("email", "==", user.email)
              .limit(1)
              .get();

            if (!userQuery.empty) {
              userDoc = userQuery.docs[0];
              profileData = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching profile by email ${user.email}:`, error);
          }
        }

        // Set profile data
        const userKey = user.email || user.userId;
        if (profileData && userDoc) {
          userProfiles.set(userKey, {
            userId: userDoc.id,
            displayName: profileData.displayName || profileData.email?.split("@")[0] || "Unknown",
            gamerTag: profileData.gamerTag || null,
            photoURL: profileData.photoURL || null
          });
        } else {
          // Fallback if not found
          userProfiles.set(userKey, {
            userId: user.userId || null,
            displayName: user.email ? user.email.split("@")[0] : "Unknown",
            gamerTag: null,
            photoURL: null
          });
        }
      } catch (error) {
        console.error(`Error fetching profile for user:`, error);
        const userKey = user.email || user.userId;
        userProfiles.set(userKey, {
          userId: user.userId || null,
          displayName: user.email ? user.email.split("@")[0] : "Unknown",
          gamerTag: null,
          photoURL: null
        });
      }
    }

    // Combine user data with profile data
    const players = usersList.map(user => {
      const userKey = user.email || user.userId;
      const profile = userProfiles.get(userKey) || {
        userId: user.userId || null,
        displayName: user.email ? user.email.split("@")[0] : "Unknown",
        gamerTag: null,
        photoURL: null
      };

      return {
        email: user.email || null,
        userId: profile.userId || user.userId || null,
        displayName: profile.displayName,
        gamerTag: profile.gamerTag,
        photoURL: profile.photoURL,
        totalPlays: user.totalPlays,
        totalPlayTime: user.totalPlayTime,
        averagePlayTime: user.totalPlays > 0 ? Math.round(user.totalPlayTime / user.totalPlays) : 0,
        lastPlayed: user.lastPlayed,
        sessions: user.sessions.slice(0, 10) // Latest 10 sessions per user
      };
    });

    // Sort by total plays (descending)
    players.sort((a, b) => b.totalPlays - a.totalPlays);

    // Get game details
    const gameDoc = await gamesCollection.doc(gameId).get();
    const gameData = gameDoc.exists ? gameDoc.data() : null;

    res.json({
      success: true,
      data: {
        gameId,
        gameTitle: gameData?.title || "Unknown Game",
        totalPlayers: players.length,
        totalSessions: sessionsSnapshot.size,
        players: players.slice(0, parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error getting game players:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get game players",
      message: error.message
    });
  }
};