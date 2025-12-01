import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

export const getAllWinners = async (req, res) => {
  try {
    const snap = await db.collection("winners").get();
    const winners = snap.docs.map((d) => {
      const data = d.data();
      // Map imageUrl to image for frontend compatibility
      return {
        id: d.id,
        ...data,
        // Keep the imageUrl property but also add image for frontend
        image: data.imageUrl || null
      };
    });
    res.json({ success: true, data: winners });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving winners",
        error: err.message,
      });
  }
};

export const getFeaturedWinners = async (req, res) => {
  try {
    const snap = await db
      .collection("winners")
      .where("featured", "==", true)
      .get();
    const winners = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: winners });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving featured winners",
        error: err.message,
      });
  }
};

export const getWinnerById = async (req, res) => {
  try {
    const ref = db.collection("winners").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists)
      return res
        .status(404)
        .json({ success: false, message: "Winner not found" });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving winner",
        error: err.message,
      });
  }
};

export const createWinner = async (req, res) => {
  try {
    let imageUrl = null;
    let public_id = null;

    if (req.file) {
      const filename = `${STORAGE_PATHS.CONTESTS.WINNERS}${uuidv4()}-${req.file.originalname}`;
      
      // Upload to Firebase Storage
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      // Get the download URL
      imageUrl = await storage.getSignedUrl(filename);
      public_id = filename;
    }

    const payload = typeof req.body.data === "string" 
      ? JSON.parse(req.body.data) 
      : req.body;

    if (imageUrl) {
      payload.imageUrl = imageUrl;
      payload.public_id = public_id;
    }

    const now = new Date().toISOString();
    payload.createdAt = now;
    payload.updatedAt = now;

    const ref = await db.collection("winners").add(payload);
    const doc = await ref.get();

    res.status(201).json({ 
      success: true, 
      data: { id: ref.id, ...doc.data() } 
    });
  } catch (err) {
    console.error("Error creating winner:", err);
    res.status(500).json({
      success: false,
      message: "Error creating winner",
      error: err.message,
    });
  }
};

export const updateWinner = async (req, res) => {
  try {
    const ref = db.collection("winners").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: "Winner not found" 
      });
    }

    let imageUrl = null;
    let public_id = null;

    if (req.file) {
      // Delete old image if exists
      const oldData = doc.data();
      if (oldData.public_id) {
        try {
          await storage.deleteFile(oldData.public_id);
        } catch (error) {
          console.error("Error deleting old winner image:", error);
        }
      }

      const filename = `${STORAGE_PATHS.CONTESTS.WINNERS}${uuidv4()}-${req.file.originalname}`;
      
      // Upload new image
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      imageUrl = await storage.getSignedUrl(filename);
      public_id = filename;
    }

    const payload = typeof req.body.data === "string" 
      ? JSON.parse(req.body.data) 
      : req.body;

    if (imageUrl) {
      payload.imageUrl = imageUrl;
      payload.public_id = public_id;
    }

    payload.updatedAt = new Date().toISOString();

    await ref.update(payload);
    const updated = await ref.get();

    res.json({ 
      success: true, 
      data: { id: updated.id, ...updated.data() } 
    });
  } catch (err) {
    console.error("Error updating winner:", err);
    res.status(500).json({
      success: false,
      message: "Error updating winner",
      error: err.message,
    });
  }
};

export const deleteWinner = async (req, res) => {
  try {
    const ref = db.collection("winners").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: "Winner not found" 
      });
    }

    // Delete image from storage if exists
    const winnerData = doc.data();
    if (winnerData.public_id) {
      try {
        await storage.deleteFile(winnerData.public_id);
      } catch (error) {
        console.error("Error deleting winner image:", error);
      }
    }

    await ref.delete();
    res.json({ 
      success: true, 
      message: "Winner deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting winner:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting winner",
      error: err.message,
    });
  }
};
