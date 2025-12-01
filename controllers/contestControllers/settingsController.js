import { db } from "../../config/firebase.js"; 


// we'll store settings in a single doc named "general"
const SETTINGS_DOC = "general";

export const getSettings = async (req, res) => {
  try {
    const ref = db.collection("settings").doc(SETTINGS_DOC);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error getting settings:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving settings",
        error: err.message,
      });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settingsData = req.body;

    // Validate required fields
    if (!settingsData || Object.keys(settingsData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Settings data is required",
      });
    }

    const ref = db.collection("settings").doc(SETTINGS_DOC);
    await ref.set(settingsData, { merge: true });

    // Fetch updated data to return
    const updated = await ref.get();
    res.json({ success: true, data: updated.data() });
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({
      success: false,
      message: "Error updating settings",
      error: err.message,
    });
  }
};
