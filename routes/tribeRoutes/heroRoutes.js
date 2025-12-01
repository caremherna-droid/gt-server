import express from "express";
import {
  addHero,
  getAllHeroes,
  getHeroById,
  updateHero,
  deleteHero,
} from "../../controllers/tribeControllers/heroController.js";
import { imageUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.post("/", imageUpload.single('image'), addHero);
router.get("/", getAllHeroes);
router.get("/:id", getHeroById);
router.put("/:id", imageUpload.single('image'), updateHero);
router.delete("/:id", deleteHero);

export default router;
