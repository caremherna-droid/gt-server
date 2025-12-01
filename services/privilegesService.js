import { getUserStats, getUserAchievements } from "./gamificationService.js";
import { getLevelTier } from "./gamificationService.js";

/**
 * Privilege definitions based on achievements and levels
 */
export const PRIVILEGES = {
  // Favorites limits
  FAVORITES_LIMIT: {
    default: 50,
    collector: 100, // "Collector" achievement (25 favorites)
    critic: 200, // "Critic" achievement (50 ratings)
  },

  // Comment length limits
  COMMENT_LENGTH: {
    default: 500,
    social_butterfly: 1000, // "Social Butterfly" achievement (20 comments)
    critic: 2000, // "Critic" achievement (50 ratings)
  },

  // Profile bio length limits
  BIO_LENGTH: {
    default: 200,
    social_butterfly: 500, // "Social Butterfly" achievement
    explorer: 1000, // "Explorer" achievement (10 games)
  },

  // Download priority levels
  DOWNLOAD_PRIORITY: {
    default: "normal",
    marathon_gamer: "priority", // "Marathon Gamer" achievement (5 hours playtime)
    critic: "instant", // "Critic" achievement (50 ratings)
  },

  // Profile visibility/featured status
  PROFILE_FEATURED: {
    category_master: true, // "Category Master" achievement
    platform_hopper: true, // "Platform Hopper" achievement
  },

  // Premium/Exclusive game access
  GAME_ACCESS: {
    premium: 50, // Level 50 for premium games
    exclusive: 100, // Level 100 for exclusive games
    all: 150, // Level 150 for all premium + exclusive
  },
};

/**
 * Check if user has a specific achievement
 * Accepts optional cached achievements to avoid re-fetching
 */
export const hasAchievement = async (userId, achievementId, cachedAchievements = null) => {
  try {
    const achievements = cachedAchievements || await getUserAchievements(userId);
    return achievements.some((achievement) => 
      (achievement.achievementId || achievement.id) === achievementId
    );
  } catch (error) {
    console.error(`Error checking achievement ${achievementId} for user ${userId}:`, error);
    return false;
  }
};

/**
 * Get user's favorites limit based on achievements
 * Accepts optional cached achievements to avoid re-fetching
 */
export const getFavoritesLimit = async (userId, cachedAchievements = null) => {
  try {
    // Check for Critic achievement (highest limit)
    if (await hasAchievement(userId, "critic", cachedAchievements)) {
      return PRIVILEGES.FAVORITES_LIMIT.critic;
    }

    // Check for Collector achievement
    if (await hasAchievement(userId, "collector", cachedAchievements)) {
      return PRIVILEGES.FAVORITES_LIMIT.collector;
    }

    // Default limit
    return PRIVILEGES.FAVORITES_LIMIT.default;
  } catch (error) {
    console.error(`Error getting favorites limit for user ${userId}:`, error);
    return PRIVILEGES.FAVORITES_LIMIT.default;
  }
};

/**
 * Get user's comment length limit based on achievements
 * Accepts optional cached achievements to avoid re-fetching
 */
export const getCommentLengthLimit = async (userId, cachedAchievements = null) => {
  try {
    // Check for Critic achievement (highest limit)
    if (await hasAchievement(userId, "critic", cachedAchievements)) {
      return PRIVILEGES.COMMENT_LENGTH.critic;
    }

    // Check for Social Butterfly achievement
    if (await hasAchievement(userId, "social_butterfly", cachedAchievements)) {
      return PRIVILEGES.COMMENT_LENGTH.social_butterfly;
    }

    // Default limit
    return PRIVILEGES.COMMENT_LENGTH.default;
  } catch (error) {
    console.error(`Error getting comment length limit for user ${userId}:`, error);
    return PRIVILEGES.COMMENT_LENGTH.default;
  }
};

/**
 * Get user's bio length limit based on achievements
 * Accepts optional cached achievements to avoid re-fetching
 */
export const getBioLengthLimit = async (userId, cachedAchievements = null) => {
  try {
    // Check for Explorer achievement (highest limit)
    if (await hasAchievement(userId, "explorer", cachedAchievements)) {
      return PRIVILEGES.BIO_LENGTH.explorer;
    }

    // Check for Social Butterfly achievement
    if (await hasAchievement(userId, "social_butterfly", cachedAchievements)) {
      return PRIVILEGES.BIO_LENGTH.social_butterfly;
    }

    // Default limit
    return PRIVILEGES.BIO_LENGTH.default;
  } catch (error) {
    console.error(`Error getting bio length limit for user ${userId}:`, error);
    return PRIVILEGES.BIO_LENGTH.default;
  }
};

/**
 * Get user's download priority based on achievements
 * Accepts optional cached achievements to avoid re-fetching
 */
export const getDownloadPriority = async (userId, cachedAchievements = null) => {
  try {
    // Check for Critic achievement (highest priority - instant)
    if (await hasAchievement(userId, "critic", cachedAchievements)) {
      return PRIVILEGES.DOWNLOAD_PRIORITY.critic;
    }

    // Check for Marathon Gamer achievement (priority)
    if (await hasAchievement(userId, "marathon_gamer", cachedAchievements)) {
      return PRIVILEGES.DOWNLOAD_PRIORITY.marathon_gamer;
    }

    // Default priority
    return PRIVILEGES.DOWNLOAD_PRIORITY.default;
  } catch (error) {
    console.error(`Error getting download priority for user ${userId}:`, error);
    return PRIVILEGES.DOWNLOAD_PRIORITY.default;
  }
};

