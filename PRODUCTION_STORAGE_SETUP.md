# Production Storage Setup Guide

## Overview

The zip extraction system automatically adapts to your environment:

- **Development**: Files stored locally in `public/games/`
- **Production (Vercel)**: Files stored in Vercel Blob Storage

## Why This Matters

Vercel serverless functions have **ephemeral filesystems**. Files written during one request won't persist to the next request. That's why we use Vercel Blob Storage in production.

## Setup for Production

### Step 1: Get Vercel Blob Storage Token

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Storage**
3. Create a new Blob Store (or use existing)
4. Copy the **Read/Write Token**

### Step 2: Add Environment Variable

Add the token to your Vercel project environment variables:

**In Vercel Dashboard:**
1. Go to **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Your blob store token
   - **Environment**: Production (and Preview if needed)

**Or via Vercel CLI:**
```bash
vercel env add BLOB_READ_WRITE_TOKEN production
```

### Step 3: Verify Setup

The system will automatically:
- ✅ Detect production environment (`NODE_ENV=production`)
- ✅ Check for `BLOB_READ_WRITE_TOKEN`
- ✅ Use Vercel Blob Storage if both conditions are met
- ✅ Fall back to local storage otherwise

## How It Works

### Development (Local)
```
Upload → Extract to public/games/ → Serve via Express static
URL: http://localhost:3000/games/game_123/index.html
```

### Production (Vercel)
```
Upload → Extract to temp → Upload to Vercel Blob → Serve via CDN
URL: https://[blob-url]/games/game_123/index.html
```

## Storage Adapter

The `storageAdapter.js` handles the complexity:

```javascript
// Automatically chooses storage based on environment
const url = await storageAdapter.uploadFile(buffer, path, mimeType);

// Check storage type
if (storageAdapter.isUsingBlobStorage()) {
  // Using Vercel Blob
} else {
  // Using local filesystem
}
```

## Console Output

### Development
```
📦 Storage Type: Local Filesystem
📂 Extraction Directory: /path/to/public/games/...
```

### Production
```
📦 Storage Type: Vercel Blob Storage
✓ Uploaded to Vercel Blob: games/game_123/index.html
```

## API Response

The API response includes storage information:

```json
{
  "success": true,
  "storageType": "Vercel Blob Storage",
  "entryPointUrl": "https://[blob-url]/games/game_123/index.html",
  "files": [
    {
      "path": "index.html",
      "url": "https://[blob-url]/games/game_123/index.html",
      "storagePath": "games/game_123/index.html"
    }
  ]
}
```

## Troubleshooting

### Issue: Files not persisting in production

**Problem**: Files disappear after upload

**Solution**: 
1. Check `BLOB_READ_WRITE_TOKEN` is set in Vercel
2. Verify `NODE_ENV=production` in production environment
3. Check console logs for storage type

### Issue: Still using local storage in production

**Check**:
1. Is `NODE_ENV` set to `production`?
2. Is `BLOB_READ_WRITE_TOKEN` set?
3. Check server logs: `📦 Storage Type: ...`

### Issue: Vercel Blob upload fails

**Check**:
1. Token is valid and has write permissions
2. Token is set in correct environment (Production)
3. Check Vercel Blob Store limits/quota

## Cost Considerations

### Vercel Blob Storage
- **Free Tier**: 1 GB storage, 100 GB bandwidth/month
- **Paid**: $0.15/GB storage, $0.15/GB bandwidth

### Local Storage (Development)
- Free (uses server disk space)

## Migration Notes

- Files uploaded in development stay in `public/games/`
- Files uploaded in production go to Vercel Blob Storage
- No migration needed - system handles both automatically
- URLs are different but work the same way

## Best Practices

1. **Always set `BLOB_READ_WRITE_TOKEN` in production**
2. **Don't commit extracted game files to git** (already in `.gitignore`)
3. **Monitor Vercel Blob usage** in dashboard
4. **Use local storage for development** (faster, free)
5. **Use Vercel Blob for production** (persistent, CDN-backed)

## Testing Production Locally

To test Vercel Blob locally:

```bash
# Set environment variable
export BLOB_READ_WRITE_TOKEN=your_token_here
export NODE_ENV=production

# Run server
npm start
```

The system will use Vercel Blob Storage even locally when these are set.


