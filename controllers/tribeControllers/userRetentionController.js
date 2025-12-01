import { db } from "../../config/firebase.js";
import admin from "firebase-admin";

const usersCollection = db.collection("users");
const userVisitsCollection = db.collection("userVisits");
const userSessionsCollection = db.collection("userSessions");
const gameSessionsCollection = db.collection("gameSessions");

/**
 * Helper: Convert Firestore Timestamp or Date to JavaScript Date
 */
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

/**
 * Track a user visit
 */
export const trackUserVisit = async (req, res) => {
  try {
    const { userId, userEmail, referrer, userAgent, pageUrl } = req.body;

    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: "Either userId or userEmail is required",
      });
    }

    const now = admin.firestore.Timestamp.now();
    const today = admin.firestore.Timestamp.fromDate(
      new Date(new Date().setHours(0, 0, 0, 0))
    );

    const visitData = {
      userId: userId || null,
      userEmail: userEmail || "anonymous",
      timestamp: now,
      date: today,
      referrer: referrer || null,
      userAgent: userAgent || null,
      pageUrl: pageUrl || null,
      dayOfWeek: new Date().getDay(),
      hour: new Date().getHours(),
      createdAt: now,
    };

    await userVisitsCollection.add(visitData);

    if (userId) {
      const userRef = usersCollection.doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const lastVisit = toDate(userData.lastVisit);
        const nowDate = new Date();

        let daysSinceLastVisit = 0;
        if (lastVisit) {
          daysSinceLastVisit = Math.floor(
            (nowDate - lastVisit) / (1000 * 60 * 60 * 24)
          );
        }

        const updateData = {
          lastVisit: now,
          totalVisits: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        };

        if (!userData.firstVisit) {
          updateData.firstVisit = now;
        }

        if (daysSinceLastVisit > 0) {
          updateData.lastReturnDate = now;
          updateData.daysSinceLastVisit = daysSinceLastVisit;
        }

        await userRef.update(updateData);
      } else {
        await userRef.set({
          userId,
          email: userEmail,
          firstVisit: now,
          lastVisit: now,
          totalVisits: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "User visit tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking user visit:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track user visit",
      message: error.message,
    });
  }
};

/**
 * Start a user session
 */
export const startUserSession = async (req, res) => {
  try {
    const { userId, userEmail, deviceType, browser, os } = req.body;

    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: "Either userId or userEmail is required",
      });
    }

    const sessionData = {
      userId: userId || null,
      userEmail: userEmail || "anonymous",
      startTime: admin.firestore.Timestamp.now(),
      endTime: null,
      duration: 0,
      pagesViewed: [],
      gamesPlayed: [],
      deviceType: deviceType || "unknown",
      browser: browser || "unknown",
      os: os || "unknown",
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await userSessionsCollection.add(sessionData);

    res.status(201).json({
      success: true,
      sessionId: docRef.id,
      message: "User session started successfully",
    });
  } catch (error) {
    console.error("Error starting user session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start user session",
      message: error.message,
    });
  }
};

/**
 * End a user session
 */
export const endUserSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { pagesViewed, gamesPlayed } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Session ID is required",
      });
    }

    const sessionRef = userSessionsCollection.doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    const sessionData = sessionDoc.data();
    const startTime = toDate(sessionData.startTime);
    const endTime = new Date();
    const duration = startTime
      ? Math.round((endTime - startTime) / 1000)
      : 0;

    await sessionRef.update({
      endTime: admin.firestore.Timestamp.fromDate(endTime),
      duration,
      pagesViewed: pagesViewed || sessionData.pagesViewed || [],
      gamesPlayed: gamesPlayed || sessionData.gamesPlayed || [],
      isActive: false,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    res.json({
      success: true,
      duration,
      message: "User session ended successfully",
    });
  } catch (error) {
    console.error("Error ending user session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to end user session",
      message: error.message,
    });
  }
};

/**
 * Update user session activity
 */
