import express from "express";
import {
  uploadImage,
  uploadGameFile,
  uploadHtmlFile,
  uploadGameZip,
  uploadGameZipLocal,
  deleteImage,
  refreshImageUrl,
} from "../../controllers/tribeControllers/uploadController.js";
import { imageUpload, gameFileUpload, htmlFileUpload, zipFileUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.post("/image", imageUpload.single("image"), uploadImage);
router.post("/game", gameFileUpload.single("game"), uploadGameFile);
router.post("/game-zip", zipFileUpload.single("zipfile"), uploadGameZip);
router.post("/game-zip-local", zipFileUpload.single("zipfile"), uploadGameZipLocal);
router.post("/html", htmlFileUpload.single("htmlFile"), uploadHtmlFile);

// Debug route to verify upload routes are working
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Upload routes are working",
    routes: ["/image", "/game", "/game-zip", "/game-zip-local", "/html"]
  });
});
router.delete("/", deleteImage);
router.get("/refresh-url", refreshImageUrl);

export default router;
