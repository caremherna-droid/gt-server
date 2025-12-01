import express from "express";
import { imageUpload } from "../../config/multerConfig.js";
import {
  getAllSpecialCategories,
  createSpecialCategory,
  updateSpecialCategory,
  deleteSpecialCategory,
  getSpecialCategoryById,
  getGamesBySpecialCategory,
  toggleGameSpecialCategory
} from "../../controllers/tribeControllers/specialCategoryController.js";

const router = express.Router();

// Get all special categories
router.get("/", getAllSpecialCategories);

// Get special category by ID
router.get("/:id", getSpecialCategoryById);

// Create new special category
router.post("/", imageUpload.single('icon'), createSpecialCategory);

// Update special category
router.put("/:id", imageUpload.single('icon'), updateSpecialCategory);

// Delete special category
router.delete("/:id", deleteSpecialCategory);

// Get games by special category
router.get("/:id/games", getGamesBySpecialCategory);

// Toggle game in special category
router.patch("/:categoryId/games/:gameId", toggleGameSpecialCategory);

export default router;
