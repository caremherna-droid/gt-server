import express from "express";
import {
  getAllCategories,
  addCategory,
  deleteCategory
} from "../../controllers/contestControllers/categoriesController.js";

const router = express.Router();

router.get("/", getAllCategories);
router.post("/", addCategory);
router.delete("/:name", deleteCategory);

export default router;
