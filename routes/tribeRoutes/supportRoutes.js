import express from "express";
import {
  createTicket,
  getTickets,
  updateTicketStatus,
  deleteTicket,
  createSuspensionAppeal,
} from "../../controllers/tribeControllers/supportController.js";

const router = express.Router();

// Log incoming requests
router.use("/tickets", (req, res, next) => {
  console.log("Support ticket request:", {
    method: req.method,
    body: req.body,
  });
  next();
});

router.post("/tickets", createTicket);
router.get("/tickets", getTickets);
router.patch("/tickets/:id/status", updateTicketStatus);
router.delete("/tickets/:id", deleteTicket);

// Suspension appeal endpoint (no authentication required for suspended users)
router.post("/suspension-appeal", createSuspensionAppeal);

export default router;
