import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

const newsCollection = db.collection("news");

// add News
export const addNews = async (req, res) => {
  try {
    const newsData = {
      ...req.body,
      featured: req.body.featured || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await newsCollection.add(newsData);
    const news = {
      id: docRef.id,
      ...newsData,
    };

    res.status(201).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get All News
export const getAllNews = async (req, res) => {
  try {
    const snapshot = await newsCollection.orderBy("createdAt", "desc").get();
    const news = [];

    snapshot.forEach((doc) => {
      news.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get News by ID
export const getNewsById = async (req, res) => {
  try {
    const newsRef = newsCollection.doc(req.params.id);
    const doc = await newsRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "News not found" });
    }

    const news = {
      id: doc.id,
      ...doc.data(),
    };

    res.status(200).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// update News
export const updateNews = async (req, res) => {
  try {
    const newsRef = newsCollection.doc(req.params.id);
    const doc = await newsRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "News not found" });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    // If there's a new image, handle the upload
    if (req.file) {
      const oldData = doc.data();
      // Delete old image if exists
      if (oldData.public_id) {
        try {
          await storage.deleteFile(oldData.public_id);
        } catch (error) {
          console.error("Error deleting old news image:", error);
        }
      }

      // Upload new image
      const filename = `${STORAGE_PATHS.NEWS.IMAGES}${uuidv4()}-${req.file.originalname}`;
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      updateData.imageUrl = await storage.getSignedUrl(filename);
      updateData.public_id = filename;
    }

    await newsRef.update(updateData);

    const updatedDoc = await newsRef.get();
    const news = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete News
export const deleteNews = async (req, res) => {
  try {
    const newsId = req.params.id;
    const newsRef = newsCollection.doc(newsId);
    const doc = await newsRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "News not found" });
    }

    const newsData = doc.data();
    const deletionErrors = [];

    // Delete news image from Firebase Storage if it exists
    if (newsData.public_id) {
      try {
        await storage.deleteFile(newsData.public_id);
        console.log(`Deleted news image: ${newsData.public_id}`);
      } catch (error) {
        console.error("Error deleting news image:", error);
        deletionErrors.push(`Image deletion failed: ${error.message}`);
        // Continue with the news deletion even if image deletion fails
      }
    }

    // Delete the news document
    await newsRef.delete();
    console.log(`Successfully deleted news ${newsId}`);

    const responseMessage = deletionErrors.length > 0
      ? `News deleted successfully with warnings: ${deletionErrors.join('; ')}`
      : "News deleted successfully";

    res.status(200).json({ 
      message: responseMessage,
      warnings: deletionErrors.length > 0 ? deletionErrors : undefined
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    res.status(500).json({ error: error.message });
  }
};
