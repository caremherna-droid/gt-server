import express from "express";
import {
  addPlatform,
  getAllPlatforms,
  getPlatformById,
  updatePlatform,
  deletePlatform,
} from "../../controllers/tribeControllers/platformController.js";
import { imageUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.post("/", imageUpload.single('icon'), addPlatform);
router.get("/", getAllPlatforms);
router.get("/:id", getPlatformById);
router.put("/:id", imageUpload.single('icon'), updatePlatform);
router.delete("/:id", deletePlatform);

export default router;
