import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import gameRoutes from "./routes/tribeRoutes/gameRoutes.js";
import heroRoutes from "./routes/tribeRoutes/heroRoutes.js";
import newsRoutes from "./routes/tribeRoutes/newsRoutes.js";
import categoryRoutes from "./routes/tribeRoutes/categoryRoutes.js";
import uploadRoutes from "./routes/tribeRoutes/uploadRoutes.js";
import platformRoutes from "./routes/tribeRoutes/platformRoutes.js";
import faqRoutes from "./routes/tribeRoutes/faqRoutes.js";
import supportRoutes from "./routes/tribeRoutes/supportRoutes.js";
import downloadRoutes from "./routes/tribeRoutes/downloadRoutes.js";
import commentRoutes from "./routes/tribeRoutes/commentRoutes.js";
import ratingRoutes from "./routes/tribeRoutes/ratingRoutes.js";
import favoritesRoutes from "./routes/tribeRoutes/favoritesRoutes.js";
import contestRoutes from "./routes/contestRoutes/index.js";
import * as downloadController from "./controllers/tribeControllers/downloadController.js";
import * as uploadController from "./controllers/tribeControllers/uploadController.js";
import authRoutes from "./routes/tribeRoutes/authRoutes.js";
import userRoutes from "./routes/tribeRoutes/userRoutes.js";
import { handleMulterError } from "./config/multerConfig.js";
import { db } from "./config/firebase.js";
import newsletterRoutes from "./routes/tribeRoutes/newsletterRoutes.js";
import specialCategoryRoutes from "./routes/tribeRoutes/specialCategoryRoutes.js";
import analyticsRoutes from "./routes/tribeRoutes/analyticsRoutes.js";
import userRetentionRoutes from "./routes/tribeRoutes/userRetentionRoutes.js";
import gamificationRoutes from "./routes/tribeRoutes/gamificationRoutes.js";
import { initializeNewsletterScheduler } from "./services/newsletterScheduler.js";
// import { upload } from "./controllers/tribeControllers/uploadController.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.development" });
}

const app = express();

// Update the existing CORS configuration for better SSO support
const isProd = process.env.NODE_ENV === "production";
const corsOptions = {
  origin: function (origin, callback) {
    // Define allowed origins for both environments
    const allowedOrigins = isProd
      ? [
          // Main platform URLs
          "hhttps://gt-server-eta.vercel.app",
          "https://gametribe.com",
          // Community platform URLs
          "https://gametribe-backend.onrender.com",
          "https://hub.gametribe.com",
          // Other GameTribe domains
          "https://contest.gametribe.com",
          "https://gt-contest-admin.web.app",
          "https://gt-admin-dash.web.app",
          "https://gametribe.co.ke",
        ]
      : [
          // Development URLs
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          "http://localhost:5176",
          "http://localhost:5177",
          "http://localhost:5000",
          // Also include production URLs for development testing
          "https://gt-server-mu.vercel.app",
          "https://gametribe.com",
          "https://gametribe-backend.onrender.com",
          "https://hub.gametribe.com",
          "https://contest.gametribe.com",
          "https://gt-contest-admin.web.app",
          "https://gt-admin-dash.web.app",
          "https://gametribe.co.ke",
        ];

    // Log only in non-production to reduce noise and avoid leaking info
    if (!isProd) {
      console.log("NODE_ENV:", process.env.NODE_ENV);
      console.log("Request origin:", origin);
      console.log("Allowed origins:", allowedOrigins);
    }

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-SSO-Token",
    "X-Community-Token",
  ],
  exposedHeaders: ["X-SSO-Token", "X-Community-Token"],
};

app.use(cors(corsOptions));

// Cookie parser middleware - MUST be before routes
app.use(cookieParser());

// Add this after your CORS middleware
app.use((req, res, next) => {
  // Extract SSO token from custom header or query param if present
  const ssoToken = req.headers["x-sso-token"] || req.query.sso_token;
  if (ssoToken) {
    // Set it as a Bearer token in the Authorization header for middleware compatibility
    req.headers.authorization = `Bearer ${ssoToken}`;
  }
  next();
});

// Fix double slash in URL
app.use((req, res, next) => {
  if (req.url.startsWith("//")) {
    req.url = req.url.replace("//", "/");
  }
  next();
});

// Create public/games directory if it doesn't exist (for local zip extraction)
const publicGamesDir = path.join(__dirname, "public", "games");
if (!fs.existsSync(publicGamesDir)) {
  fs.mkdirSync(publicGamesDir, { recursive: true });
  console.log(`Created public/games directory: ${publicGamesDir}`);
}

