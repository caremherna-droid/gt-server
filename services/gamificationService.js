import { db } from "../config/firebase.js";
import admin from "../config/firebase.js";

// Collections
const userStatsCollection = db.collection("userStats");
const userAchievementsCollection = db.collection("userAchievements");
const streaksCollection = db.collection("streaks");
const usersCollection = db.collection("users");

// XP values for different actions
export const XP_VALUES = {
  PLAY_GAME: 10,
  RATE_GAME: 5,
  COMMENT: 3,
  SHARE_GAME: 5,
};

// XP required for each level
export const getXPForLevel = (level) => {
  if (level <= 1) return 0;
  // Exponential growth: 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
};

// Calculate level from total XP
export const getLevelFromXP = (totalXP) => {
  let level = 1;
  let xpNeeded = 0;
  
  while (xpNeeded <= totalXP) {
    level++;
    xpNeeded = getXPForLevel(level);
    if (xpNeeded > totalXP) {
      return level - 1;
    }
  }
  
  return level;
};

// Get level tier name
export const getLevelTier = (level) => {
  if (level <= 10) return "Novice";
  if (level <= 25) return "Gamer";
  if (level <= 50) return "Pro";
  if (level <= 100) return "Master";
  return "Legend";
};

// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_PLAY: {
    id: "first_play",
    name: "First Play",
    description: "Play your first game",
    rarity: "common",
    condition: { type: "games_played", count: 1 },
  },
  EXPLORER: {
    id: "explorer",
    name: "Explorer",
    description: "Play 10 different games",
    rarity: "common",
    condition: { type: "unique_games_played", count: 10 },
  },
  MARATHON_GAMER: {
    id: "marathon_gamer",
    name: "Marathon Gamer",
    description: "Play games for 5 hours total",
    rarity: "rare",
    condition: { type: "total_play_time", hours: 5 },
  },
  SOCIAL_BUTTERFLY: {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Leave 20 comments",
    rarity: "common",
    condition: { type: "comments_count", count: 20 },
  },
  CRITIC: {
    id: "critic",
    name: "Critic",
    description: "Rate 50 games",
    rarity: "rare",
    condition: { type: "ratings_count", count: 50 },
  },
  COLLECTOR: {
    id: "collector",
    name: "Collector",
    description: "Add 25 games to favorites",
    rarity: "common",
    condition: { type: "favorites_count", count: 25 },
  },
  EARLY_BIRD: {
    id: "early_bird",
    name: "Early Bird",
    description: "Play 5 games before 9 AM",
    rarity: "epic",
    condition: { type: "early_plays", count: 5 },
  },
  NIGHT_OWL: {
    id: "night_owl",
    name: "Night Owl",
    description: "Play 5 games after 10 PM",
    rarity: "epic",
    condition: { type: "night_plays", count: 5 },
  },
  CATEGORY_MASTER: {
    id: "category_master",
    name: "Category Master",
    description: "Play games in 5+ categories",
    rarity: "legendary",
    condition: { type: "category_completion", count: 5 },
  },
  PLATFORM_HOPPER: {
    id: "platform_hopper",
    name: "Platform Hopper",
    description: "Play games on 3+ platforms",
    rarity: "legendary",
    condition: { type: "all_platforms", count: 3 },
  },
};

/**
 * Get or create user stats
 */
