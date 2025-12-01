import express from "express";
import {
  addComment,
  getGameComments,
  updateComment,
  deleteComment,
  getUserComments,
} from "../../controllers/tribeControllers/commentController.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Comments API is working",
    timestamp: new Date().toISOString() 
  });
});

// Get comments for a specific game (public)
router.get("/game/:gameId", getGameComments);

// Get comments by a specific user (public)
router.get("/user/:userId", getUserComments);

// Protected routes (require authentication)
router.post("/", verifyToken, addComment);
router.put("/:commentId", verifyToken, updateComment);
router.delete("/:commentId", verifyToken, deleteComment);

export default router; 