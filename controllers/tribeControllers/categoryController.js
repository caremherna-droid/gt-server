import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

const gamesCategoriesCollection = db.collection("gamesCategories");
const newsCategoriesCollection = db.collection("newsCategories");

// Helper function to upload icon to Firebase Storage
const uploadIcon = async (file, categoryId) => {
  try {
    const filename = `${
      STORAGE_PATHS.CATEGORIES.ICONS
    }${categoryId}-${uuidv4()}-${file.originalname}`;

    await storage.uploadFromBuffer(file.buffer, filename, file.mimetype);

    // Get the public URL
    const iconUrl = await storage.getPublicUrl(filename);
    return iconUrl;
  } catch (error) {
    console.error("Error uploading icon:", error);
    throw error;
  }
};

// Helper function to delete icon from Firebase Storage
const deleteIcon = async (iconUrl) => {
  try {
    if (!iconUrl) return;

    // Extract filename from URL
    const urlParts = iconUrl.split("/");
    const filename = urlParts[urlParts.length - 1].split("?")[0]; // Remove query parameters
    const fullPath = `${STORAGE_PATHS.CATEGORIES.ICONS}${filename}`;

    await storage.deleteFile(fullPath);
    console.log(`Icon deleted: ${fullPath}`);
  } catch (error) {
    console.error("Error deleting icon:", error);
    // Don't throw error - continue with deletion even if icon deletion fails
  }
};

// Game Categories
export const addGameCategory = async (req, res) => {
  try {
    const categoryData = {
      name: req.body.name,
      isVisible:
        req.body.isVisible !== undefined
          ? req.body.isVisible === "true" || req.body.isVisible === true
          : true,
      createdAt: new Date(),
    };

    const docRef = await gamesCategoriesCollection.add(categoryData);
    const categoryId = docRef.id;

    // Upload icon if provided
    if (req.file) {
      try {
        const iconUrl = await uploadIcon(req.file, categoryId);
        categoryData.icon = iconUrl;

        // Update the document with the icon URL
        await docRef.update({ icon: iconUrl });
      } catch (uploadError) {
        console.error("Error uploading icon:", uploadError);
        // Continue without icon if upload fails
      }
    }

    const category = {
      id: categoryId,
      ...categoryData,
    };

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllGameCategories = async (req, res) => {
  try {
    const snapshot = await gamesCategoriesCollection.get();
    const categories = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        name: data.name || "Unnamed Category",
        icon: data.icon || null,
        isVisible: data.isVisible !== undefined ? data.isVisible : true,
        createdAt: data.createdAt || null,
        ...data,
      });
    });

    // Debug logging
    console.log("Categories fetched:", categories.length, "categories");
    console.log(
      "Categories with icons:",
      categories.filter((cat) => cat.icon).length
    );
    console.log(
      "Visible categories:",
      categories.filter((cat) => cat.isVisible !== false).length
    );

    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching game categories:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGameCategory = async (req, res) => {
  try {
    const categoryRef = gamesCategoriesCollection.doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const currentData = doc.data();
    const updateData = { name: req.body.name };

    // Handle isVisible update
    if (req.body.isVisible !== undefined) {
      updateData.isVisible =
        req.body.isVisible === "true" || req.body.isVisible === true;
    }

    // Handle icon removal if requested
    if (req.body.removeIcon === "true") {
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

        const iconUrl = await uploadIcon(req.file, req.params.id);
        updateData.icon = iconUrl;
      } catch (uploadError) {
        console.error("Error uploading icon:", uploadError);
        // Continue without updating icon if upload fails
      }
    }

    await categoryRef.update(updateData);

    const updatedDoc = await categoryRef.get();
    const category = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGameCategory = async (req, res) => {
  try {
    const categoryRef = gamesCategoriesCollection.doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryData = doc.data();

    // Delete icon from storage if it exists
    if (categoryData.icon) {
      await deleteIcon(categoryData.icon);
    }

    await categoryRef.delete();
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// News Categories
export const addNewsCategory = async (req, res) => {
  try {
    const categoryData = {
      name: req.body.name,
      createdAt: new Date(),
    };

    const docRef = await newsCategoriesCollection.add(categoryData);
    const category = {
      id: docRef.id,
      ...categoryData,
    };

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllNewsCategories = async (req, res) => {
  try {
    const snapshot = await newsCategoriesCollection.get();
    const categories = [];

    snapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateNewsCategory = async (req, res) => {
  try {
    const categoryRef = newsCategoriesCollection.doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    await categoryRef.update({ name: req.body.name });

    const updatedDoc = await categoryRef.get();
    const category = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteNewsCategory = async (req, res) => {
  try {
    const categoryRef = newsCategoriesCollection.doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    await categoryRef.delete();
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
