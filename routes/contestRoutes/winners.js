import express from "express";
import {
  getAllWinners,
  getFeaturedWinners,
  getWinnerById,
  createWinner,
  updateWinner,
  deleteWinner,
} from "../../controllers/contestControllers/winnersController.js";
import { imageUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.get("/", getAllWinners);
router.get("/featured", getFeaturedWinners);
router.get("/:id", getWinnerById);
router.post("/", imageUpload.single('image'), createWinner);
router.put("/:id", imageUpload.single('image'), updateWinner);
router.delete("/:id", deleteWinner);

export default router;
