import express from "express";
import {
  startGameSession,
  endGameSession,
  getMostPlayedGames,
  getAnalyticsSummary,
  getGameAnalytics,
  getGamePlayers
} from "../../controllers/tribeControllers/analyticsController.js";

const router = express.Router();

// Start a game session
router.post("/sessions/start", startGameSession);

// End a game session
router.put("/sessions/:sessionId/end", endGameSession);

// Get most played games
router.get("/most-played", getMostPlayedGames);

// Get analytics summary
router.get("/summary", getAnalyticsSummary);

// Get game-specific analytics
router.get("/games/:gameId", getGameAnalytics);

// Get detailed game players (users who played)
router.get("/games/:gameId/players", getGamePlayers);

export default router;