export const getUserStats = async (userId) => {
  try {
    const statsDoc = await userStatsCollection.doc(userId).get();
    
    if (!statsDoc.exists) {
      // Create initial stats (use arrays for Firestore)
      const initialStats = {
        userId,
        totalXP: 0,
        level: 1,
        gamesPlayed: 0,
        uniqueGamesPlayed: [],
        totalPlayTime: 0, // in minutes
        commentsCount: 0,
        ratingsCount: 0,
        favoritesCount: 0,
        sharesCount: 0,
        categoriesPlayed: [],
        platformsPlayed: [],
        earlyPlays: 0, // plays before 9 AM
        nightPlays: 0, // plays after 10 PM
        lastLoginDate: null,
        loginStreak: 0,
        playStreak: 0,
        lastPlayDate: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await userStatsCollection.doc(userId).set(initialStats);
      return { id: userId, ...initialStats };
    }
    
    const data = statsDoc.data();
    // Handle Firestore timestamps and return data
    const processedData = {
      id: statsDoc.id,
      ...data,
    };
    
    // Convert Firestore timestamps to ISO strings for JSON serialization
    if (data.lastLoginDate) {
      processedData.lastLoginDate = data.lastLoginDate.toDate ? data.lastLoginDate.toDate() : data.lastLoginDate;
    }
    if (data.lastPlayDate) {
      processedData.lastPlayDate = data.lastPlayDate.toDate ? data.lastPlayDate.toDate() : data.lastPlayDate;
    }
    if (data.createdAt) {
      processedData.createdAt = data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt;
    }
    if (data.updatedAt) {
      processedData.updatedAt = data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt;
    }
    
    return processedData;
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw error;
  }
};

/**
 * Update user stats
 */
const updateUserStats = async (userId, updates) => {
  try {
    const firestoreUpdates = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await userStatsCollection.doc(userId).update(firestoreUpdates);
  } catch (error) {
    console.error("Error updating user stats:", error);
    throw error;
  }
};

/**
 * Add XP to user
 */
export const addXP = async (userId, xpAmount, action, metadata = {}) => {
  try {
    const stats = await getUserStats(userId);
    const newTotalXP = stats.totalXP + xpAmount;
    const newLevel = getLevelFromXP(newTotalXP);
    const oldLevel = stats.level;
    
    const updates = {
      totalXP: newTotalXP,
      level: newLevel,
    };
    
    // Check for level up
    const leveledUp = newLevel > oldLevel;
    
    await updateUserStats(userId, updates);
    
    // Log XP transaction
    await db.collection("xpTransactions").add({
      userId,
      xpAmount,
      action,
      metadata,
      totalXP: newTotalXP,
      level: newLevel,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return {
      newTotalXP,
      newLevel,
      oldLevel,
      leveledUp,
      xpEarned: xpAmount,
    };
  } catch (error) {
    console.error("Error adding XP:", error);
    throw error;
  }
};

/**
 * Track game play
 */
export const trackGamePlay = async (userId, gameId, gameData = {}) => {
  try {
    const stats = await getUserStats(userId);
    const now = new Date();
    const hour = now.getHours();
    
    // Update stats
    const uniqueGames = new Set(stats.uniqueGamesPlayed || []);
    uniqueGames.add(gameId);
    
    const updates = {
      gamesPlayed: admin.firestore.FieldValue.increment(1),
      uniqueGamesPlayed: Array.from(uniqueGames),
    };
    
    // Track early bird / night owl
    if (hour < 9) {
      updates.earlyPlays = admin.firestore.FieldValue.increment(1);
    } else if (hour >= 22) {
      updates.nightPlays = admin.firestore.FieldValue.increment(1);
    }
    
    // Track categories and platforms
    if (gameData.categoryId) {
      const categories = new Set(stats.categoriesPlayed || []);
      if (!categories.has(gameData.categoryId)) {
        categories.add(gameData.categoryId);
        updates.categoriesPlayed = Array.from(categories);
      }
    }
    
    if (gameData.platform) {
      const platforms = new Set(stats.platformsPlayed || []);
      if (!platforms.has(gameData.platform)) {
        platforms.add(gameData.platform);
        updates.platformsPlayed = Array.from(platforms);
      }
    }
    
    // Update play streak
    let lastPlayDate = null;
    if (stats.lastPlayDate) {
      if (stats.lastPlayDate.toDate) {
        lastPlayDate = stats.lastPlayDate.toDate();
      } else if (stats.lastPlayDate instanceof Date) {
        lastPlayDate = stats.lastPlayDate;
      } else if (typeof stats.lastPlayDate === 'string') {
        lastPlayDate = new Date(stats.lastPlayDate);
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!lastPlayDate) {
      updates.playStreak = 1;
      updates.lastPlayDate = admin.firestore.Timestamp.now();
    } else {
      const lastPlay = new Date(lastPlayDate);
      lastPlay.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - lastPlay) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, no change
      } else if (daysDiff === 1) {
        // Consecutive day
        updates.playStreak = admin.firestore.FieldValue.increment(1);
        updates.lastPlayDate = admin.firestore.Timestamp.now();
      } else {
        // Streak broken
        updates.playStreak = 1;
        updates.lastPlayDate = admin.firestore.Timestamp.now();
      }
    }
    
    await updateUserStats(userId, updates);
    
    // Add XP
    const xpResult = await addXP(userId, XP_VALUES.PLAY_GAME, "play_game", {
      gameId,
    });
    
    // Check achievements
    await checkAchievements(userId);
    
    return xpResult;
  } catch (error) {
    console.error("Error tracking game play:", error);
    throw error;
  }
};

/**
 * Track rating
 */
export const trackRating = async (userId, gameId) => {
  try {
    const stats = await getUserStats(userId);
    
    await updateUserStats(userId, {
      ratingsCount: admin.firestore.FieldValue.increment(1),
    });
    
    const xpResult = await addXP(userId, XP_VALUES.RATE_GAME, "rate_game", {
      gameId,
    });
    
    // Check achievements
    await checkAchievements(userId);
    
    return xpResult;
  } catch (error) {
    console.error("Error tracking rating:", error);
    throw error;
  }
};

/**
 * Track comment
 */
export const trackComment = async (userId, gameId) => {
  try {
    const stats = await getUserStats(userId);
    
    await updateUserStats(userId, {
      commentsCount: admin.firestore.FieldValue.increment(1),
    });
    
    const xpResult = await addXP(userId, XP_VALUES.COMMENT, "comment", {
      gameId,
    });
    
    // Check achievements
    await checkAchievements(userId);
    
    return xpResult;
  } catch (error) {
    console.error("Error tracking comment:", error);
    throw error;
  }
};

/**
 * Track favorite
 */
export const trackFavorite = async (userId, gameId) => {
  try {
    const stats = await getUserStats(userId);
    
    await updateUserStats(userId, {
      favoritesCount: admin.firestore.FieldValue.increment(1),
    });
    
    // Check achievements
    await checkAchievements(userId);
    
    return { success: true };
  } catch (error) {
    console.error("Error tracking favorite:", error);
    throw error;
  }
};

/**
 * Track daily login
 */
export const trackDailyLogin = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Handle both Firestore Timestamp and Date objects
    let lastLoginDate = null;
    if (stats.lastLoginDate) {
      if (stats.lastLoginDate.toDate) {
        lastLoginDate = stats.lastLoginDate.toDate();
      } else if (stats.lastLoginDate instanceof Date) {
        lastLoginDate = stats.lastLoginDate;
      } else if (typeof stats.lastLoginDate === 'string') {
        lastLoginDate = new Date(stats.lastLoginDate);
      }
    }
    
    const updates = {};
    
    if (!lastLoginDate) {
      // First login
      updates.loginStreak = 1;
      updates.lastLoginDate = admin.firestore.Timestamp.now();
    } else {
      const lastLogin = new Date(lastLoginDate);
      lastLogin.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Already logged in today, no XP
        return { alreadyLoggedIn: true };
      } else if (daysDiff === 1) {
        // Consecutive day
        updates.loginStreak = admin.firestore.FieldValue.increment(1);
        updates.lastLoginDate = admin.firestore.Timestamp.now();
      } else {
        // Streak broken
        updates.loginStreak = 1;
        updates.lastLoginDate = admin.firestore.Timestamp.now();
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await updateUserStats(userId, updates);
      
      // Check login streak achievements
      await checkLoginStreakAchievements(userId);
      
      // Login streak is tracked but no XP is awarded
      return { 
        success: true,
        loginStreak: updates.loginStreak || stats.loginStreak || 0
      };
    }
    
    return { alreadyLoggedIn: true };
  } catch (error) {
    console.error("Error tracking daily login:", error);
    throw error;
  }
};