export const updateUserSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { pageUrl, gameId, action } = req.body;

    const sessionRef = userSessionsCollection.doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    const updateData = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (pageUrl && action === "pageView") {
      updateData.pagesViewed = admin.firestore.FieldValue.arrayUnion({
        url: pageUrl,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }

    if (gameId && action === "gamePlay") {
      updateData.gamesPlayed = admin.firestore.FieldValue.arrayUnion({
        gameId,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }

    await sessionRef.update(updateData);

    res.json({
      success: true,
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("Error updating user session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user session",
      message: error.message,
    });
  }
};

/**
 * Get user retention metrics - REWRITTEN
 */
export const getUserRetentionMetrics = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const periodDays = parseInt(period, 10) || 30;

    if (periodDays < 1 || periodDays > 365) {
      return res.status(400).json({
        success: false,
        error: "Period must be between 1 and 365 days",
      });
    }

    const now = new Date();
    const queryStartDate = new Date(now);
    queryStartDate.setDate(queryStartDate.getDate() - periodDays);
    queryStartDate.setHours(0, 0, 0, 0);

    const queryEndDate = new Date(now);
    queryEndDate.setHours(23, 59, 59, 999);

    // Get all visits in the period
    let visitsSnapshot;
    try {
      visitsSnapshot = await userVisitsCollection
        .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(queryStartDate))
        .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(queryEndDate))
        .get();
    } catch (error) {
      console.error("Error fetching visits:", error);
      // If query fails, try without date filter
      visitsSnapshot = await userVisitsCollection
        .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(queryStartDate))
        .get();
    }

    // Process visits
    const usersByDay = new Map();
    const userFirstSeen = new Map();
    const userLastSeen = new Map();
    const userVisitCounts = new Map();

    visitsSnapshot.forEach((doc) => {
      const visit = doc.data();
      const userId = visit.userId || visit.userEmail;

      if (!userId || userId === "anonymous") return;

      const visitDate = toDate(visit.timestamp);
      if (!visitDate) return;

      const dateKey = visitDate.toISOString().split("T")[0];

      // Track by day
      if (!usersByDay.has(dateKey)) {
        usersByDay.set(dateKey, new Set());
      }
      usersByDay.get(dateKey).add(userId);

      // Track first and last seen
      if (!userFirstSeen.has(userId) || visitDate < userFirstSeen.get(userId)) {
        userFirstSeen.set(userId, visitDate);
      }
      if (!userLastSeen.has(userId) || visitDate > userLastSeen.get(userId)) {
        userLastSeen.set(userId, visitDate);
      }

      // Count visits per user
      userVisitCounts.set(userId, (userVisitCounts.get(userId) || 0) + 1);
    });

    // Calculate daily active users
    const dailyActiveUsers = Array.from(usersByDay.entries())
      .map(([date, users]) => ({
        date,
        activeUsers: users.size,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate returning users (users who visited more than once)
    const returningUsers = Array.from(userFirstSeen.entries()).filter(
      ([userId, firstVisit]) => {
        const lastVisit = userLastSeen.get(userId);
        if (!lastVisit) return false;
        const daysBetween = Math.floor(
          (lastVisit - firstVisit) / (1000 * 60 * 60 * 24)
        );
        return daysBetween > 0 || userVisitCounts.get(userId) > 1;
      }
    ).length;

    const newUsers = Math.max(0, userFirstSeen.size - returningUsers);
    const totalUsers = userFirstSeen.size;

    // Calculate retention rate
    const retentionRate =
      totalUsers > 0 ? Math.round((returningUsers / totalUsers) * 100) : 0;

    // Get session data
    let sessionsSnapshot;
    try {
      sessionsSnapshot = await userSessionsCollection
        .where("startTime", ">=", admin.firestore.Timestamp.fromDate(queryStartDate))
        .where("startTime", "<=", admin.firestore.Timestamp.fromDate(queryEndDate))
        .where("isActive", "==", false)
        .get();
    } catch (error) {
      console.error("Error fetching sessions:", error);
      sessionsSnapshot = { forEach: () => {}, size: 0 };
    }

    let totalDuration = 0;
    let sessionCount = 0;
    sessionsSnapshot.forEach((doc) => {
      const session = doc.data();
      const duration = session.duration || 0;
      if (duration > 0) {
        totalDuration += duration;
        sessionCount++;
      }
    });

    const avgSessionDuration =
      sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;

    // Calculate additional metrics
    const avgVisitsPerUser =
      totalUsers > 0
        ? (visitsSnapshot.size / totalUsers).toFixed(2)
        : "0.00";

    // Build response
    const response = {
      success: true,
      data: {
        period: `${periodDays} days`,
        dateRange: {
          start: queryStartDate.toISOString(),
          end: queryEndDate.toISOString(),
        },
        totalUsers,
        newUsers,
        returningUsers,
        retentionRate,
        dailyActiveUsers,
        avgSessionDuration: avgSessionDuration, // in seconds
        totalSessions: sessionCount,
        totalVisits: visitsSnapshot.size,
        avgVisitsPerUser: parseFloat(avgVisitsPerUser),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting user retention metrics:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to get retention metrics",
      message: error.message,
    });
  }
};

/**
 * Get user activity overview
 */
export const getUserActivityOverview = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 30 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const userDoc = await usersCollection.doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const visitsSnapshot = await userVisitsCollection
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(parseInt(limit, 10))
      .get();

    const visits = [];
    visitsSnapshot.forEach((doc) => {
      const data = doc.data();
      visits.push({
        id: doc.id,
        ...data,
        timestamp: toDate(data.timestamp)?.toISOString() || null,
      });
    });

    const sessionsSnapshot = await userSessionsCollection
      .where("userId", "==", userId)
      .orderBy("startTime", "desc")
      .limit(10)
      .get();

    const sessions = [];
    let totalSessionDuration = 0;
    sessionsSnapshot.forEach((doc) => {
      const session = doc.data();
      const duration = session.duration || 0;
      totalSessionDuration += duration;
      sessions.push({
        id: doc.id,
        ...session,
        startTime: toDate(session.startTime)?.toISOString() || null,
        endTime: toDate(session.endTime)?.toISOString() || null,
        duration,
      });
    });

    const avgSessionDuration =
      sessions.length > 0
        ? Math.round(totalSessionDuration / sessions.length)
        : 0;

    res.json({
      success: true,
      data: {
        userId,
        profile: {
          firstVisit: toDate(userData.firstVisit)?.toISOString() || null,
          lastVisit: toDate(userData.lastVisit)?.toISOString() || null,
          totalVisits: userData.totalVisits || 0,
          daysSinceLastVisit: userData.daysSinceLastVisit || 0,
        },
        recentVisits: visits,
        recentSessions: sessions,
        metrics: {
          totalSessions: sessions.length,
          avgSessionDuration,
        },
      },
    });
  } catch (error) {
    console.error("Error getting user activity overview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user activity overview",
      message: error.message,
    });
  }
};

