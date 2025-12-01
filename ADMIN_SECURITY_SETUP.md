# Admin Security Setup Guide

## Overview

This guide explains how to properly secure admin endpoints with role-based authentication.

## Current Setup

Currently, the `/api/profile/users` endpoint relies on the admin dashboard's authentication layer. While the admin app requires login, the API endpoint itself doesn't verify admin privileges at the route level.

## Why `verifyToken` Was Removed

The `verifyToken` middleware was causing logout issues because:

1. The admin dashboard's API interceptor automatically logs out users on ANY 401 response
2. Token validation issues (expired/invalid tokens) would trigger 401 responses
3. This created an infinite logout loop when accessing the Users page

## Recommended Security Implementation

### Step 1: Set Up Admin Roles

First, you need to assign admin roles to specific users in your Firestore database.

#### Option A: Using the Setup Script

```bash
cd gt-server
node scripts/setAdminRole.js admin@gametribe.com
```

This will:
- Find the user by email
- Set their `role` field to `'admin'`
- Allow them to access admin-only endpoints

#### Option B: Manual Database Update

1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to the `users` collection
4. Find your admin user document
5. Add/update the field: `role: "admin"`

### Step 2: Enable Admin Middleware

Once admin roles are set up, update the route:

```javascript
// In gt-server/routes/tribeRoutes/userRoutes.js

// Replace this:
router.get('/users', getAllUsers);

// With this:
router.get('/users', verifyAdmin, getAllUsers);
```

### Step 3: Update API Error Handling (Optional)

To prevent logout loops, you can improve the admin dashboard's error handling:

```javascript
// In gt-admin/src/services/api.js

// Update the response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors more gracefully
    if (error.response?.status === 401) {
      // Check if it's a token issue or permission issue
      const errorMessage = error.response?.data?.message;
      
      if (errorMessage?.includes('admin')) {
        // It's an admin permission issue, don't logout
        console.error('Admin access required');
        // Show error message instead of logging out
        return Promise.reject(error);
      } else {
        // It's an authentication issue, proceed with logout
        localStorage.removeItem("authToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
```

## Admin Middleware

The `adminMiddleware.js` file provides two middleware functions:

### 1. `verifyAdmin` (Strict)
- Requires valid authentication token
- Requires user to have `role: 'admin'` in database
- Returns 403 if user is not admin

### 2. `checkAdminOptional` (Permissive)
- Checks if user is admin but doesn't fail
- Sets `req.isAdmin` flag for conditional logic
- Useful for endpoints with different behavior for admins vs regular users

## User Roles Structure

### Database Schema

```javascript
// users/{userId}
{
  email: "admin@gametribe.com",
  displayName: "Admin User",
  role: "admin",  // or "user", "moderator", etc.
  emailVerified: true,
  createdAt: "2025-01-16T...",
  lastUpdated: "2025-01-16T..."
}
```

### Supported Roles

- `"admin"` - Full administrative access
- `"user"` - Regular user (default)
- `"moderator"` - (future) Moderate content
- Custom roles as needed

## Security Best Practices

1. **Always verify admin roles on the backend** - Never trust client-side checks
2. **Use HTTPS in production** - Protect tokens in transit
3. **Set token expiration** - Implement refresh token logic
4. **Log admin actions** - Track who did what and when
5. **Use environment variables** - Never hardcode admin credentials
6. **Implement rate limiting** - Prevent brute force attacks

## Testing Admin Endpoints

### Test with Postman/Thunder Client

```bash
# Get authentication token first
POST http://localhost:3000/api/auth/login
{
  "email": "admin@gametribe.com",
  "password": "your-password"
}

# Then use the token
GET http://localhost:3000/api/profile/users
Headers:
  Authorization: Bearer <your-token>
```

### Test Admin Setup

```bash
# Verify admin role is set
node scripts/setAdminRole.js admin@gametribe.com

# Check the database
# Should see: role: "admin" in the user document
```

## Troubleshooting

### Issue: "Admin access required" error

**Solution:** Run the setAdminRole script for your user account

### Issue: Still getting logged out

**Solution:** 
1. Remove `verifyAdmin` from the route temporarily
2. Fix the API interceptor to handle 403 errors differently
3. Check browser console for specific error messages

### Issue: Token expired errors

**Solution:**
1. Implement token refresh logic
2. Increase token expiration time
3. Clear localStorage and login again

## Future Enhancements

- [ ] Implement role hierarchy (admin > moderator > user)
- [ ] Add permission-based access control (RBAC)
- [ ] Create admin dashboard for user management
- [ ] Add audit logs for admin actions
- [ ] Implement 2FA for admin accounts
- [ ] Add IP whitelisting for admin access

## Related Files

- `gt-server/middleware/adminMiddleware.js` - Admin verification middleware
- `gt-server/scripts/setAdminRole.js` - Script to assign admin roles
- `gt-server/routes/tribeRoutes/userRoutes.js` - User routes with admin protection
- `gt-admin/src/services/api.js` - API client with error handling

## Support

If you encounter issues with admin authentication:

1. Check server logs for detailed error messages
2. Verify the user exists in Firestore
3. Confirm the `role` field is set correctly
4. Test the endpoint with Postman first
5. Check browser console for token issues

