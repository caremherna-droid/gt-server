import express from "express";
import {
  getAllContests,
  getFeaturedContests,
  getContestById,
  createContest,
  updateContest,
  deleteContest,
} from "../../controllers/contestControllers/contestsController.js";
import { imageUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.get("/", getAllContests);
router.get("/featured", getFeaturedContests);
router.get("/:id", getContestById);
router.post("/", imageUpload.single('bannerImage'), createContest);
router.put("/:id", imageUpload.single('bannerImage'), updateContest);
router.delete("/:id", deleteContest);

export default router;
