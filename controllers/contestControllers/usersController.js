import { db } from "../../config/firebase.js"; 


export const getAllUsers = async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => {
      const data = d.data();
      delete data.password;
      return { id: d.id, ...data };
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving users",
        error: err.message,
      });
  }
};

export const getUserById = async (req, res) => {
  try {
    const ref = db.collection("users").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const data = doc.data();
    delete data.password;
    res.json({ success: true, data: { id: doc.id, ...data } });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving user",
        error: err.message,
      });
  }
};

export const updateUser = async (req, res) => {
  try {
    const ref = db.collection("users").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const { name, email, role, status } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (status) data.status = status;
    data.updatedAt = new Date().toISOString();
    await ref.update(data);
    const updated = await ref.get();
    const user = updated.data();
    delete user.password;
    res.json({ success: true, data: { id: updated.id, ...user } });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating user",
        error: err.message,
      });
  }
};
