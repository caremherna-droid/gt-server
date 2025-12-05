# Storage Flow Explanation: Development vs Production

## Overview

The zip extraction system works differently in development and production environments, automatically adapting based on `NODE_ENV`.

---

## 🔧 **DEVELOPMENT** (`NODE_ENV !== 'production'`)

### Flow Diagram:
```
User uploads ZIP
    ↓
Extract to: public/games/game_xxx/
    ↓
Files stay on local filesystem
    ↓
URL generated: http://localhost:3000/games/game_xxx/index.html
    ↓
Served via Express static middleware
    ↓
✅ Game plays directly from local files
```

### Step-by-Step Process:

1. **Upload & Extract**
   - ZIP file uploaded via API endpoint
   - Extracted to `public/games/game_xxx/` directory
   - Files remain on local filesystem

2. **Storage Adapter Behavior**
   - `storageAdapter.uploadFile()` saves files locally
   - Returns URL: `http://localhost:3000/games/game_xxx/index.html`
   - Files persist in `public/games/` directory

3. **File Serving**
   - Express static middleware serves files from `/games/` path
   - Configured in `server.js`:
     ```javascript
     app.use("/games", express.static(path.join(__dirname, "public", "games")))
     ```
   - Direct file access via HTTP

4. **URL Generation**
   - Base URL: `http://localhost:3000`
   - Game URL: `http://localhost:3000/games/game_xxx/index.html`
   - All assets (CSS, JS, images) load via relative paths

### ✅ **Advantages:**
- Fast local development
- No cloud storage costs
- Easy debugging (files visible in filesystem)
- No network dependency

### ⚠️ **Limitations:**
- Files only available on local machine
- Not suitable for production (ephemeral filesystems on serverless)

---

## 🚀 **PRODUCTION** (`NODE_ENV === 'production'`)

### Flow Diagram:
```
User uploads ZIP
    ↓
Extract to: temporary directory (os.tmpdir())
    ↓
Upload each file to Firebase Storage
    ↓
Files stored in: Firebase Storage bucket
    ↓
URL generated: https://storage.googleapis.com/[bucket]/games/game_xxx/index.html
    ↓
Temporary files cleaned up
    ↓
✅ Game plays from Firebase Storage CDN
```

### Step-by-Step Process:

1. **Upload & Extract**
   - ZIP file uploaded via API endpoint
   - Extracted to temporary directory (`os.tmpdir()`)
   - Files exist temporarily during processing

2. **Storage Adapter Behavior**
   - `storageAdapter.uploadFile()` uploads each file to Firebase Storage
   - Uses `storage.uploadFromBuffer()` from `config/storage.js`
   - Makes files publicly accessible via `storage.getPublicUrl()`
   - Returns Firebase Storage URL: `https://storage.googleapis.com/[bucket]/games/game_xxx/index.html`

3. **File Serving**
   - Files served from Firebase Storage CDN
   - Public URLs accessible from anywhere
   - Automatic CDN caching and global distribution
   - No Express static middleware needed (Firebase handles serving)

4. **URL Generation**
   - Base URL: `https://storage.googleapis.com/[bucket]`
   - Game URL: `https://storage.googleapis.com/[bucket]/games/game_xxx/index.html`
   - All assets (CSS, JS, images) load via relative paths from Firebase Storage

5. **Cleanup**
   - Temporary extraction directory deleted
   - Temporary ZIP file deleted
   - Only Firebase Storage URLs remain

### ✅ **Advantages:**
- Works on serverless platforms (Vercel, etc.)
- Global CDN distribution
- Scalable and reliable
- Files persist permanently
- No local storage limitations

### ⚠️ **Requirements:**
- Firebase Storage bucket configured
- `FIREBASE_STORAGE_BUCKET` environment variable set
- Firebase Admin SDK credentials configured

---

## 🔄 **How It Works Together**

### Code Flow:

```javascript
// In uploadController.js
const publicUrl = await storageAdapter.uploadFile(
  fileBuffer,
  storagePath,
  fileMeta.mimeType
);
```

**Development:**
- `storageAdapter.uploadFile()` → saves to `public/games/...`
- Returns: `http://localhost:3000/games/...`

**Production:**
- `storageAdapter.uploadFile()` → uploads to Firebase Storage
- Returns: `https://storage.googleapis.com/[bucket]/games/...`

### URL Detection:

```javascript
if (storageAdapter.isUsingBlobStorage()) {
  // Production: Use URLs returned from Firebase Storage upload
  entryPointUrl = uploadedFiles.find(f => f.path === entryPoint)?.url;
} else {
  // Development: Generate URLs based on server host
  entryPointUrl = `${baseUrl}/${baseStoragePath}/${entryPoint}`;
}
```

---

## 📋 **Key Differences Summary**

| Aspect | Development | Production |
|--------|------------|------------|
| **Storage** | Local filesystem (`public/games/`) | Firebase Storage |
| **File Location** | `public/games/game_xxx/` | Firebase Storage bucket |
| **URL Format** | `http://localhost:3000/games/...` | `https://storage.googleapis.com/...` |
| **File Serving** | Express static middleware | Firebase Storage CDN |
| **Persistence** | Files stay on disk | Files in cloud storage |
| **Cleanup** | Files kept for serving | Temporary files deleted |
| **Access** | Localhost only | Global via CDN |

---

## ✅ **Verification Checklist**

### Development:
- [ ] Files appear in `public/games/` directory
- [ ] URLs start with `http://localhost:3000`
- [ ] Games play directly from local files
- [ ] No Firebase Storage uploads occur

### Production:
- [ ] Files uploaded to Firebase Storage
- [ ] URLs start with `https://storage.googleapis.com`
- [ ] Temporary files cleaned up
- [ ] Games play from Firebase Storage CDN
- [ ] `FIREBASE_STORAGE_BUCKET` environment variable set

---

## 🎯 **Important Notes**

1. **Relative Paths Work**: Games with relative paths (e.g., `./images/logo.png`) work in both environments because:
   - Development: Relative to `public/games/game_xxx/`
   - Production: Relative to Firebase Storage path `games/game_xxx/`

2. **Entry Point Detection**: The system automatically finds `index.html` or the first HTML file as the entry point.

3. **File Permissions**: In production, Firebase Storage files are made publicly accessible via `file.makePublic()`.

4. **Environment Detection**: The system uses `process.env.NODE_ENV` to determine which storage method to use.

---

## 🐛 **Troubleshooting**

### Development Issues:
- **Files not serving**: Check Express static middleware is configured
- **404 errors**: Verify files exist in `public/games/` directory
- **Wrong URLs**: Check `HOST` and `PROTOCOL` environment variables

### Production Issues:
- **Upload failures**: Verify Firebase credentials and bucket name
- **403 errors**: Check Firebase Storage rules allow public access
- **Missing files**: Ensure `FIREBASE_STORAGE_BUCKET` is set correctly

