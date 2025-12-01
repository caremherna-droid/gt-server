import express from 'express';
import { verifyToken } from '../../middleware/authMiddleware.js';
import {
  submitRating,
  getGameRatings,
  getUserRating,
  updateRating,
  deleteRating,
  getUserRatings,
  getGameRatingStats
} from '../../controllers/tribeControllers/ratingController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/game/:gameId', getGameRatings);
router.get('/game/:gameId/stats', getGameRatingStats);

// Protected routes (authentication required)
router.post('/', verifyToken, submitRating);
router.get('/game/:gameId/user/:userId', verifyToken, getUserRating);
router.put('/:ratingId', verifyToken, updateRating);
router.delete('/:ratingId', verifyToken, deleteRating);
router.get('/user/:userId', verifyToken, getUserRatings);

export default router;
