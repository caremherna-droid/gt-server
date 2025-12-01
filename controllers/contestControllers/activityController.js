import { db } from "../../config/firebase.js"; 


export const getRecentActivity = async (req, res) => {
  try {
    // Fetch the 10 most recent activity items
    const snap = await db
      .collection("activity")
      .orderBy("time", "desc")
      .limit(10)
      .get();

    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error getting recent activity:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving recent activity",
        error: err.message,
      });
  }
};
