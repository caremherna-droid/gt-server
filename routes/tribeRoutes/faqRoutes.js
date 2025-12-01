import express from "express";
const router = express.Router();

import {
  addFaq,
  getAllFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  addFaqCategory,
  getAllFaqCategories,
  updateFaqCategory,
  deleteFaqCategory,
} from "../../controllers/tribeControllers/faqController.js";

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// FAQ Categories routes
router.post("/categories", addFaqCategory);
router.get("/categories", getAllFaqCategories);
router.put("/categories/:id", updateFaqCategory);
router.delete("/categories/:id", deleteFaqCategory);

// FAQ routes
router.post("/", addFaq);
router.get("/", getAllFaqs);
router.get("/:id", getFaqById);
router.put("/:id", updateFaq);
router.delete("/:id", deleteFaq);

export default router;
