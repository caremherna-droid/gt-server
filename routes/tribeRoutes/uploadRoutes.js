import express from "express";
import {
  uploadImage,
  uploadGameFile,
  uploadHtmlFile,
  deleteImage,
  refreshImageUrl,
} from "../../controllers/tribeControllers/uploadController.js";
import { imageUpload, gameFileUpload, htmlFileUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.post("/image", imageUpload.single("image"), uploadImage);
router.post("/game", gameFileUpload.single("game"), uploadGameFile);
router.post("/html", htmlFileUpload.single("htmlFile"), uploadHtmlFile);
router.delete("/", deleteImage);
router.get("/refresh-url", refreshImageUrl);

export default router;
