import express from "express";
import {
  getAllSubmissions,
  getSubmissionsByContest,
  getSubmissionById,
  createSubmission,
  updateSubmissionStatus,
  deleteSubmission
} from "../../controllers/contestControllers/submissionsController.js";
import { artworkUpload, handleMulterError } from "../../config/multerConfig.js";

const router = express.Router();

router.use(handleMulterError);

router.get("/", getAllSubmissions);
router.get("/contest/:contestId", getSubmissionsByContest);
router.get("/:id", getSubmissionById);
router.post("/", artworkUpload.single('artwork'), createSubmission);
router.put("/:id/status", updateSubmissionStatus);
router.delete("/:id", deleteSubmission);

export default router;