// Serve static files from public/games directory
// This allows extracted zip files to be accessed via /games/ URL path
app.use("/games", express.static(path.join(__dirname, "public", "games"), {
  maxAge: "1y", // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper MIME types for common file types
    const ext = path.extname(filePath).toLowerCase();
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
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

console.log(`Static file serving enabled at /games/ -> ${publicGamesDir}`);

// middlewares
app.use(express.json({ limit: "250mb" }));
app.use(express.urlencoded({ limit: "250mb", extended: true }));

// Add this middleware to handle oversized payloads
app.use((err, req, res, next) => {
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "File too large",
      message:
        "The uploaded file exceeds the size limit. Maximum size is 250MB.",
    });
  }
  next(err);
});

// gametribe routes
app.use("/api/games", gameRoutes);
app.use("/api/hero", heroRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/platforms", platformRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/favorites", favoritesRoutes);
app.get("/api/download-file/:gameId", downloadController.downloadFile);
app.use("/api/auth", authRoutes);
app.use("/api/profile", userRoutes);

// contest routes
app.use("/api/contests", contestRoutes.contests);
app.use("/api/winners", contestRoutes.winners);
app.use("/api/submissions", contestRoutes.submissions);
app.use("/api/activity", contestRoutes.activity);
app.use("/api/settings", contestRoutes.settings);
app.use("/api/stats", contestRoutes.stats);
app.use("/api/users", contestRoutes.users);
// Namespace contest categories to avoid collision with tribe categories
app.use("/api/contest/categories", contestRoutes.categories);

// Add newsletter routes after other gametribe routes
app.use("/api/newsletter", newsletterRoutes);

// Add special categories routes
app.use("/api/special-categories", specialCategoryRoutes);

// Add analytics routes
app.use("/api/analytics", analyticsRoutes);

// Add user retention routes
app.use("/api/retention", userRetentionRoutes);

// Add gamification routes
app.use("/api/gamification", gamificationRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "gametribe-and-contest-api",
    environment: process.env.NODE_ENV || "development",
  });
});

// Firebase connectivity test endpoint
app.get("/api/test-firebase", async (req, res) => {
  try {
    const { db } = await import("./config/firebase.js");
    const storage = await import("./config/storage.js");

    // Test Firestore connection
    await db.collection("test").limit(1).get();

    // Test Storage bucket access
    await storage.default.bucket.getMetadata();

    res.status(200).json({
      status: "ok",
      firebase: {
        firestore: "connected",
        storage: "connected",
        bucket: process.env.FIREBASE_STORAGE_BUCKET,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Firebase test failed:", error);
    res.status(500).json({
      status: "error",
      firebase: {
        error: error.message,
        code: error.code,
        details: error.details || "Firebase connection test failed",
      },
      troubleshooting: {
        checkNetwork: "Verify internet connection to Firebase services",
        checkCredentials: "Verify FIREBASE_* environment variables are set",
        checkServiceAccount:
          "Verify Firebase service account has proper permissions",
        checkBucket: "Verify FIREBASE_STORAGE_BUCKET is correct",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Make sure handleMulterError is applied
app.use(handleMulterError);

// Add a global error handler as the last middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

// Add a test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Add this near your other route definitions
app.get("/api/check-file/:publicId?", downloadController.checkFileExists);
app.get("/api/test-upload", downloadController.testUpload);

// Make sure the upload route is configured correctly
app.post(
  "/api/upload/game",
  uploadController.uploadGame.single("game"),
  uploadController.uploadGameFile
);

// And add a direct implementation of the download route
app.get("/api/download/:gameId", downloadController.startDownload);

// Add after your existing middleware
app.use(async (req, res, next) => {
  if (req.user) {
    try {
      // Ensure user document exists in Firestore
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      if (!userDoc.exists) {
        await db
          .collection("users")
          .doc(req.user.uid)
          .set({
            email: req.user.email,
            displayName: req.user.email || req.user.displayName,
            emailVerified: req.user.emailVerified,
            photoURL: req.user.photoURL,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error("User document sync error:", error);
    }
  }
  next();
});

// Initialize newsletter scheduler
const initializeNewsletterSchedulerWrapper = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      await initializeNewsletterScheduler();
      console.log("Newsletter scheduler initialized for production");
    } else {
      console.log("Newsletter scheduler skipped in development mode");
    }
  } catch (error) {
    console.error("Failed to initialize newsletter scheduler:", error);
  }
};

// Start main server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(
    `Server is running on port http://localhost:${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode with GameTribe and Contest APIs`
  );

  // Initialize newsletter scheduler after server starts
  await initializeNewsletterSchedulerWrapper();
});

// Export the app for Vercel
export default app;