/**
 * Check if user's profile should be featured based on achievements
 * Accepts optional cached achievements to avoid re-fetching
 */
export const isProfileFeatured = async (userId, cachedAchievements = null) => {
  try {
    // Check for Category Master achievement
    if (await hasAchievement(userId, "category_master", cachedAchievements)) {
      return true;
    }

    // Check for Platform Hopper achievement
    if (await hasAchievement(userId, "platform_hopper", cachedAchievements)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error checking featured status for user ${userId}:`, error);
    return false;
  }
};

/**
 * Check if user can access premium games based on level
 */
export const canAccessPremiumGames = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const level = stats.level || 1;
    return level >= PRIVILEGES.GAME_ACCESS.premium;
  } catch (error) {
    console.error(`Error checking premium access for user ${userId}:`, error);
    return false;
  }
};

/**
 * Check if user can access exclusive games based on level
 */
export const canAccessExclusiveGames = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const level = stats.level || 1;
    return level >= PRIVILEGES.GAME_ACCESS.exclusive;
  } catch (error) {
    console.error(`Error checking exclusive access for user ${userId}:`, error);
    return false;
  }
};

/**
 * Check if user can access all premium + exclusive games based on level
 */
export const canAccessAllPremiumGames = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const level = stats.level || 1;
    return level >= PRIVILEGES.GAME_ACCESS.all;
  } catch (error) {
    console.error(`Error checking all premium access for user ${userId}:`, error);
    return false;
  }
};

/**
 * Get all user privileges (for API response)
 * Accepts optional stats and achievements to avoid re-fetching
 */
export const getUserPrivileges = async (userId, cachedStats = null, cachedAchievements = null) => {
  try {
    // Use cached data if provided, otherwise fetch
    const [stats, achievements] = await Promise.all([
      cachedStats ? Promise.resolve(cachedStats) : getUserStats(userId),
      cachedAchievements ? Promise.resolve(cachedAchievements) : getUserAchievements(userId),
    ]);

    const achievementIds = achievements.map((a) => a.achievementId || a.id);
    const achievementIdSet = new Set(achievementIds);

    // Calculate privileges based on achievements (no additional DB calls)
    const hasCollector = achievementIdSet.has("collector");
    const hasCritic = achievementIdSet.has("critic");
    const hasSocialButterfly = achievementIdSet.has("social_butterfly");
    const hasExplorer = achievementIdSet.has("explorer");
    const hasMarathonGamer = achievementIdSet.has("marathon_gamer");
    const hasCategoryMaster = achievementIdSet.has("category_master");
    const hasPlatformHopper = achievementIdSet.has("platform_hopper");

    // Calculate limits based on achievements
    let favoritesLimit = PRIVILEGES.FAVORITES_LIMIT.default;
    if (hasCritic) {
      favoritesLimit = PRIVILEGES.FAVORITES_LIMIT.critic;
    } else if (hasCollector) {
      favoritesLimit = PRIVILEGES.FAVORITES_LIMIT.collector;
    }

    let commentLengthLimit = PRIVILEGES.COMMENT_LENGTH.default;
    if (hasCritic) {
      commentLengthLimit = PRIVILEGES.COMMENT_LENGTH.critic;
    } else if (hasSocialButterfly) {
      commentLengthLimit = PRIVILEGES.COMMENT_LENGTH.social_butterfly;
    }

    let bioLengthLimit = PRIVILEGES.BIO_LENGTH.default;
    if (hasExplorer) {
      bioLengthLimit = PRIVILEGES.BIO_LENGTH.explorer;
    } else if (hasSocialButterfly) {
      bioLengthLimit = PRIVILEGES.BIO_LENGTH.social_butterfly;
    }

    let downloadPriority = PRIVILEGES.DOWNLOAD_PRIORITY.default;
    if (hasCritic) {
      downloadPriority = PRIVILEGES.DOWNLOAD_PRIORITY.critic;
    } else if (hasMarathonGamer) {
      downloadPriority = PRIVILEGES.DOWNLOAD_PRIORITY.marathon_gamer;
    }

    const isFeatured = hasCategoryMaster || hasPlatformHopper;
    const level = stats.level || 1;
    const canAccessPremium = level >= PRIVILEGES.GAME_ACCESS.premium;
    const canAccessExclusive = level >= PRIVILEGES.GAME_ACCESS.exclusive;
    const canAccessAllPremium = level >= PRIVILEGES.GAME_ACCESS.all;

    return {
      favoritesLimit,
      commentLengthLimit,
      bioLengthLimit,
      downloadPriority,
      isFeatured,
      canAccessPremium,
      canAccessExclusive,
      canAccessAllPremium,
      level,
      levelTier: getLevelTier(level),
      achievements: achievementIds,
    };
  } catch (error) {
    console.error(`Error getting user privileges for user ${userId}:`, error);
    // Return default privileges on error
    return {
      favoritesLimit: PRIVILEGES.FAVORITES_LIMIT.default,
      commentLengthLimit: PRIVILEGES.COMMENT_LENGTH.default,
      bioLengthLimit: PRIVILEGES.BIO_LENGTH.default,
      downloadPriority: PRIVILEGES.DOWNLOAD_PRIORITY.default,
      isFeatured: false,
      canAccessPremium: false,
      canAccessExclusive: false,
      canAccessAllPremium: false,
      level: 1,
      levelTier: "Novice",
      achievements: [],
    };
  }
};

