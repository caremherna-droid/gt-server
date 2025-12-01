import { db } from "../../config/firebase.js";

const platformsCollection = db.collection("platforms");

// Add Platform
export const addPlatform = async (req, res) => {
  try {
    const platformData = {
      name: req.body.name,
      icon: req.body.icon || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await platformsCollection.add(platformData);
    const platform = {
      id: docRef.id,
      ...platformData,
    };

    res.status(201).json(platform);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Platforms
export const getAllPlatforms = async (req, res) => {
  try {
    const snapshot = await platformsCollection.orderBy("name").get();
    const platforms = [];

    snapshot.forEach((doc) => {
      platforms.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(platforms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Platform by ID
export const getPlatformById = async (req, res) => {
  try {
    const doc = await platformsCollection.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Platform not found" });
    }

    const platform = {
      id: doc.id,
      ...doc.data(),
    };

    res.status(200).json(platform);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Platform
export const updatePlatform = async (req, res) => {
  try {
    const platformRef = platformsCollection.doc(req.params.id);
    const doc = await platformRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Platform not found" });
    }

    const updateData = {
      name: req.body.name,
      icon: req.body.icon,
      updatedAt: new Date(),
    };

    await platformRef.update(updateData);

    const updatedDoc = await platformRef.get();
    const platform = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(platform);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Platform
export const deletePlatform = async (req, res) => {
  try {
    const platformRef = platformsCollection.doc(req.params.id);
    const doc = await platformRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Platform not found" });
    }

    await platformRef.delete();
    res.status(200).json({ message: "Platform deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
