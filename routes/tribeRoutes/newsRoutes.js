import express from "express";
import {
  addNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
} from "../../controllers/tribeControllers/newsController.js";
import { imageUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.post("/", imageUpload.single('image'), addNews);
router.get("/", getAllNews);
router.get("/:id", getNewsById);
router.put("/:id", imageUpload.single('image'), updateNews);
router.delete("/:id", deleteNews);

export default router;
