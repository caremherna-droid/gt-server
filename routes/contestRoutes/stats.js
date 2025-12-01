import express from "express";
import { getStats } from "../../controllers/contestControllers/statsController.js";

const router = express.Router();
router.get("/", getStats);
export default router;
