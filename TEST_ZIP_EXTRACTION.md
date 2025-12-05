# Testing Zip Extraction Endpoint

## Quick Test Using cURL

You can test the zip extraction endpoint directly using cURL:

```bash
curl -X POST http://localhost:3000/api/upload/game-zip-local \
  -F "zipfile=@path/to/your/file.zip" \
  -F "gameId=optional-game-id"
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/upload/game-zip-local \
  -F "zipfile=@Dicee Challenge.zip"
```

## Expected Console Output

When you upload a zip file, you should see output like this in your server console:

```
Game zip upload (Local Storage): {
  fileName: 'Dicee Challenge.zip',
  fileSize: '0.02 MB',
  mimeType: 'application/x-zip-compressed'
}
Created directory: /path/to/gt-server/public/games
Created extraction directory: /path/to/public/games/game_abc123_1704067200000
Saved zip file temporarily: /tmp/game_abc123_1704067200000.zip
Extracting zip file to: /path/to/public/games/game_abc123_1704067200000
✓ Zip extraction completed
✓ Found 15 files extracted
✓ Found entry point: index.html

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

## Expected API Response

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
  "files": [...],
  "totalSize": 15360
}
```

## Troubleshooting

### Issue: Still seeing Firebase Storage upload logs

**Problem:** You're seeing logs like:
```
Starting upload for file: gametribe/games/files/...
```

**Solution:** 
1. Make sure you're using the updated admin panel code
2. Restart your admin panel dev server: `cd gt-admin && npm run dev`
3. Clear browser cache or do a hard refresh (Ctrl+Shift+R)
4. The frontend should automatically detect `.zip` files and use `/api/upload/game-zip-local`

### Issue: No console output

**Check:**
1. Is the server running? Check `http://localhost:3000/health`
2. Are you using the correct endpoint? Should be `/api/upload/game-zip-local`
3. Check server logs for any errors

### Issue: Files not accessible via URL

**Check:**
1. Verify files exist in `gt-server/public/games/` directory
2. Check that Express static middleware is configured (should be in server.js)
3. Try accessing: `http://localhost:3000/games/{siteName}/index.html`

### Issue: Entry point not found

The system will:
1. First look for `index.html` or `index.htm`
2. Then use the first HTML file found
3. Finally use the first file in the zip

Make sure your zip file contains an HTML file.

## Manual Testing Steps

1. **Start the server:**
   ```bash
   cd gt-server
   npm run dev
   ```

2. **Upload a zip file using cURL:**
   ```bash
   curl -X POST http://localhost:3000/api/upload/game-zip-local \
     -F "zipfile=@your-game.zip" \
     -v
   ```

3. **Check the console output** - you should see the extraction logs and URL

4. **Access the game** - Use the `entryPointUrl` from the response

5. **Verify files are extracted:**
   ```bash
   ls -la gt-server/public/games/
   ```

## Frontend Integration

The admin panel (`gt-admin`) has been updated to automatically detect zip files and use the correct endpoint. After updating the code:

1. Restart the admin panel: `cd gt-admin && npm run dev`
2. Upload a zip file through the admin panel
3. Check the browser console for logs
4. Check the server console for extraction logs and URL

