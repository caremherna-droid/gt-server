import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { getDownloadPriority } from "../../services/privilegesService.js";

const gamesCollection = db.collection("games");
const downloadHistoryCollection = db.collection("downloadHistory");
const { bucket } = storage;

export const startDownload = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user?.uid; // Get user ID if authenticated
    console.log("Starting download for game:", gameId);

    // Get game details
    const gameDoc = await gamesCollection.doc(gameId).get();
    if (!gameDoc.exists) {
      return res.status(404).json({ success: false, error: "Game not found" });
    }

    const game = gameDoc.data();
    console.log("Game data:", {
      title: game.title,
      game_file_id: game.game_file_id,
      downloadUrl: game.downloadUrl,
      fileSize: game.fileSize,
      fileName: game.fileName
    });

    // Check if the game has either a game_file_id or downloadUrl
    if (!game.game_file_id && !game.downloadUrl) {
      return res.status(400).json({
        success: false,
        error: "This game does not have a downloadable file",
      });
    }

    // Get download priority based on user achievements
    let downloadPriority = "normal";
    let priorityMessage = "";
    if (userId) {
      downloadPriority = await getDownloadPriority(userId);
      if (downloadPriority === "instant") {
        priorityMessage = "Instant download (Critic achievement unlocked)";
      } else if (downloadPriority === "priority") {
        priorityMessage = "Priority download (Marathon Gamer achievement unlocked)";
      }
    }

    try {
      let downloadUrl;
      
      // Use existing downloadUrl if available, otherwise generate one
      if (game.downloadUrl) {
        downloadUrl = game.downloadUrl;
        console.log("Using existing download URL");
      } else {
        // Generate URL from game_file_id
        downloadUrl = await storage.getPublicUrl(game.game_file_id);
        console.log("Generated new download URL");
      }

      return res.status(200).json({
        success: true,
        downloadUrl,
        fileSize: game.fileSize || 0,
        fileName: game.fileName || `${game.title}.zip`,
        priority: downloadPriority,
        priorityMessage: priorityMessage || undefined,
      });
    } catch (error) {
      console.error("Storage error details:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate download URL",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process download request",
    });
  }
};

