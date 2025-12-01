import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import storage from "../../config/storage.js";
import { STORAGE_PATHS } from "../../config/storagePaths.js";
import path from "path";

// Configure multer for memory storage
const multerStorage = multer.memoryStorage();

// For backward compatibility - keep the name 'upload' for image uploads
export const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Game file upload configuration
export const uploadGame = multer({
  storage: multerStorage,
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB limit for game files
  },
  fileFilter: (req, file, cb) => {
    // Accept any file type - no restrictions
    cb(null, true);
  },
});

// Image upload handler
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        receivedData: req.body,
      });
    }

    // Validate the file object and buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid file data",
      });
    }

    // Get the image type from the request or default to general images
    const imageType = req.body.imageType || "general";
    let storagePath;

    // Determine the storage path based on image type
    switch (imageType) {
      case "game":
        storagePath = STORAGE_PATHS.GAMES.IMAGES;
        break;
      case "news":
        storagePath = STORAGE_PATHS.NEWS.IMAGES;
        break;
      case "hero":
        storagePath = STORAGE_PATHS.HERO.IMAGES;
        break;
      case "platform":
        storagePath = STORAGE_PATHS.PLATFORMS.ICONS;
        break;
      default:
        storagePath = "gametribe/images/";
    }

    const filename = `${storagePath}${uuidv4()}-${req.file.originalname}`;

    try {
      // Upload file with additional error handling
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      // Get permanent public URL instead of a signed URL
      const downloadUrl = await storage.getPublicUrl(filename);

      res.status(200).json({
        success: true,
        url: downloadUrl,
        public_id: filename,
      });
    } catch (uploadError) {
      console.error("Error during file upload:", uploadError);
      // Clean up any partial uploads if possible
      try {
        await storage.deleteFile(filename);
      } catch (cleanupError) {
        console.error("Error cleaning up failed upload:", cleanupError);
      }

      throw uploadError;
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Game file upload handler
export const uploadGameFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Log file details
    console.log("Game file upload:", {
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      mimeType: req.file.mimetype,
      fileExtension: req.file.originalname.split(".").pop(),
    });

    // Check Firebase configuration
    if (!process.env.FIREBASE_STORAGE_BUCKET) {
      console.error("Firebase storage bucket not configured");
      return res.status(500).json({
        success: false,
        error: "Firebase storage not configured",
        details: "Please check Firebase environment variables",
      });
    }

    const filename = `${STORAGE_PATHS.GAMES.FILES}${uuidv4()}-${
      req.file.originalname
    }`;

    try {
      // Test Firebase connection first
      await storage.bucket.getMetadata();
      console.log("Firebase connection verified");

      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      // Get permanent public URL instead of a signed URL
      const downloadUrl = await storage.getPublicUrl(filename);

      res.status(200).json({
        success: true,
        downloadUrl,
        fileSize: req.file.size,
        fileName: req.file.originalname,
        format: req.file.originalname.split(".").pop() || "file",
        public_id: filename,
      });
    } catch (firebaseError) {
      console.error("Firebase storage error:", firebaseError);

      // Return more specific error information
      let errorMessage = "Firebase storage connection failed";
      if (firebaseError.message.includes("getaddrinfo ENOTFOUND")) {
        errorMessage =
          "Network connection to Google Cloud Storage failed. Please check your internet connection and Firebase configuration.";
      } else if (firebaseError.message.includes("authentication")) {
        errorMessage =
          "Firebase authentication failed. Please check your service account credentials.";
      } else if (firebaseError.message.includes("permission")) {
        errorMessage =
          "Firebase storage permissions denied. Please check your storage bucket rules and service account permissions.";
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        details: firebaseError.message,
        troubleshooting: {
          checkNetwork: "Verify internet connection",
          checkCredentials: "Verify Firebase service account credentials",
          checkBucket: "Verify Firebase storage bucket configuration",
          checkPermissions: "Verify storage bucket rules allow uploads",
        },
      });
    }
  } catch (error) {
    console.error("Error handling game file upload:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error uploading game file",
    });
  }
};

// Delete file from Firebase Storage
export const deleteImage = async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    await storage.deleteFile(public_id);
    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HTML file upload handler
export const uploadHtmlFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No HTML file uploaded",
      });
    }

    // Validate the file object and buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid HTML file data",
      });
    }

    console.log("HTML file upload:", {
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimeType: req.file.mimetype,
    });

    const filename = `${STORAGE_PATHS.HERO.HTML}${uuidv4()}-${
      req.file.originalname
    }`;

    try {
      // Upload HTML file
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype || "text/html"
      );

      // Get permanent public URL
      const downloadUrl = await storage.getPublicUrl(filename);

      res.status(200).json({
        success: true,
        url: downloadUrl,
        public_id: filename,
        fileName: req.file.originalname,
      });
    } catch (uploadError) {
      console.error("Error during HTML file upload:", uploadError);
      // Clean up any partial uploads if possible
      try {
        await storage.deleteFile(filename);
      } catch (cleanupError) {
        console.error("Error cleaning up failed HTML upload:", cleanupError);
      }

      throw uploadError;
    }
  } catch (error) {
    console.error("Error uploading HTML file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export const refreshImageUrl = async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    // For files that might not be public yet, make them public now
    const url = await storage.getPublicUrl(public_id);

    res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("Error refreshing image URL:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh image URL",
      error: error.message,
    });
  }
};
