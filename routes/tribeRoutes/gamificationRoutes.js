import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import {
  getUserGamificationStats,
  trackGamePlayAction,
  trackRatingAction,
  trackCommentAction,
  trackFavoriteAction,
  trackLoginAction,
  getUserAchievementsAction,
  getLeaderboardAction,
  getUserPrivilegesAction,
} from "../../controllers/tribeControllers/gamificationController.js";

const router = express.Router();

// Get user gamification stats (requires auth)
router.get("/stats", verifyToken, getUserGamificationStats);

// Get user gamification stats by userId (public, for viewing other users)
router.get("/stats/:userId", getUserGamificationStats);

// Track actions (requires auth)
router.post("/track/game-play", verifyToken, trackGamePlayAction);
router.post("/track/rating", verifyToken, trackRatingAction);
router.post("/track/comment", verifyToken, trackCommentAction);
router.post("/track/favorite", verifyToken, trackFavoriteAction);
router.post("/track/login", verifyToken, trackLoginAction);

// Achievements (public for viewing, auth for own)
router.get("/achievements", verifyToken, getUserAchievementsAction);
router.get("/achievements/:userId", getUserAchievementsAction);

// Leaderboard (public)
router.get("/leaderboard", getLeaderboardAction);

// Privileges (auth for own, public for viewing others)
router.get("/privileges", verifyToken, getUserPrivilegesAction);
router.get("/privileges/:userId", getUserPrivilegesAction);

export default router;

