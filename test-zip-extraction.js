/**
 * Test script for local zip file extraction endpoint
 * 
 * Usage:
 * node test-zip-extraction.js <path-to-zip-file>
 * 
 * Example:
 * node test-zip-extraction.js "Dicee Challenge.zip"
 */

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get zip file path from command line arguments
const zipFilePath = process.argv[2];

if (!zipFilePath) {
  console.error('❌ Please provide a zip file path');
  console.log('Usage: node test-zip-extraction.js <path-to-zip-file>');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(zipFilePath)) {
  console.error(`❌ File not found: ${zipFilePath}`);
  process.exit(1);
}

// Check if it's a zip file
const fileExt = path.extname(zipFilePath).toLowerCase();
if (fileExt !== '.zip') {
  console.warn(`⚠️  Warning: File extension is "${fileExt}", expected ".zip"`);
}

const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
const endpoint = `${serverUrl}/api/upload/game-zip-local`;

console.log('🚀 Testing Zip Extraction Endpoint');
console.log('=' .repeat(60));
console.log(`📁 Zip File: ${zipFilePath}`);
console.log(`🌐 Endpoint: ${endpoint}`);
console.log('=' .repeat(60));
console.log('');

// Create FormData
const formData = new FormData();
formData.append('zipfile', fs.createReadStream(zipFilePath));

// Optional: Add gameId if you want to test with a game ID
// formData.append('gameId', 'test-game-id');

try {
  console.log('📤 Uploading zip file...');
  
  const response = await axios.post(endpoint, formData, {
    headers: {
      ...formData.getHeaders(),
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 600000, // 10 minutes
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      process.stdout.write(`\r📊 Upload Progress: ${percentCompleted}%`);
    },
  });

  console.log('\n');
  console.log('✅ SUCCESS!');
  console.log('=' .repeat(60));
  console.log('📋 Response Data:');
  console.log(JSON.stringify(response.data, null, 2));
  console.log('=' .repeat(60));
  console.log('');
  
  if (response.data.entryPointUrl) {
    console.log('🔗 Entry Point URL:', response.data.entryPointUrl);
    console.log('🌐 Base URL:', response.data.baseUrl);
    console.log('📄 Files Extracted:', response.data.fileCount);
    console.log('');
    console.log('✨ You can now access your game at:');
    console.log(`   ${response.data.entryPointUrl}`);
  }
  
} catch (error) {
  console.log('\n');
  console.error('❌ ERROR:', error.message);
  
  if (error.response) {
    console.error('📋 Server Response:', JSON.stringify(error.response.data, null, 2));
    console.error('📊 Status Code:', error.response.status);
  }
  
  if (error.request) {
    console.error('⚠️  No response received from server');
    console.error('   Make sure the server is running at:', serverUrl);
  }
  
  process.exit(1);
}


