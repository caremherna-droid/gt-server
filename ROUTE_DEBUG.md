# Route Debugging Guide

## Issue: 404 on `/api/upload/game-zip-local` in Production

### Current Status
- ✅ Route is defined in `routes/tribeRoutes/uploadRoutes.js`
- ✅ Route is imported in `server.js`
- ✅ Route is registered: `app.use("/api/upload", uploadRoutes)`
- ❌ Getting 404 in production on Vercel

### Debugging Steps

1. **Test the test route first:**
   ```
   GET https://gt-server-eta.vercel.app/api/upload/test
   ```
   This should return a JSON response if routes are working.

2. **Check Vercel deployment logs:**
   - Go to Vercel Dashboard → Your Project → Functions → Logs
   - Look for any import errors or route registration errors
   - Check if `uploadRoutes.js` is being loaded

3. **Verify the route is accessible:**
   ```bash
   curl -X GET https://gt-server-eta.vercel.app/api/upload/test
   ```

4. **Check if other upload routes work:**
   ```bash
   # Test image upload route
   curl -X POST https://gt-server-eta.vercel.app/api/upload/image
   
   # Test game upload route  
   curl -X POST https://gt-server-eta.vercel.app/api/upload/game
   ```

### Possible Solutions

1. **Redeploy the application:**
   - Push a new commit to trigger a fresh deployment
   - Or manually redeploy from Vercel dashboard

2. **Clear Vercel build cache:**
   - Vercel Dashboard → Settings → General
   - Clear build cache and redeploy

3. **Check for case sensitivity:**
   - Ensure file names match exactly (case-sensitive)
   - `uploadRoutes.js` not `uploadroutes.js`

4. **Verify environment variables:**
   - Ensure all required env vars are set in Vercel
   - Check `NODE_ENV` is set to `production`

5. **Check import paths:**
   - Verify all relative imports are correct
   - Check if ES modules are properly configured

### Quick Fix Test

Try accessing the test route:
```
https://gt-server-eta.vercel.app/api/upload/test
```

If this works, the routes are registered correctly and the issue is specific to the `game-zip-local` route.

If this doesn't work, there's a broader issue with route registration in production.

