import { db } from "../../config/firebase.js"; 
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

export const getAllSubmissions = async (req, res) => {
  try {
    const snap = await db.collection("submissions").get();
    const subs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: subs });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error retrieving submissions",
      error: err.message,
    });
  }
};

export const getSubmissionsByContest = async (req, res) => {
  try {
    const snap = await db
      .collection("submissions")
      .where("contestId", "==", req.params.contestId)
      .get();
    const subs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: subs });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving submissions",
        error: err.message,
      });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const ref = db.collection("submissions").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists)
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving submission",
        error: err.message,
      });
  }
};

export const createSubmission = async (req, res) => {
  try {
    console.log("Submission request received:", {
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      bodyKeys: Object.keys(req.body),
      dataType: typeof req.body.data,
      origin: req.headers.origin || req.headers.referer
    });

    // Check for file and validate it
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Artwork required" 
      });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork file buffer"
      });
    }

    try {
      // Generate a unique filename
      const filename = `${STORAGE_PATHS.CONTESTS.SUBMISSIONS}${uuidv4()}-${req.file.originalname}`;
      console.log("File will be stored at:", filename);
      
      // Upload to Firebase Storage
      console.log("Attempting to upload to Firebase Storage...");
      console.log("File buffer size:", req.file.buffer.length, "bytes");
      console.log("File mimetype:", req.file.mimetype);
      
      const file = await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );
      console.log("Upload to Firebase Storage successful, file:", file?.name || 'unknown');

      // Get the download URL
      console.log("Getting signed URL...");
      const artworkUrl = await storage.getSignedUrl(filename);
      console.log("Got signed URL:", artworkUrl?.substring(0, 50) + "...");

      // Parse payload
      console.log("Parsing payload...");
      const payload = typeof req.body.data === "string" 
        ? JSON.parse(req.body.data) 
        : req.body;
      console.log("Payload parsed:", Object.keys(payload));

      // Add required fields
      payload.artworkUrl = artworkUrl;
      payload.public_id = filename;
      payload.status = "Pending";
      payload.submittedDate = new Date().toISOString();
      payload.rating = null;

      // Log full payload for debugging
      console.log("Full submission payload:", JSON.stringify(payload));

      // Save to Firestore
      console.log("Saving to Firestore...");
      const ref = await db.collection("submissions").add(payload);
      console.log("Saved to Firestore, getting document...");
      const doc = await ref.get();
      const submissionData = doc.data();

      // Get the contest title - either from the payload or by fetching the contest
      let contestTitle = payload.contestTitle;
      if (!contestTitle && payload.contestId) {
        try {
          const contestDoc = await db.collection("contests").doc(payload.contestId).get();
          if (contestDoc.exists) {
            contestTitle = contestDoc.data().title;
          }
        } catch (err) {
          console.error("Error fetching contest details:", err);
        }
      }
      
      // Fall back to generic title if still not found
      contestTitle = contestTitle || "Art Contest";

      // Get client origin from request headers
      const clientUrl = req.headers.origin || req.headers.referer || process.env.CLIENT_URL || 'https://gametribe.com';

      // Update contest entries count
      if (payload.contestId) {
        console.log("Updating contest entries count for contest:", payload.contestId);
        const cRef = db.collection("contests").doc(payload.contestId);
        const cSnap = await cRef.get();
        if (cSnap.exists) {
          await cRef.update({ entries: (cSnap.data().entries || 0) + 1 });
          console.log("Contest entries count updated");
        } else {
          console.log("Contest not found:", payload.contestId);
        }
      }

      console.log("Submission process completed successfully");
      return res.status(201).json({ 
        success: true, 
        data: { id: ref.id, ...submissionData } 
      });
      
    } catch (uploadError) {
      console.error("Error in file processing:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Error processing file upload",
        error: uploadError.message,
        stack: uploadError.stack
      });
    }
  } catch (err) {
    console.error("Error creating submission:", err);
    return res.status(500).json({
      success: false,
      message: "Error creating submission",
      error: err.message,
      stack: err.stack
    });
  }
};

export const updateSubmissionStatus = async (req, res) => {
  try {
    const { status, rating, feedback } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const ref = db.collection("submissions").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    const data = { status, updatedAt: new Date().toISOString() };
    if (rating !== undefined) data.rating = rating;
    if (feedback) data.feedback = feedback;
    await ref.update(data);
    const updated = await ref.get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating submission",
        error: err.message,
      });
  }
};

export const deleteSubmission = async (req, res) => {
  try {
    const ref = db.collection("submissions").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: "Submission not found" 
      });
    }

    // Delete artwork from storage if exists
    const submissionData = doc.data();
    if (submissionData.public_id) {
      try {
        await storage.deleteFile(submissionData.public_id);
      } catch (error) {
        console.error("Error deleting submission artwork:", error);
      }
    }

    await ref.delete();
    res.json({ 
      success: true, 
      message: "Submission deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting submission:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting submission",
      error: err.message,
    });
  }
};
