import admin from "./firebase.js";

// Initialize Firebase Storage
const storage = admin.storage();
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);

// Helper function to generate signed URLs
export const getSignedUrl = async (filename, expiresIn = 604800) => {
  try {
    const [url] = await bucket.file(filename).getSignedUrl({
      action: "read",
      expires: Date.now() + expiresIn * 1000,
    });
    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};

// Helper function to upload file from buffer
export const uploadFromBuffer = async (buffer, filename, contentType) => {
  try {
    // Check if buffer exists and is valid
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid buffer provided for upload");
    }

    console.log(
      `Starting upload for file: ${filename}, Size: ${buffer.length} bytes`
    );

    // Check if bucket is properly initialized
    if (!bucket) {
      throw new Error("Firebase storage bucket not initialized");
    }

    const file = bucket.file(filename);

    // Add timeout and retry logic
    const uploadOptions = {
      contentType,
      metadata: {
        contentType,
      },
      resumable: buffer.length > 10 * 1024 * 1024, // Use resumable for files > 10MB
      timeout: 60000, // 60 second timeout
    };

    await file.save(buffer, uploadOptions);

    // Verify the file exists after upload
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("File upload failed - file does not exist after upload");
    }

    console.log(`Successfully uploaded file: ${filename}`);
    return file;
  } catch (error) {
    console.error("Error uploading file:", error);

    // Provide more specific error messages
    if (error.code === "ENOTFOUND") {
      throw new Error(
        "Network connection to Google Cloud Storage failed. Please check your internet connection."
      );
    } else if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Connection to Google Cloud Storage was reset. Please try again."
      );
    } else if (error.message.includes("authentication")) {
      throw new Error(
        "Firebase authentication failed. Please check your service account credentials."
      );
    } else if (error.message.includes("permission")) {
      throw new Error(
        "Storage permission denied. Please check your Firebase storage rules."
      );
    }

    throw error;
  }
};

// Helper function to delete file
export const deleteFile = async (filename) => {
  try {
    await bucket.file(filename).delete();
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// Helper function to make file publicly accessible and get a permanent URL
export const getPublicUrl = async (filename) => {
  try {
    const file = bucket.file(filename);

    // Make the file publicly accessible
    await file.makePublic();

    // Get the permanent public URL (no expiration)
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    return publicUrl;
  } catch (error) {
    console.error("Error making file public:", error);
    throw error;
  }
};

export default {
  bucket,
  getSignedUrl,
  getPublicUrl,
  uploadFromBuffer,
  deleteFile,
};
