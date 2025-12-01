import {
  getUserStats,
  addXP,
  trackGamePlay,
  trackRating,
  trackComment,
  trackFavorite,
  trackDailyLogin,
  getUserAchievements,
  getLeaderboard,
  getLevelFromXP,
  getXPForLevel,
  getLevelTier,
} from "../../services/gamificationService.js";
import { getUserPrivileges } from "../../services/privilegesService.js";
import { db } from "../../config/firebase.js";

/**
 * Get user gamification stats
 */
export const getUserGamificationStats = async (req, res) => {
  try {
    const userId = req.user?.uid || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }
    
    // Get stats and achievements (with error handling)
    let stats, achievements;
    
    try {
      stats = await getUserStats(userId);
    } catch (error) {
      console.error("Error getting user stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get user stats",
        message: error.message,
      });
    }
    
    try {
      achievements = await getUserAchievements(userId);
    } catch (error) {
      console.error("Error getting achievements:", error);
      achievements = []; // Default to empty array
    }
    
    // Calculate XP progress for current level
    const currentLevelXP = getXPForLevel(stats.level || 1);
    const nextLevelXP = getXPForLevel((stats.level || 1) + 1);
    const xpInCurrentLevel = (stats.totalXP || 0) - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const xpProgress = xpNeededForNextLevel > 0 ? (xpInCurrentLevel / xpNeededForNextLevel) * 100 : 0;
    
    // Get user privileges (only for authenticated users viewing their own stats)
    // Pass cached stats and achievements to avoid re-fetching
    let privileges = null;
    if (req.user?.uid === userId) {
      try {
        privileges = await getUserPrivileges(userId, stats, achievements);
      } catch (error) {
        console.error("Error getting user privileges:", error);
        // Continue without privileges if there's an error
      }
    }
    
    res.json({
      success: true,
      data: {
        stats: {
          ...stats,
          uniqueGamesPlayed: Array.isArray(stats.uniqueGamesPlayed) ? stats.uniqueGamesPlayed : [],
          categoriesPlayed: Array.isArray(stats.categoriesPlayed) ? stats.categoriesPlayed : [],
          platformsPlayed: Array.isArray(stats.platformsPlayed) ? stats.platformsPlayed : [],
          levelTier: getLevelTier(stats.level),
          xpProgress: Math.min(100, Math.max(0, xpProgress)),
          xpInCurrentLevel,
          xpNeededForNextLevel,
          currentLevelXP,
          nextLevelXP,
        },
        achievements,
        privileges, // Include privileges in response
      },
    });
  } catch (error) {
    console.error("Error getting user gamification stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get gamification stats",
      message: error.message,
    });
  }
};

/**
 * Track game play (called from game play endpoint)
 */
export const trackGamePlayAction = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }
    
    // Get game data
    const gameDoc = await db.collection("games").doc(gameId).get();
    const gameData = gameDoc.exists ? gameDoc.data() : {};
    
    const result = await trackGamePlay(userId, gameId, {
      categoryId: gameData.categoryId,
      platform: gameData.platform,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error tracking game play:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track game play",
      message: error.message,
    });
  }
};

/**
 * Track rating (called from rating endpoint)
 */
export const trackRatingAction = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }
    
    const result = await trackRating(userId, gameId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error tracking rating:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track rating",
      message: error.message,
    });
  }
};

/**
 * Track comment (called from comment endpoint)
 */
export const trackCommentAction = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }
    
    const result = await trackComment(userId, gameId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error tracking comment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track comment",
      message: error.message,
    });
  }
};

/**
 * Track favorite (called from favorite endpoint)
 */
export const trackFavoriteAction = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }
    
    const result = await trackFavorite(userId, gameId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error tracking favorite:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track favorite",
      message: error.message,
    });
  }
};

/**
 * Track daily login
 */
export const trackLoginAction = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    
    const result = await trackDailyLogin(userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error tracking daily login:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track daily login",
      message: error.message,
    });
  }
};

/**
 * Get user achievements
 */
export const getUserAchievementsAction = async (req, res) => {
  try {
    const userId = req.user?.uid || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }
    
    const achievements = await getUserAchievements(userId);
    
    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error("Error getting user achievements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get achievements",
      message: error.message,
    });
  }
};

/**
 * Get leaderboard
 */
export const getLeaderboardAction = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await getLeaderboard(limit);
    
    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get leaderboard",
      message: error.message,
    });
  }
};

/**
 * Get user privileges
 */
export const getUserPrivilegesAction = async (req, res) => {
  try {
    const userId = req.user?.uid || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }
    
    const privileges = await getUserPrivileges(userId);
    
    res.json({
      success: true,
      data: privileges,
    });
  } catch (error) {
    console.error("Error getting user privileges:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user privileges",
      message: error.message,
    });
  }
};

