import express from "express";
import {
  startDownload,
  recordDownload,
  getDownloadHistory,
  deleteDownloadRecord,
} from "../../controllers/tribeControllers/downloadController.js";
import { db } from "../../config/firebase.js";

const router = express.Router();

router.post("/start/:gameId", startDownload);
router.post("/record", recordDownload);
router.get("/history/:userId", getDownloadHistory);
router.delete("/record/:recordId", deleteDownloadRecord);

export default router;
