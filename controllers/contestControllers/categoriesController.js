import { db } from "../../config/firebase.js";

export const getAllCategories = async (req, res) => {
  try {
    // Get settings document which contains categories
    const settingsDoc = await db.collection("settings").doc("contests").get();
    
    let categories = [];
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      categories = data.categories || [];
    }
    
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({
      success: false, 
      message: "Error retrieving categories",
      error: err.message
    });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }
    
    // Get current settings
    const settingsRef = db.collection("settings").doc("contests");
    const doc = await settingsRef.get();
    
    let categories = [];
    if (doc.exists) {
      const data = doc.data();
      categories = data.categories || [];
    }
    
    // Check if category already exists
    if (categories.includes(name)) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }
    
    // Add new category and update
    categories.push(name);
    
    await settingsRef.set({
      categories,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    res.json({
      success: true,
      data: categories,
      message: "Category added successfully"
    });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({
      success: false,
      message: "Error adding category",
      error: err.message
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get current settings
    const settingsRef = db.collection("settings").doc("contests");
    const doc = await settingsRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Settings not found"
      });
    }
    
    const data = doc.data();
    const categories = data.categories || [];
    
    // Remove category
    const updatedCategories = categories.filter(cat => cat !== name);
    
    await settingsRef.update({
      categories: updatedCategories,
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: updatedCategories,
      message: "Category deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: err.message
    });
  }
};