/**
 * Check if user has earned an achievement
 */
export const checkAchievements = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const earnedAchievements = [];
    
    // Get already earned achievements
    const earnedQuery = await userAchievementsCollection
      .where("userId", "==", userId)
      .get();
    
    const earnedIds = new Set();
    earnedQuery.forEach((doc) => {
      earnedIds.add(doc.data().achievementId);
    });
    
    // Check each achievement
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (earnedIds.has(achievement.id)) continue;
      
      let earned = false;
      
      switch (achievement.condition.type) {
        case "games_played":
          earned = stats.gamesPlayed >= achievement.condition.count;
          break;
        case "unique_games_played":
          earned = (Array.isArray(stats.uniqueGamesPlayed) ? stats.uniqueGamesPlayed.length : 0) >= achievement.condition.count;
          break;
        case "total_play_time":
          earned = (stats.totalPlayTime || 0) >= achievement.condition.hours * 60;
          break;
        case "comments_count":
          earned = stats.commentsCount >= achievement.condition.count;
          break;
        case "ratings_count":
          earned = stats.ratingsCount >= achievement.condition.count;
          break;
        case "favorites_count":
          earned = stats.favoritesCount >= achievement.condition.count;
          break;
        case "early_plays":
          earned = stats.earlyPlays >= achievement.condition.count;
          break;
        case "night_plays":
          earned = stats.nightPlays >= achievement.condition.count;
          break;
        case "category_completion":
          earned = (Array.isArray(stats.categoriesPlayed) ? stats.categoriesPlayed.length : 0) >= achievement.condition.count;
          break;
        case "all_platforms":
          earned = (Array.isArray(stats.platformsPlayed) ? stats.platformsPlayed.length : 0) >= achievement.condition.count;
          break;
      }
      
      if (earned) {
        // Award achievement
        await userAchievementsCollection.add({
          userId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          achievementDescription: achievement.description,
          rarity: achievement.rarity,
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        earnedAchievements.push(achievement);
      }
    }
    
    return earnedAchievements;
  } catch (error) {
    console.error("Error checking achievements:", error);
    throw error;
  }
};

/**
 * Check login streak achievements
 */
