import express from "express";
import {
  addGame,
  getAllGames,
  getGameById,
  updateGame,
  deleteGame,
  getFeaturedGames,
  getPremiumGames,
  getExclusiveGames,
  getTournamentGames,
  toggleFeatured,
  togglePremium,
  toggleExclusive,
  toggleTournament,
  bulkUpdateGameCategories,
  getGamesByCategories,
} from "../../controllers/tribeControllers/gameControllers.js";
import {
  imageUpload,
  gameFileUpload,
  handleMulterError,
} from "../../config/multerConfig.js";

const router = express.Router();

// Use error handler
router.use(handleMulterError);

// Special category routes (must come before /:id routes)
router.get("/categories/featured", getFeaturedGames);
router.get("/categories/premium", getPremiumGames);
router.get("/categories/exclusive", getExclusiveGames);
router.get("/categories/tournament", getTournamentGames);
router.get("/categories/filter", getGamesByCategories);

// Bulk operations
router.patch("/bulk/categories", bulkUpdateGameCategories);

// Basic CRUD routes
router.post(
  "/",
  imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "gameFile", maxCount: 1 },
  ]),
  addGame
);
router.get("/", getAllGames);
router.get("/:id", getGameById);
router.put(
  "/:id",
  imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "gameFile", maxCount: 1 },
  ]),
  updateGame
);
router.delete("/:id", deleteGame);

// Toggle status routes
router.patch("/:id/toggle-featured", toggleFeatured);
router.patch("/:id/toggle-premium", togglePremium);
router.patch("/:id/toggle-exclusive", toggleExclusive);
router.patch("/:id/toggle-tournament", toggleTournament);

export default router;
