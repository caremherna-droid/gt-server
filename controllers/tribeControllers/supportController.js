import { db } from "../../config/firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";

const supportCollection = db.collection("support");

export const createTicket = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Create the ticket with default status
    const ticketData = {
      name,
      email,
      subject,
      message,
      status: "pending", // Default status
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ticketRef = await supportCollection.add(ticketData);

    res.status(201).json({
      success: true,
      ticketId: ticketRef.id,
      message: "Support ticket created successfully",
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create support ticket",
      details: error.message,
    });
  }
};

export const getTickets = async (req, res) => {
  try {
    console.log("Support ticket request:", {
      method: req.method,
      body: req.body,
      collection: supportCollection.path, // Log the collection path
    });

    const { status } = req.query;
    console.log("Fetching tickets with status:", status);

    let querySnapshot;

    if (!status || status === "all") {
      querySnapshot = await supportCollection
        .orderBy("createdAt", "desc")
        .get();
    } else {
      querySnapshot = await supportCollection
        .where("status", "==", status)
        .orderBy("createdAt", "desc")
        .get();
    }

    const tickets = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tickets.push({
        id: doc.id,
        ...data,
      });
    });

    console.log("Found tickets:", tickets.length);
    console.log("Tickets data:", tickets); // Log the actual data

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tickets",
      details: error.message,
    });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    await supportCollection.doc(id).update({
      status: status,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update ticket status",
      details: error.message,
    });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    await supportCollection.doc(id).delete();

    res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete ticket",
      details: error.message,
    });
  }
};

export const createSuspensionAppeal = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, email, and message are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Create the suspension appeal ticket
    const appealData = {
      name,
      email,
      subject: "Account Suspension Appeal",
      message,
      type: "suspension-appeal",
      status: "pending",
      priority: "high", // Appeals get high priority
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appealRef = await supportCollection.add(appealData);

    console.log(`Suspension appeal created: ${appealRef.id} from ${email}`);

    res.status(201).json({
      success: true,
      appealId: appealRef.id,
      message: "Suspension appeal submitted successfully. We will review your request within 48 hours.",
    });
  } catch (error) {
    console.error("Error creating suspension appeal:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit suspension appeal",
      details: error.message,
    });
  }
};