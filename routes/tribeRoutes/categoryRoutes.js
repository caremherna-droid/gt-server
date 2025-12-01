import express from "express";
import { imageUpload } from "../../config/multerConfig.js";
import {
  addGameCategory,
  getAllGameCategories,
  updateGameCategory,
  deleteGameCategory,
  addNewsCategory,
  getAllNewsCategories,
  updateNewsCategory,
  deleteNewsCategory,
} from "../../controllers/tribeControllers/categoryController.js";

const router = express.Router();

// Game Categories
router.post("/games", imageUpload.single('icon'), addGameCategory);
router.get("/games", getAllGameCategories);
router.put("/games/:id", imageUpload.single('icon'), updateGameCategory);
router.delete("/games/:id", deleteGameCategory);

// News Categories
router.post("/news", addNewsCategory);
router.get("/news", getAllNewsCategories);
router.put("/news/:id", updateNewsCategory);
router.delete("/news/:id", deleteNewsCategory);

export default router;