/**
 * Get cohort analysis - REWRITTEN
 */
export const getCohortAnalysis = async (req, res) => {
  try {
    const { weeks = 8 } = req.query;
    const weeksNum = parseInt(weeks, 10) || 8;

    if (weeksNum < 1 || weeksNum > 52) {
      return res.status(400).json({
        success: false,
        error: "Weeks must be between 1 and 52",
      });
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - weeksNum * 7);
    startDate.setHours(0, 0, 0, 0);

    const visitsSnapshot = await userVisitsCollection
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .get();

    const userFirstVisit = new Map();
    const userVisitsByWeek = new Map();

    visitsSnapshot.forEach((doc) => {
      const visit = doc.data();
      const userId = visit.userId || visit.userEmail;
      if (!userId || userId === "anonymous") return;

      const visitDate = toDate(visit.timestamp);
      if (!visitDate) return;

      const weekKey = getWeekKey(visitDate);

      if (!userFirstVisit.has(userId)) {
        userFirstVisit.set(userId, weekKey);
      }

      if (!userVisitsByWeek.has(userId)) {
        userVisitsByWeek.set(userId, new Set());
      }
      userVisitsByWeek.get(userId).add(weekKey);
    });

    const cohorts = buildCohortMatrix(
      userFirstVisit,
      userVisitsByWeek,
      startDate,
      weeksNum
    );

    res.json({
      success: true,
      data: {
        weeks: weeksNum,
        startDate: startDate.toISOString(),
        cohorts,
      },
    });
  } catch (error) {
    console.error("Error getting cohort analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get cohort analysis",
      message: error.message,
    });
  }
};

