import { db } from "../../config/firebase.js"; // Using gametribe's firebase
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

export const getAllContests = async (req, res) => {
  try {
    const snap = await db.collection("contests").get();
    const contests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: contests });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error retrieving contests",
      error: err.message,
    });
  }
};

export const getFeaturedContests = async (req, res) => {
  try {
    const snap = await db
      .collection("contests")
      .where("featured", "==", true)
      .where("status", "==", "Active")
      .limit(1)
      .get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error getting featured contests:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving featured contests",
      error: err.message,
    });
  }
};

export const getContestById = async (req, res) => {
  try {
    const ref = db.collection("contests").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists)
      return res
        .status(404)
        .json({ success: false, message: "Contest not found" });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving contest",
        error: err.message,
      });
  }
};

export const createContest = async (req, res) => {
  try {
    let contestData;

    if (req.body.data) {
      try {
        contestData = JSON.parse(req.body.data);
      } catch (err) {
        console.error("Error parsing form data:", err);
        contestData = req.body;
      }
    } else {
      contestData = req.body;
    }

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "category",
      "startDate",
      "endDate",
    ];
    const missingFields = requiredFields.filter((field) => !contestData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Parse JSON fields if they're strings
    ["prize", "tags", "requirements", "judgingCriteria"].forEach((field) => {
      if (typeof contestData[field] === "string") {
        try {
          contestData[field] = JSON.parse(contestData[field]);
        } catch (err) {
          console.error(`Error parsing ${field}:`, err);
          contestData[field] = field === "prize" ? {} : [];
        }
      }
    });

    // Handle boolean fields
    contestData.featured = contestData.featured === "true" || contestData.featured === true;
    contestData.allowMultipleEntries = contestData.allowMultipleEntries === "true" || contestData.allowMultipleEntries === true;

    // Add required fields
    contestData.status = contestData.status || "Draft";
    contestData.entries = 0;
    contestData.createdAt = new Date().toISOString();

    // Handle banner image
    if (req.file) {
      const filename = `${STORAGE_PATHS.CONTESTS.BANNERS}${uuidv4()}-${req.file.originalname}`;
      
      // Upload to Firebase Storage
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      // Get the download URL
      contestData.bannerImageUrl = await storage.getSignedUrl(filename);
      contestData.public_id = filename;
    }

    // Save to database
    const ref = await db.collection("contests").add(contestData);
    const doc = await ref.get();

    // Add activity log
    await db.collection("activity").add({
      type: "contest_created",
      contestId: ref.id,
      contestTitle: contestData.title,
      time: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: { id: ref.id, ...doc.data() },
    });
  } catch (err) {
    console.error("Error creating contest:", err);
    res.status(500).json({
      success: false,
      message: "Error creating contest",
      error: err.message,
    });
  }
};

export const updateContest = async (req, res) => {
  try {
    const id = req.params.id;
    let contestData = {};
    
    // Parse the request body if it comes as a string
    if (req.body.data) {
      try {
        contestData = JSON.parse(req.body.data);
        console.log("Parsed contest data:", contestData);
      } catch (err) {
        console.error("Error parsing contest data:", err);
        contestData = req.body;
      }
    } else {
      contestData = req.body;
    }
    
    // Ensure status is properly extracted and validated
    if (contestData.status) {
      console.log("Status from request:", contestData.status);
      // Validate status is one of the allowed values
      const validStatuses = ["Draft", "Upcoming", "Active", "Completed"];
      if (!validStatuses.includes(contestData.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value"
        });
      }
    }

    // Parse JSON fields
    ["prize", "tags", "requirements", "judgingCriteria"].forEach((field) => {
      if (typeof contestData[field] === "string") {
        try {
          contestData[field] = JSON.parse(contestData[field]);
        } catch (err) {
          console.error(`Error parsing ${field}:`, err);
        }
      }
    });

    // Handle boolean fields
    contestData.featured = contestData.featured === "true" || contestData.featured === true;
    contestData.allowMultipleEntries = contestData.allowMultipleEntries === "true" || contestData.allowMultipleEntries === true;

    contestData.updatedAt = new Date().toISOString();

    const ref = db.collection("contests").doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Contest not found" });
    }

    // Handle banner image upload if provided
    if (req.file) {
      // Delete old image if exists
      const oldData = doc.data();
      if (oldData.public_id) {
        try {
          await storage.deleteFile(oldData.public_id);
        } catch (error) {
          console.error("Error deleting old banner:", error);
        }
      }

      const filename = `${STORAGE_PATHS.CONTESTS.BANNERS}${uuidv4()}-${req.file.originalname}`;
      
      // Upload new image
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      contestData.bannerImageUrl = await storage.getSignedUrl(filename);
      contestData.public_id = filename;
    }

    await ref.update(contestData);
    const updated = await ref.get();

    // Add activity log
    await db.collection("activity").add({
      type: "contest_updated",
      contestId: id,
      contestTitle: contestData.title || doc.data().title,
      time: new Date().toISOString(),
    });

    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (err) {
    console.error("Error updating contest:", err);
    res.status(500).json({
      success: false,
      message: "Error updating contest",
      error: err.message,
    });
  }
};

export const deleteContest = async (req, res) => {
  try {
    const ref = db.collection("contests").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Contest not found" });
    }

    // Delete banner image if exists
    const contestData = doc.data();
    if (contestData.public_id) {
      try {
        await storage.deleteFile(contestData.public_id);
      } catch (error) {
        console.error("Error deleting banner:", error);
      }
    }

    await ref.delete();
    res.json({ success: true, message: "Contest deleted successfully" });
  } catch (err) {
    console.error("Error deleting contest:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting contest",
      error: err.message,
    });
  }
};
