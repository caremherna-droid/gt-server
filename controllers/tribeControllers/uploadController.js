import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import storage from "../../config/storage.js";
import { STORAGE_PATHS } from "../../config/storagePaths.js";
import { db } from "../../config/firebase.js";
import path from "path";
import fs from "fs";
import unzipper from "unzipper";
import os from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import storageAdapter from "../../config/storageAdapter.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Helper function to recursively get all files in a directory
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
};

// Helper function to get MIME type from file extension
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Zip file upload handler - extracts to local directory and serves via static hosting
export const uploadGameZipLocal = async (req, res) => {
  let tempZipPath = null;
  let extractDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No zip file uploaded",
      });
    }

    // Validate the file object and buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid zip file data",
      });
    }

    // Log file details
    console.log("Game zip upload (Local Storage):", {
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      mimeType: req.file.mimetype,
    });

    // Create public/games directory if it doesn't exist
    // Note: In serverless environments (like Vercel), filesystem is read-only except /tmp
    // This directory is mainly for development/local use
    const publicGamesDir = path.join(__dirname, "../../public/games");
    try {
      if (!fs.existsSync(publicGamesDir)) {
        // Ensure parent directory exists first
        const parentDir = path.dirname(publicGamesDir);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.mkdirSync(publicGamesDir, { recursive: true });
        console.log(`Created directory: ${publicGamesDir}`);
      }
    } catch (error) {
      // In serverless environments, directory creation may fail
      // This is okay if files are stored in Firebase Storage instead
      if (process.env.VERCEL) {
        console.log(`Skipping local directory creation in Vercel environment: ${error.message}`);
      } else {
        console.warn(`Warning: Could not create public/games directory: ${error.message}`);
      }
    }

    // Generate unique game directory name
    const gameId = req.body.gameId || uuidv4();
    const siteName = `game_${gameId}_${Date.now()}`;
    extractDir = path.join(publicGamesDir, siteName);
    
    // Create extraction directory
    fs.mkdirSync(extractDir, { recursive: true });
    console.log(`Created extraction directory: ${extractDir}`);

    // Save zip file temporarily
    const tempBaseDir = os.tmpdir();
    tempZipPath = path.join(tempBaseDir, `${siteName}.zip`);
    fs.writeFileSync(tempZipPath, req.file.buffer);
    console.log(`Saved zip file temporarily: ${tempZipPath}`);

    console.log(`Extracting zip file to: ${extractDir}`);

    // Extract zip file
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempZipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', () => {
          console.log('✓ Zip extraction completed');
          resolve();
        })
        .on('error', (error) => {
          console.error('✗ Error extracting zip:', error);
          reject(error);
        });
    });

    // Get all extracted files
    const allFiles = getAllFiles(extractDir);
    console.log(`✓ Found ${allFiles.length} files extracted`);
    console.log(`📦 Storage Type: ${storageAdapter.getStorageType()}`);

    // Find entry point (index.html, index.htm, or first HTML file)
    let entryPoint = null;
    const fileMetadata = [];

    for (const filePath of allFiles) {
      const relativePath = path.relative(extractDir, filePath).replace(/\\/g, '/');
      const normalizedPath = relativePath.toLowerCase();
      
      const fileStats = fs.statSync(filePath);
      fileMetadata.push({
        path: relativePath,
        fullPath: filePath,
        size: fileStats.size,
        mimeType: getMimeType(filePath)
      });

      // Check for entry point
      if (!entryPoint && (normalizedPath === 'index.html' || normalizedPath === 'index.htm')) {
        entryPoint = relativePath;
        console.log(`✓ Found entry point: ${entryPoint}`);
      }
    }

    // If no index.html found, use first HTML file
    if (!entryPoint) {
      const htmlFile = fileMetadata.find(f => {
        const p = f.path.toLowerCase();
        return p.endsWith('.html') || p.endsWith('.htm');
      });
      if (htmlFile) {
        entryPoint = htmlFile.path;
        console.log(`✓ Using first HTML file as entry point: ${entryPoint}`);
      } else if (fileMetadata.length > 0) {
        entryPoint = fileMetadata[0].path;
        console.log(`✓ Using first file as entry point: ${entryPoint}`);
      }
    }

    // Upload all files using storage adapter (handles both local and Firebase Storage)
    const uploadedFiles = [];
    const baseStoragePath = `games/${siteName}`;
    
    console.log(`📤 Uploading ${fileMetadata.length} files...`);
    
    for (const fileMeta of fileMetadata) {
      try {
        const fileBuffer = fs.readFileSync(fileMeta.fullPath);
        const storagePath = `${baseStoragePath}/${fileMeta.path}`;
        
        // Upload using storage adapter (automatically uses Firebase Storage in production)
        const publicUrl = await storageAdapter.uploadFile(
          fileBuffer,
          storagePath,
          fileMeta.mimeType
        );
        
        uploadedFiles.push({
          path: fileMeta.path,
          storagePath: storagePath,
          url: publicUrl,
          size: fileMeta.size,
          mimeType: fileMeta.mimeType
        });
        
        console.log(`  ✓ ${fileMeta.path} -> ${publicUrl}`);
      } catch (uploadError) {
        console.error(`  ✗ Error uploading ${fileMeta.path}:`, uploadError.message);
        // Continue with other files
      }
    }

    // Generate URLs based on storage type
    let entryPointUrl;
    let gameBaseUrl;
    
    if (storageAdapter.isUsingBlobStorage()) {
      // Firebase Storage - URLs are returned from upload
      const entryPointFile = uploadedFiles.find(f => f.path === entryPoint);
      entryPointUrl = entryPointFile ? entryPointFile.url : uploadedFiles[0]?.url;
      gameBaseUrl = entryPointUrl ? entryPointUrl.substring(0, entryPointUrl.lastIndexOf('/')) : '';
    } else {
      // Local filesystem - generate URLs based on server
      let protocol = req.protocol || 'http';
      let host = req.get('host') || 'localhost:3000';
      
      // Handle X-Forwarded-Proto header (used by Vercel, etc.)
      const forwardedProto = req.get('x-forwarded-proto');
      if (forwardedProto) {
        protocol = forwardedProto;
      }
      
      const baseUrl = `${protocol}://${host}`;
      gameBaseUrl = `${baseUrl}/${baseStoragePath}`;
      entryPointUrl = entryPoint 
        ? `${gameBaseUrl}/${entryPoint}` 
        : gameBaseUrl;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ ZIP FILE PROCESSED SUCCESSFULLY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📁 Site Name: ${siteName}`);
    console.log(`📦 Storage: ${storageAdapter.getStorageType()}`);
    console.log(`📂 Extraction Directory: ${extractDir}`);
    console.log(`📄 Files Extracted: ${uploadedFiles.length}`);
    console.log(`🎮 Entry Point: ${entryPoint || 'N/A'}`);
    console.log(`🌐 Base URL: ${gameBaseUrl}`);
    console.log(`🔗 Playable URL: ${entryPointUrl}`);
    console.log(`${'='.repeat(60)}\n`);

    // If gameId is provided, update the game document
    if (req.body.gameId) {
      try {
        const gameRef = db.collection("games").doc(req.body.gameId);
        const gameDoc = await gameRef.get();

        if (gameDoc.exists) {
          const gameData = gameDoc.data();
          const updateData = {
            updatedAt: new Date(),
            websiteBasePath: baseStoragePath,
            websiteBaseUrl: gameBaseUrl,
            websiteEntryPoint: entryPoint,
            websiteStorageType: storageAdapter.getStorageType(),
            // Only store local path in development
            ...(storageAdapter.isUsingBlobStorage() ? {} : { websiteLocalPath: extractDir }),
          };

          // Set demoUrl if not already set
          if (!gameData.demoUrl || gameData.demoUrl.trim() === '') {
            updateData.demoUrl = entryPointUrl;
            console.log(`✓ Updated demoUrl for game ${req.body.gameId}: ${entryPointUrl}`);
          }

          // Set downloadUrl if not already set
          if (!gameData.downloadUrl || gameData.downloadUrl.trim() === '') {
            updateData.downloadUrl = entryPointUrl;
            console.log(`✓ Updated downloadUrl for game ${req.body.gameId}: ${entryPointUrl}`);
          }

          updateData.websiteEntryPointUrl = entryPointUrl;

          await gameRef.update(updateData);
          console.log(`✓ Updated game document in Firestore`);
        } else {
          console.warn(`⚠ Game ${req.body.gameId} not found in Firestore, skipping auto-update`);
        }
      } catch (updateError) {
        console.error('✗ Error updating game document:', updateError);
        // Don't fail the upload if game update fails
      }
    }

    // Clean up temporary files
    try {
      // Always clean up temp zip file
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
        console.log('✓ Cleaned up temporary zip file');
      }
      
      // In production with Firebase Storage, also clean up extracted files
      // (they're already uploaded to Firebase Storage)
      if (storageAdapter.isUsingBlobStorage() && extractDir && fs.existsSync(extractDir)) {
        if (fs.rmSync) {
          fs.rmSync(extractDir, { recursive: true, force: true });
          console.log('✓ Cleaned up temporary extraction directory (files in Firebase Storage)');
        } else {
          const deleteDir = (dir) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach((file) => {
                const curPath = path.join(dir, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  deleteDir(curPath);
                } else {
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(dir);
            }
          };
          deleteDir(extractDir);
          console.log('✓ Cleaned up temporary extraction directory (files in Firebase Storage)');
        }
      }
      // In development, keep extracted files in public/games/ for serving
    } catch (cleanupError) {
      console.error('✗ Error cleaning up temporary files:', cleanupError);
    }

    res.status(200).json({
      success: true,
      message: `Zip file extracted and stored using ${storageAdapter.getStorageType()}. Files are now accessible.`,
      siteName: siteName,
      storageType: storageAdapter.getStorageType(),
      ...(storageAdapter.isUsingBlobStorage() ? {} : { localPath: extractDir }),
      basePath: baseStoragePath,
      baseUrl: gameBaseUrl,
      entryPoint: entryPoint || (uploadedFiles.length > 0 ? uploadedFiles[0].path : null),
      entryPointUrl: entryPointUrl,
      playUrl: entryPointUrl,
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        path: f.path,
        storagePath: f.storagePath,
        url: f.url,
        size: f.size,
        mimeType: f.mimeType
      })),
      totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
      usage: {
        playUrl: entryPointUrl,
        description: "Use entryPointUrl or playUrl in an iframe or open in new tab. All assets (CSS, JS, images) will load automatically via relative paths.",
        example: `<iframe src="${entryPointUrl}" width="100%" height="600px"></iframe>`,
        note: storageAdapter.isUsingBlobStorage() 
          ? "Files are stored in Firebase Storage and served via CDN."
          : "Files are served from the /games/ directory via Express static middleware."
      }
    });

  } catch (error) {
    console.error("✗ Error handling game zip upload:", error);

    // Clean up on error
    try {
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
      if (extractDir && fs.existsSync(extractDir)) {
        if (fs.rmSync) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        } else {
          const deleteDir = (dir) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach((file) => {
                const curPath = path.join(dir, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  deleteDir(curPath);
                } else {
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(dir);
            }
          };
          deleteDir(extractDir);
        }
      }
    } catch (cleanupError) {
      console.error('✗ Error cleaning up after error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error extracting and storing zip file locally",
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Zip file upload handler - extracts and uploads as website (original Firebase Storage version)
export const uploadGameZip = async (req, res) => {
  let tempZipPath = null;
  let extractDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No zip file uploaded",
      });
    }

    // Validate the file object and buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid zip file data",
      });
    }

    // Log file details
    console.log("Game zip upload:", {
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      mimeType: req.file.mimetype,
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

    // Create temporary directory for extraction
    const tempBaseDir = os.tmpdir();
    const gameId = req.body.gameId || uuidv4();
    const siteName = `game_${gameId}_${Date.now()}`;
    extractDir = path.join(tempBaseDir, siteName);
    
    // Create extraction directory
    fs.mkdirSync(extractDir, { recursive: true });

    // Save zip file temporarily
    tempZipPath = path.join(tempBaseDir, `${siteName}.zip`);
    fs.writeFileSync(tempZipPath, req.file.buffer);

    console.log(`Extracting zip file to: ${extractDir}`);

    // Extract zip file
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempZipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', () => {
          console.log('Zip extraction completed');
          resolve();
        })
        .on('error', (error) => {
          console.error('Error extracting zip:', error);
          reject(error);
        });
    });

    // Get all extracted files
    const allFiles = getAllFiles(extractDir);
    console.log(`Found ${allFiles.length} files to upload`);

    // Base path in Firebase Storage - this forms the root directory for the unzipped website
    const baseStoragePath = `${STORAGE_PATHS.GAMES.WEBSITES}${siteName}/`;
    console.log(`Base storage path for website: ${baseStoragePath}`);
    
    // Upload all files maintaining directory structure
    // This ensures relative paths (./css/style.css, ./js/game.js, etc.) work correctly
    const uploadedFiles = [];
    let entryPoint = null;

    for (const filePath of allFiles) {
      // Get relative path from extract directory - this preserves the directory structure
      // Replace backslashes with forward slashes for cross-platform compatibility
      const relativePath = path.relative(extractDir, filePath).replace(/\\/g, '/');
      
      // Construct storage path maintaining directory structure
      // Example: gametribe/games/websites/game_123/css/style.css
      const storagePath = `${baseStoragePath}${relativePath}`;

      // Read file content
      const fileContent = fs.readFileSync(filePath);
      
      // Get MIME type for proper content-type headers
      const mimeType = getMimeType(filePath);

      // Upload to Firebase Storage maintaining directory structure
      try {
        await storage.uploadFromBuffer(fileContent, storagePath, mimeType);
        
        // Make file publicly accessible so it can be used in gametribe-client
        // This is crucial for relative paths to work - all files must be public
        try {
          await storage.getPublicUrl(storagePath);
          console.log(`✓ Uploaded and made public: ${relativePath} (${(fileContent.length / 1024).toFixed(2)} KB)`);
        } catch (publicError) {
          console.warn(`⚠ Warning: Could not make file public ${relativePath}:`, publicError.message);
          // Continue even if making public fails - try to upload remaining files
        }
        
        uploadedFiles.push({
          path: relativePath, // e.g., "index.html", "css/style.css", "js/game.js"
          storagePath: storagePath, // Full storage path
          size: fileContent.length,
          mimeType: mimeType
        });

        // Check for entry point (index.html, index.htm) - this is the main playable file
        // Entry point should be at root level for proper URL structure
        const normalizedPath = relativePath.toLowerCase();
        if (!entryPoint && (normalizedPath === 'index.html' || normalizedPath === 'index.htm')) {
          entryPoint = relativePath;
          console.log(`✓ Found entry point: ${entryPoint}`);
        }
      } catch (uploadError) {
        console.error(`✗ Error uploading file ${relativePath}:`, uploadError);
        // Continue with other files even if one fails
      }
    }

    // If no index.html found, use first HTML file or first file
    if (!entryPoint) {
      const htmlFile = uploadedFiles.find(f => {
        const path = f.path.toLowerCase();
        return path.endsWith('.html') || path.endsWith('.htm');
      });
      if (htmlFile) {
        entryPoint = htmlFile.path;
        console.log(`✓ Using first HTML file as entry point: ${entryPoint}`);
      } else if (uploadedFiles.length > 0) {
        entryPoint = uploadedFiles[0].path;
        console.log(`✓ Using first file as entry point: ${entryPoint}`);
      }
    }

    // Get public URL for the entry point file (this is the main playable URL)
    // This URL will be used in gametribe-client to play the game
    // All relative paths in the HTML (./css/style.css, ./js/game.js) will resolve
    // relative to this URL's directory
    let entryPointUrl;
    if (entryPoint) {
      const entryPointStoragePath = `${baseStoragePath}${entryPoint}`;
      entryPointUrl = await storage.getPublicUrl(entryPointStoragePath);
      console.log(`✓ Entry point URL (playable): ${entryPointUrl}`);
      console.log(`  - This URL loads the game and all relative assets`);
      console.log(`  - Relative paths resolve from: ${baseStoragePath}`);
    } else {
      // If no entry point found, use first file or base URL
      if (uploadedFiles.length > 0) {
        entryPointUrl = await storage.getPublicUrl(uploadedFiles[0].storagePath);
        console.log(`✓ Using first uploaded file as entry point: ${entryPointUrl}`);
      } else {
        // Fallback: construct base URL (though this won't work for directories)
        entryPointUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${baseStoragePath}`;
        console.warn(`⚠ No files uploaded, using base URL: ${entryPointUrl}`);
      }
    }
    
    // Base URL for the website directory (for reference)
    // This is the root directory where all files are stored
    const baseUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${baseStoragePath}`;
    console.log(`✓ Website base URL: ${baseUrl}`);

    // If gameId is provided, update the game document with demoUrl and downloadUrl
    if (req.body.gameId) {
      try {
        const gameRef = db.collection("games").doc(req.body.gameId);
        const gameDoc = await gameRef.get();

        if (gameDoc.exists) {
          const gameData = gameDoc.data();
          const updateData = {
            updatedAt: new Date(),
            // Store website info
            websiteBasePath: baseStoragePath,
            websiteBaseUrl: baseUrl,
            websiteEntryPoint: entryPoint,
          };

          // Set demoUrl if not already set
          if (!gameData.demoUrl || gameData.demoUrl.trim() === '') {
            updateData.demoUrl = entryPointUrl;
            console.log(`Setting demoUrl for game ${req.body.gameId}: ${entryPointUrl}`);
          }

          // Set downloadUrl if not already set (use entryPointUrl for web games)
          if (!gameData.downloadUrl || gameData.downloadUrl.trim() === '') {
            updateData.downloadUrl = entryPointUrl;
            console.log(`Setting downloadUrl for game ${req.body.gameId}: ${entryPointUrl}`);
          }

          // Store website entry point URL for reference
          updateData.websiteEntryPointUrl = entryPointUrl;

          await gameRef.update(updateData);
          console.log(`Updated game ${req.body.gameId} with website URLs`);
        } else {
          console.warn(`Game ${req.body.gameId} not found, skipping auto-update`);
        }
      } catch (updateError) {
        console.error('Error updating game document:', updateError);
        // Don't fail the upload if game update fails
      }
    }

    // Clean up temporary files
    try {
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
      if (extractDir && fs.existsSync(extractDir)) {
        // Use rmSync if available (Node 14.14+), otherwise use rmdirSync recursively
        if (fs.rmSync) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        } else {
          // Fallback for older Node versions
          const deleteDir = (dir) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach((file) => {
                const curPath = path.join(dir, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  deleteDir(curPath);
                } else {
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(dir);
            }
          };
          deleteDir(extractDir);
        }
      }
      console.log('Temporary files cleaned up');
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    console.log(`\n✅ Successfully processed zip file for game website: ${siteName}`);
    console.log(`   - Uploaded ${uploadedFiles.length} files`);
    console.log(`   - Entry point: ${entryPoint || 'N/A'}`);
    console.log(`   - Playable URL: ${entryPointUrl}`);
    console.log(`   - All files are publicly accessible and maintain directory structure`);
    console.log(`   - Relative paths (./css/, ./js/, etc.) will work correctly\n`);

    res.status(200).json({
      success: true,
      message: "Zip file uploaded, extracted, and all files are publicly accessible. The game is ready to play.",
      siteName: siteName,
      basePath: baseStoragePath, // Storage path: gametribe/games/websites/game_123/
      baseUrl: baseUrl, // Base URL for the website directory
      entryPoint: entryPoint || (uploadedFiles.length > 0 ? uploadedFiles[0].path : null), // e.g., "index.html"
      entryPointUrl: entryPointUrl, // Main playable URL - USE THIS IN GAMETRIBE-CLIENT
      playUrl: entryPointUrl, // Alias for clarity
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        path: f.path, // Relative path: "index.html", "css/style.css", etc.
        storagePath: f.storagePath, // Full storage path
        url: `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${f.storagePath}`, // Direct access URL
        size: f.size,
        mimeType: f.mimeType
      })),
      totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
      // Directory structure information
      directoryStructure: {
        root: baseStoragePath,
        entryPoint: entryPoint,
        description: "All files maintain their directory structure. Relative paths in HTML files will resolve correctly."
      },
      // Instructions for using in gametribe-client
      usage: {
        playUrl: entryPointUrl,
        description: "Use entryPointUrl or playUrl in an iframe or open in new tab. All assets (CSS, JS, images) will load automatically via relative paths.",
        example: `<iframe src="${entryPointUrl}" width="100%" height="600px"></iframe>`,
        note: "The URL points to the entry point file. All relative paths (./css/, ./js/, ./images/) resolve from the baseStoragePath directory."
      }
    });

  } catch (error) {
    console.error("Error handling game zip upload:", error);

    // Clean up temporary files on error
    try {
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
      if (extractDir && fs.existsSync(extractDir)) {
        // Use rmSync if available (Node 14.14+), otherwise use rmdirSync recursively
        if (fs.rmSync) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        } else {
          // Fallback for older Node versions
          const deleteDir = (dir) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach((file) => {
                const curPath = path.join(dir, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  deleteDir(curPath);
                } else {
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(dir);
            }
          };
          deleteDir(extractDir);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files after error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error uploading and extracting game zip file",
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};
