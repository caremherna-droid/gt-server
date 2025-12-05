/**
 * Storage Adapter for Zip File Extraction
 * 
 * Handles storage differently based on environment:
 * - Development: Local filesystem (public/games/)
 * - Production: Firebase Storage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import storage from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Upload a file to storage (local or Firebase Storage)
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} filePath - Relative path for the file (e.g., "games/game_123/index.html")
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL to access the file
 */
export const uploadFile = async (fileBuffer, filePath, contentType = 'application/octet-stream') => {
  if (isProduction) {
    // Use Firebase Storage in production
    return await uploadToFirebaseStorage(fileBuffer, filePath, contentType);
  } else {
    // Use local filesystem in development
    return await uploadToLocal(fileBuffer, filePath, contentType);
  }
};

/**
 * Upload file to Firebase Storage
 */
const uploadToFirebaseStorage = async (fileBuffer, filePath, contentType) => {
  try {
    // Use the existing Firebase storage helper
    await storage.uploadFromBuffer(fileBuffer, filePath, contentType);
    
    // Get public URL
    const publicUrl = await storage.getPublicUrl(filePath);
    
    console.log(`✓ Uploaded to Firebase Storage: ${filePath}`);
    return publicUrl;
  } catch (error) {
    console.error(`✗ Error uploading to Firebase Storage ${filePath}:`, error);
    throw error;
  }
};

/**
 * Upload file to local filesystem
 */
const uploadToLocal = async (fileBuffer, filePath, contentType) => {
  const fullPath = path.join(__dirname, '..', 'public', filePath);
  const dir = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(fullPath, fileBuffer);
  
  // Generate URL (will be served via Express static middleware)
  const protocol = process.env.PROTOCOL || 'http';
  const host = process.env.HOST || 'localhost:3000';
  const url = `${protocol}://${host}/${filePath}`;
  
  console.log(`✓ Uploaded to local storage: ${filePath}`);
  return url;
};

/**
 * Get public URL for a file (without uploading)
 * Useful for generating URLs for already-uploaded files
 */
export const getPublicUrl = (filePath) => {
  if (isProduction) {
    // In production with Firebase Storage, generate public URL
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    return `https://storage.googleapis.com/${bucketName}/${filePath}`;
  } else {
    // Local development URL
    const protocol = process.env.PROTOCOL || 'http';
    const host = process.env.HOST || 'localhost:3000';
    return `${protocol}://${host}/${filePath}`;
  }
};

/**
 * Check if using cloud storage (Firebase Storage)
 */
export const isUsingBlobStorage = () => {
  return isProduction;
};

/**
 * Get storage type description
 */
export const getStorageType = () => {
  if (isProduction) {
    return 'Firebase Storage';
  } else {
    return 'Local Filesystem';
  }
};

export default {
  uploadFile,
  getPublicUrl,
  isUsingBlobStorage,
  getStorageType,
};


