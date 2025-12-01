import express from "express";
import {
  trackUserVisit,
  startUserSession,
  endUserSession,
  updateUserSession,
  getUserRetentionMetrics,
  getUserActivityOverview,
  getCohortAnalysis,
  getGameUserRetention,
} from "../../controllers/tribeControllers/userRetentionController.js";

const router = express.Router();

// Track user visit
router.post("/visits", trackUserVisit);

// User session management
router.post("/sessions/start", startUserSession);
router.put("/sessions/:sessionId/end", endUserSession);
router.patch("/sessions/:sessionId", updateUserSession);

// Retention metrics
router.get("/metrics", getUserRetentionMetrics);
router.get("/cohorts", getCohortAnalysis);

// User activity
router.get("/activity/:userId", getUserActivityOverview);

// Game-specific retention
router.get("/games/:gameId/retention", getGameUserRetention);

export default router;