/**
 * Get game-specific user retention
 */
export const getGameUserRetention = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { period = "30" } = req.query;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }

    const periodDays = parseInt(period, 10) || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - periodDays);

    const sessionsSnapshot = await gameSessionsCollection
      .where("gameId", "==", gameId)
      .where("startTime", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .get();

    const userFirstPlay = new Map();
    const userLastPlay = new Map();
    const userPlayCount = new Map();
    const playsByDay = new Map();

    sessionsSnapshot.forEach((doc) => {
      const session = doc.data();
      const userId = session.userEmail || session.userId;
      if (!userId || userId === "anonymous") return;

      const playDate = toDate(session.startTime);
      if (!playDate) return;

      const dateKey = playDate.toISOString().split("T")[0];

      if (!userFirstPlay.has(userId)) {
        userFirstPlay.set(userId, playDate);
      }
      userLastPlay.set(userId, playDate);

      userPlayCount.set(userId, (userPlayCount.get(userId) || 0) + 1);

      if (!playsByDay.has(dateKey)) {
        playsByDay.set(dateKey, new Set());
      }
      playsByDay.get(dateKey).add(userId);
    });

    const returningPlayers = Array.from(userFirstPlay.entries()).filter(
      ([userId, firstPlay]) => {
        const lastPlay = userLastPlay.get(userId);
        if (!lastPlay) return false;
        const daysBetween = Math.floor(
          (lastPlay - firstPlay) / (1000 * 60 * 60 * 24)
        );
        return daysBetween > 0 || userPlayCount.get(userId) > 1;
      }
    ).length;

    const dailyActivePlayers = Array.from(playsByDay.entries())
      .map(([date, users]) => ({
        date,
        players: users.size,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalPlays = Array.from(userPlayCount.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const avgPlaysPerUser =
      userFirstPlay.size > 0
        ? (totalPlays / userFirstPlay.size).toFixed(2)
        : "0.00";

    res.json({
      success: true,
      data: {
        gameId,
        period: `${periodDays} days`,
        totalPlayers: userFirstPlay.size,
        returningPlayers,
        retentionRate:
          userFirstPlay.size > 0
            ? Math.round((returningPlayers / userFirstPlay.size) * 100)
            : 0,
        totalPlays,
        avgPlaysPerUser: parseFloat(avgPlaysPerUser),
        dailyActivePlayers,
      },
    });
  } catch (error) {
    console.error("Error getting game user retention:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get game user retention",
      message: error.message,
    });
  }
};

// Helper functions

/**
 * Get week key from date (YYYY-WW format)
 */
function getWeekKey(date) {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const daysSinceFirstDay = Math.floor(
    (date - firstDayOfYear) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.ceil(
    (daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7
  );
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

/**
 * Build cohort retention matrix
 */
function buildCohortMatrix(userFirstVisit, userVisitsByWeek, startDate, weeks) {
  const cohorts = [];

  for (let i = 0; i < weeks; i++) {
    const cohortStart = new Date(startDate);
    cohortStart.setDate(cohortStart.getDate() + i * 7);
    const cohortWeek = getWeekKey(cohortStart);

    const cohortUsers = Array.from(userFirstVisit.entries())
      .filter(([_, firstWeek]) => firstWeek === cohortWeek)
      .map(([userId, _]) => userId);

    if (cohortUsers.length === 0) continue;

    const cohortSize = cohortUsers.length;
    const retention = [];

    for (let week = 0; week < weeks - i; week++) {
      const targetStart = new Date(cohortStart);
      targetStart.setDate(targetStart.getDate() + week * 7);
      const targetWeek = getWeekKey(targetStart);

      const activeUsers = cohortUsers.filter((userId) => {
        const visitWeeks = userVisitsByWeek.get(userId);
        return visitWeeks && visitWeeks.has(targetWeek);
      }).length;

      retention.push({
        week,
        weekKey: targetWeek,
        activeUsers,
        percentage: Math.round((activeUsers / cohortSize) * 100),
      });
    }

    cohorts.push({
      cohortWeek,
      cohortDate: cohortStart.toISOString().split("T")[0],
      cohortSize,
      retention,
    });
  }

  return cohorts;
}