export const testCloudinary = async (req, res) => {
  try {
    // Try to generate a signed URL
    const testPublicId = "games/4f66d6e8-79b8-4234-8c31-f2510a70cd7f.zip"; // Use a real publicId from your DB
    const timestamp = Math.floor(Date.now() / 1000) + 3600;

    const signedUrl = cloudinaryV2.utils.private_download_url(
      testPublicId,
      null,
      {
        resource_type: "raw",
        type: "upload",
        expires_at: timestamp,
      }
    );

    // Return the info
    res.status(200).json({
      success: true,
      signedUrl,
      cloudinaryConfig: {
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        hasSecret: process.env.CLOUD_API_SECRET ? "yes" : "no",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const checkFileExists = async (req, res) => {
  try {
    const { publicId } = req.params;

    // Try to get resource info
    const result = await cloudinaryV2.api.resource(
      publicId || "games/4f66d6e8-79b8-4234-8c31-f2510a70cd7f.zip",
      { resource_type: "raw" }
    );

    res.status(200).json({
      exists: true,
      resource: result,
    });
  } catch (error) {
    res.status(404).json({
      exists: false,
      error: error.message,
    });
  }
};

export const testUpload = async (req, res) => {
  try {
    // Create a simple test file
    const testData = Buffer.from("Test file content").toString("base64");

    // Try uploading to Cloudinary
    const result = await cloudinaryV2.uploader.upload(
      `data:application/octet-stream;base64,${testData}`,
      {
        resource_type: "raw",
        public_id: "test-file.txt",
        type: "upload",
        access_mode: "authenticated",
        upload_preset: "game_files",
      }
    );

    res.status(200).json({
      success: true,
      result,
      downloadUrl: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const testCloudinaryConfig = async (req, res) => {
  try {
    // Get Cloudinary configuration
    const config = cloudinaryV2.config();

    res.status(200).json({
      success: true,
      message: "Cloudinary configuration is loaded",
      config: {
        cloud_name: config.cloud_name,
        api_key: config.api_key,
        hasSecret: config.api_secret ? "yes" : "no",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const recordDownload = async (req, res) => {
  try {
    const { gameId, userId, localFilePath } = req.body;

    if (!gameId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Game ID and User ID are required",
      });
    }

    // Get game details
    const gameDoc = await gamesCollection.doc(gameId).get();
    if (!gameDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    const game = gameDoc.data();

    // Create download record with local file path
    const downloadRecord = {
      gameId,
      userId,
      gameTitle: game.title,
      gameImage: game.imageUrl || null,
      downloadDate: new Date().toISOString(),
      fileSize: game.fileSize || 0,
      version: game.version || "1.0",
      localFilePath: localFilePath || "", // Store the local file path
    };

    // Add to downloads collection
    await downloadHistoryCollection.add(downloadRecord);

    res.status(200).json({
      success: true,
      message: "Download recorded successfully",
    });
  } catch (error) {
    console.error("Error recording download:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record download",
    });
  }
};

export const deleteDownloadRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const recordRef = downloadHistoryCollection.doc(recordId);
    const doc = await recordRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Download record not found",
      });
    }

    await recordRef.delete();

    res.status(200).json({
      success: true,
      message: "Download record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting download record:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete download record",
    });
  }
};

export const getDownloadHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    // Use a simpler query without ordering
    const snapshot = await downloadHistoryCollection
      .where("userId", "==", userId)
      .get();

    let downloads = [];
    snapshot.forEach((doc) => {
      downloads.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort the results manually in JavaScript
    downloads.sort((a, b) => {
      const dateA = new Date(a.downloadDate || 0);
      const dateB = new Date(b.downloadDate || 0);
      return dateB - dateA; // Descending order
    });

    console.log(`Found ${downloads.length} downloads for user ${userId}`);

    res.status(200).json({
      success: true,
      data: downloads,
    });
  } catch (error) {
    console.error("Error fetching download history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch download history",
      details: error.message,
    });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log("Streaming file download for game:", gameId);

    // Get game details
    const gameDoc = await gamesCollection.doc(gameId).get();
    if (!gameDoc.exists) {
      return res.status(404).json({ success: false, error: "Game not found" });
    }

    const game = gameDoc.data();
    console.log("Game data for download:", {
      title: game.title,
      downloadUrl: game.downloadUrl,
      fileSize: game.fileSize
    });

    // Check if the game has a file to download
    if (!game.downloadUrl && !game.game_file_id) {
      return res.status(400).json({
        success: false,
        error: "This game does not have a downloadable file",
      });
    }

    try {
      // Try to extract file path from downloadUrl if game_file_id is missing
      let filePath = game.game_file_id;
      
      if (!filePath && game.downloadUrl) {
        // Extract the path from the download URL
        const urlParts = game.downloadUrl.split('/');
        // Get everything after the bucket name
        const bucketNameIndex = urlParts.findIndex(part => 
          part.includes('firebasestorage.app') || part.includes('appspot.com')
        );
        
        if (bucketNameIndex !== -1 && bucketNameIndex < urlParts.length - 1) {
          filePath = urlParts.slice(bucketNameIndex + 1).join('/');
          console.log("Extracted file path:", filePath);
        }
      }

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: "Could not determine file path",
        });
      }

      // Set headers for content disposition
      res.setHeader('Content-Disposition', `attachment; filename="${game.fileName || 'game.zip'}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Set Content-Length header to enable progress tracking on the client
      if (game.fileSize) {
        res.setHeader('Content-Length', game.fileSize);
      }
      
      console.log("Streaming file:", filePath);
      
      // Get the file from Firebase Storage and stream it to the response
      const file = storage.bucket.file(filePath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.error("File does not exist in storage:", filePath);
        return res.status(404).json({
          success: false,
          error: "File not found in storage",
        });
      }
      
      const fileStream = file.createReadStream();
      
      // Pipe the file stream to the response
      fileStream.pipe(res);
      
      // Handle errors in the stream
      fileStream.on('error', (error) => {
        console.error("Error streaming file:", error);
        // Only send error if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: "Error streaming file",
          });
        }
      });

      // Track download completion
      fileStream.on('end', () => {
        console.log("Download completed for:", game.title);
      });
    } catch (error) {
      console.error("File download error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to stream file",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process download request",
    });
  }
};