export const checkLoginStreakAchievements = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const streak = stats.loginStreak || 0;
    
    // Define streak achievements
    const streakAchievements = [
      { days: 3, id: "getting_started", name: "Getting Started", rarity: "common" },
      { days: 7, id: "week_warrior", name: "Week Warrior", rarity: "rare" },
      { days: 30, id: "monthly_master", name: "Monthly Master", rarity: "epic" },
      { days: 100, id: "centurion", name: "Centurion", rarity: "legendary" },
    ];
    
    // Get already earned achievements
    let earnedIds = new Set();
    try {
      const achievementIds = streakAchievements.map((a) => a.id);
      
      if (achievementIds.length <= 10) {
        const earnedQuery = await userAchievementsCollection
          .where("userId", "==", userId)
          .where("achievementId", "in", achievementIds)
          .get();
        
        earnedQuery.forEach((doc) => {
          earnedIds.add(doc.data().achievementId);
        });
      } else {
        // If more than 10, check individually
        for (const achievementId of achievementIds) {
          const query = await userAchievementsCollection
            .where("userId", "==", userId)
            .where("achievementId", "==", achievementId)
            .limit(1)
            .get();
          
          if (!query.empty) {
            earnedIds.add(achievementId);
          }
        }
      }
    } catch (error) {
      console.error("Error checking streak achievements:", error);
    }
    
    for (const achievement of streakAchievements) {
      if (streak >= achievement.days && !earnedIds.has(achievement.id)) {
        await userAchievementsCollection.add({
          userId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          achievementDescription: `${achievement.days} day login streak`,
          rarity: achievement.rarity,
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error("Error checking login streak achievements:", error);
    throw error;
  }
};

/**
 * Get user achievements
 */
export const getUserAchievements = async (userId) => {
  try {
    // Try with orderBy first, fallback to without if index doesn't exist
    let achievementsQuery;
    try {
      achievementsQuery = await userAchievementsCollection
        .where("userId", "==", userId)
        .orderBy("earnedAt", "desc")
        .get();
    } catch (orderByError) {
      // If orderBy fails (index missing), get without ordering and sort in memory
      console.warn("OrderBy index missing, fetching without orderBy:", orderByError.message);
      achievementsQuery = await userAchievementsCollection
        .where("userId", "==", userId)
        .get();
    }
    
    const achievements = [];
    achievementsQuery.forEach((doc) => {
      const data = doc.data();
      achievements.push({ 
        id: doc.id, 
        ...data,
        earnedAt: data.earnedAt?.toDate ? data.earnedAt.toDate().toISOString() : data.earnedAt
      });
    });
    
    // Sort by earnedAt if we didn't use orderBy
    if (achievements.length > 0 && achievements[0].earnedAt) {
      achievements.sort((a, b) => {
        const dateA = new Date(a.earnedAt);
        const dateB = new Date(b.earnedAt);
        return dateB - dateA; // Descending
      });
    }
    
    return achievements;
  } catch (error) {
    console.error("Error getting user achievements:", error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (limit = 50) => {
  try {
    const statsQuery = await userStatsCollection
      .orderBy("totalXP", "desc")
      .limit(limit)
      .get();
    
    const leaderboard = [];
    const userIds = [];
    
    // Collect all user IDs
    statsQuery.forEach((doc) => {
      userIds.push(doc.id);
    });
    
    // Fetch user profiles in parallel
    const userProfilePromises = userIds.map(async (userId) => {
      try {
        const userDoc = await usersCollection.doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          // Prioritize gamerTag, then displayName, then email
          const name = userData.gamerTag || userData.displayName || userData.email?.split("@")[0] || "Anonymous";
          return {
            userId,
            displayName: name,
            photoURL: userData.photoURL || null,
          };
        }
        // Fallback: try to get from Firebase Auth
        try {
          const userRecord = await admin.auth().getUser(userId);
          return {
            userId,
            displayName: userRecord.displayName || userRecord.email?.split("@")[0] || "Anonymous",
            photoURL: userRecord.photoURL || null,
          };
        } catch (authError) {
          return {
            userId,
            displayName: "Anonymous",
            photoURL: null,
          };
        }
      } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        return {
          userId,
          displayName: "Anonymous",
          photoURL: null,
        };
      }
    });
    
    const userProfiles = await Promise.all(userProfilePromises);
    const profileMap = new Map(userProfiles.map(profile => [profile.userId, profile]));
    
    // Combine stats with user profiles
    statsQuery.forEach((doc) => {
      const data = doc.data();
      const profile = profileMap.get(doc.id) || {
        displayName: "Anonymous",
        photoURL: null,
      };
      
      leaderboard.push({
        userId: doc.id,
        totalXP: data.totalXP || 0,
        level: data.level || 1,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      });
    });
    
    return leaderboard;
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    throw error;
  }
};

