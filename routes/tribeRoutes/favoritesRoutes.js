import express from "express";
import {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isFavorite,
  getFavoritesCount,
  bulkRemoveFavorites,
} from "../../controllers/tribeControllers/favoritesController.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// POST /api/favorites - Add game to favorites
router.post("/", addToFavorites);

// GET /api/favorites - Get user's favorite games
router.get("/", getUserFavorites);

// GET /api/favorites/count - Get user's favorites count
router.get("/count", getFavoritesCount);

// GET /api/favorites/check/:gameId - Check if game is in favorites
router.get("/check/:gameId", isFavorite);

// DELETE /api/favorites/:gameId - Remove game from favorites
router.delete("/:gameId", removeFromFavorites);

// POST /api/favorites/bulk-remove - Bulk remove favorites
router.post("/bulk-remove", bulkRemoveFavorites);

export default router;
