# Local Zip File Extraction & Static Hosting

## Overview

This feature allows you to upload zip files (typically website zip files) that get extracted and stored locally on the server. The extracted files are then served via Express static middleware, making them accessible via URLs without using Firebase Storage.

## How It Works

1. **Upload**: A zip file is uploaded via the API endpoint
2. **Extraction**: The zip file is extracted to `public/games/{gameId}_{timestamp}/`
3. **Storage**: Files are stored locally (not in Firebase Storage)
4. **Serving**: Files are served via Express static middleware at `/games/` path
5. **URL Generation**: URLs are automatically generated based on your server URL

## API Endpoint

### Upload Zip File (Local Storage)

```http
POST /api/upload/game-zip-local
Content-Type: multipart/form-data

Form Data:
- zipfile: (file) The zip file to upload
- gameId: (optional) Game ID to associate with the upload
```

### Example Request

```bash
curl -X POST http://localhost:3000/api/upload/game-zip-local \
  -F "zipfile=@game.zip" \
  -F "gameId=abc123"
```

### Response

```json
{
  "success": true,
  "message": "Zip file extracted and stored locally. Files are now accessible via static hosting.",
  "siteName": "game_abc123_1704067200000",
  "localPath": "/path/to/public/games/game_abc123_1704067200000",
  "basePath": "games/game_abc123_1704067200000",
  "baseUrl": "http://localhost:3000/games/game_abc123_1704067200000",
  "entryPoint": "index.html",
  "entryPointUrl": "http://localhost:3000/games/game_abc123_1704067200000/index.html",
  "playUrl": "http://localhost:3000/games/game_abc123_1704067200000/index.html",
  "fileCount": 15,
  "files": [
    {
      "path": "index.html",
      "url": "http://localhost:3000/games/game_abc123_1704067200000/index.html",
      "size": 1024,
      "mimeType": "text/html"
    },
    {
      "path": "css/style.css",
      "url": "http://localhost:3000/games/game_abc123_1704067200000/css/style.css",
      "size": 2048,
      "mimeType": "text/css"
    }
  ],
  "totalSize": 15360,
  "usage": {
    "playUrl": "http://localhost:3000/games/game_abc123_1704067200000/index.html",
    "description": "Use entryPointUrl or playUrl in an iframe or open in new tab. All assets (CSS, JS, images) will load automatically via relative paths.",
    "example": "<iframe src=\"http://localhost:3000/games/game_abc123_1704067200000/index.html\" width=\"100%\" height=\"600px\"></iframe>",
    "note": "Files are served from the /games/ directory via Express static middleware."
  }
}
```

## Console Output

When a zip file is uploaded, you'll see detailed console output:

```
============================================================
✅ ZIP FILE PROCESSED SUCCESSFULLY
============================================================
📁 Site Name: game_abc123_1704067200000
📂 Local Directory: /path/to/public/games/game_abc123_1704067200000
📄 Files Extracted: 15
🎮 Entry Point: index.html
🌐 Base URL: http://localhost:3000/games/game_abc123_1704067200000
🔗 Playable URL: http://localhost:3000/games/game_abc123_1704067200000/index.html
============================================================
```

## File Structure

After extraction, files are stored in:

```
gt-server/
  public/
    games/
      game_{gameId}_{timestamp}/
        index.html
        css/
          style.css
        js/
          game.js
        images/
          logo.png
        ...
```

## URL Structure

- **Base URL**: `http://your-server.com/games/{siteName}/`
- **Entry Point URL**: `http://your-server.com/games/{siteName}/index.html`
- **Asset URLs**: `http://your-server.com/games/{siteName}/css/style.css`

## Features

- ✅ Extracts zip files to local directory
- ✅ Maintains directory structure
- ✅ Automatically finds entry point (index.html)
- ✅ Serves files via Express static middleware
- ✅ Generates accessible URLs
- ✅ Updates game document in Firestore (if gameId provided)
- ✅ Works with Vercel hosting
- ✅ Proper MIME type handling
- ✅ Caching headers for performance

## Usage in Frontend

### Using in an iframe

```jsx
<iframe 
  src={game.entryPointUrl} 
  width="100%" 
  height="600px"
  title="Game"
/>
```

### Opening in new tab

```jsx
window.open(game.entryPointUrl, '_blank');
```

## Vercel Deployment

The `vercel.json` configuration includes routes for serving static files:

```json
{
  "routes": [
    {
      "src": "/games/(.*)",
      "dest": "/games/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ]
}
```

## Notes

- Files are stored permanently in `public/games/` directory
- The directory structure is preserved from the zip file
- Relative paths in HTML files work correctly
- All files are publicly accessible via the `/games/` URL path
- Maximum file size: 500MB (configurable in multerConfig.js)
- The original zip file is deleted after extraction
- Extracted files remain on the server

## Differences from Firebase Storage Version

| Feature | Local Storage | Firebase Storage |
|---------|--------------|------------------|
| Storage Location | `public/games/` | Firebase Storage Bucket |
| URL Format | `http://server.com/games/...` | `https://storage.googleapis.com/...` |
| Cost | Free (server storage) | Firebase Storage costs |
| Persistence | Files persist on server | Files persist in cloud |
| Access | Via Express static | Via Firebase Storage URLs |

## Troubleshooting

### Files not accessible

1. Check that `public/games/` directory exists
2. Verify Express static middleware is configured
3. Check file permissions
4. Ensure the server has write access to `public/games/`

### Entry point not found

- The system looks for `index.html` or `index.htm` first
- If not found, uses the first HTML file
- If no HTML files, uses the first file in the zip

### URL generation issues

- In production, ensure `req.get('host')` returns the correct host
- Check that the protocol (`http` vs `https`) is correct
- Verify CORS settings allow access to `/games/` path


