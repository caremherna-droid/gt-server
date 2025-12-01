import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

// Helper function to upload icon to Firebase Storage
const uploadIcon = async (file, categoryId) => {
  try {
    const filename = `${STORAGE_PATHS.SPECIAL_CATEGORIES.ICONS}special-${categoryId}-${uuidv4()}-${file.originalname}`;
    
    await storage.uploadFromBuffer(
      file.buffer,
      filename,
      file.mimetype
    );

    // Get the public URL
    const iconUrl = await storage.getPublicUrl(filename);
    return iconUrl;
  } catch (error) {
    console.error('Error uploading special category icon:', error);
    throw error;
  }
};

// Helper function to delete icon from Firebase Storage
const deleteIcon = async (iconUrl) => {
  try {
    if (!iconUrl) return;
    
    // Extract filename from URL
    const urlParts = iconUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query parameters
    const fullPath = `${STORAGE_PATHS.SPECIAL_CATEGORIES.ICONS}${filename}`;
    
    await storage.deleteFile(fullPath);
    console.log(`Special category icon deleted: ${fullPath}`);
  } catch (error) {
    console.error('Error deleting special category icon:', error);
    // Don't throw error - continue with deletion even if icon deletion fails
  }
};

// Get all special categories
export const getAllSpecialCategories = async (req, res) => {
  try {
    const snapshot = await db.collection("specialCategories").get();
    const categories = [];
    
    snapshot.forEach(doc => {
      categories.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('Found special categories:', categories.length);
    console.log('Categories data:', categories);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("Error fetching special categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch special categories"
    });
  }
};

// Get special category by ID
export const getSpecialCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("specialCategories").doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Special category not found"
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error("Error fetching special category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch special category"
    });
  }
};

// Create new special category
export const createSpecialCategory = async (req, res) => {
  try {
    const { title, isVisible = true } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Title is required"
      });
    }

    // Check if category with same title already exists
    const existingSnapshot = await db.collection("specialCategories")
      .where("title", "==", title)
      .get();
    
    if (!existingSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: "Category with this title already exists"
      });
    }

    const categoryData = {
      title: title.trim(),
      isVisible: isVisible === 'true' || isVisible === true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection("specialCategories").add(categoryData);
    const categoryId = docRef.id;

    // Upload icon if provided
    if (req.file) {
      try {
        const iconUrl = await uploadIcon(req.file, categoryId);
        categoryData.icon = iconUrl;
        
        // Update the document with the icon URL
        await docRef.update({ icon: iconUrl });
      } catch (uploadError) {
        console.error('Error uploading icon:', uploadError);
        // Continue without icon if upload fails
      }
    }

    const category = {
      id: categoryId,
      ...categoryData
    };

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error("Error creating special category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create special category"
    });
  }
};

// Update special category
export const updateSpecialCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, isVisible } = req.body;
    
    const categoryRef = db.collection("specialCategories").doc(id);
    const categoryDoc = await categoryRef.get();
    
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Special category not found"
      });
    }

    const currentData = categoryDoc.data();
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (isVisible !== undefined) {
      updateData.isVisible = isVisible === 'true' || isVisible === true;
    }

    // Check if title is being changed and if it conflicts with existing
    if (title && title !== currentData.title) {
      const existingSnapshot = await db.collection("specialCategories")
        .where("title", "==", title.trim())
        .get();
      
      if (!existingSnapshot.empty) {
        return res.status(400).json({
          success: false,
          error: "Category with this title already exists"
        });
      }
    }

    // Handle icon removal if requested
    if (req.body.removeIcon === 'true') {
      // Delete old icon from storage
      if (currentData.icon) {
        await deleteIcon(currentData.icon);
      }
      updateData.icon = null;
    }
    // Upload new icon if provided
    else if (req.file) {
      try {
        // Delete old icon if it exists
        if (currentData.icon) {
          await deleteIcon(currentData.icon);
        }
        
        const iconUrl = await uploadIcon(req.file, id);
        updateData.icon = iconUrl;
      } catch (uploadError) {
        console.error('Error uploading icon:', uploadError);
        // Continue without updating icon if upload fails
      }
    }

    await categoryRef.update(updateData);
    
    const updatedDoc = await categoryRef.get();
    res.json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error("Error updating special category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update special category"
    });
  }
};

// Delete special category
export const deleteSpecialCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const categoryRef = db.collection("specialCategories").doc(id);
    const categoryDoc = await categoryRef.get();
    
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Special category not found"
      });
    }

    const categoryData = categoryDoc.data();
    
    // Delete icon from storage if it exists
    if (categoryData.icon) {
      await deleteIcon(categoryData.icon);
    }

    // Remove this category from all games that have it
    const gamesSnapshot = await db.collection("games")
      .where("specialCategories", "array-contains", id)
      .get();
    
    const batch = db.batch();
    
    gamesSnapshot.forEach(doc => {
      const gameData = doc.data();
      const updatedSpecialCategories = gameData.specialCategories.filter(catId => catId !== id);
      batch.update(doc.ref, { specialCategories: updatedSpecialCategories });
    });
    
    // Delete the category
    batch.delete(categoryRef);
    
    await batch.commit();
    
    res.json({
      success: true,
      message: "Special category deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting special category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete special category"
    });
  }
};

// Get games by special category
export const getGamesBySpecialCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const categoryDoc = await db.collection("specialCategories").doc(id).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Special category not found"
      });
    }

    // Get games that have this special category
    const snapshot = await db.collection("games")
      .where("specialCategories", "array-contains", id)
      .get();
    
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error("Error fetching games by special category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch games by special category"
    });
  }
};

// Toggle game in special category
export const toggleGameSpecialCategory = async (req, res) => {
  try {
    const { categoryId, gameId } = req.params;
    
    // Check if category exists
    const categoryDoc = await db.collection("specialCategories").doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Special category not found"
      });
    }

    // Check if game exists
    const gameRef = db.collection("games").doc(gameId);
    const gameDoc = await gameRef.get();
    if (!gameDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Game not found"
      });
    }

    const gameData = gameDoc.data();
    const currentCategories = gameData.specialCategories || [];
    let updateData = {};

    // Handle custom categories only
    if (currentCategories.includes(categoryId)) {
      updateData.specialCategories = currentCategories.filter(id => id !== categoryId);
    } else {
      updateData.specialCategories = [...currentCategories, categoryId];
    }

    updateData.updatedAt = new Date().toISOString();
    
    await gameRef.update(updateData);
    
    const updatedGameDoc = await gameRef.get();
    res.json({
      success: true,
      data: {
        id: updatedGameDoc.id,
        ...updatedGameDoc.data()
      }
    });
  } catch (error) {
    console.error("Error toggling game special category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle game special category"
    });
  }
};
