# User Suspension System

## Overview

The User Suspension System allows administrators to suspend and reactivate user accounts, effectively revoking and restoring all authentication privileges.

## How It Works

### When a User is Suspended

1. **Firebase Authentication**: Account is disabled at the Firebase Auth level
2. **Database Update**: User's status is set to `'suspended'` in Firestore
3. **Authentication Blocking**: Middleware checks suspension status on every authenticated request
4. **Immediate Effect**: User is logged out of all active sessions

### When a User is Reactivated

1. **Firebase Authentication**: Account is re-enabled at the Firebase Auth level
2. **Database Update**: User's status is set to `'active'` in Firestore
3. **Access Restored**: User can log in and use all platform features immediately

## Backend Implementation

### API Endpoints

#### Suspend User
```http
POST /api/profile/users/:userId/suspend
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Violating community guidelines" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User account suspended successfully",
  "data": {
    "userId": "abc123",
    "status": "suspended",
    "suspendedAt": "2025-01-16T10:30:00.000Z"
  }
}
```

#### Reactivate User
```http
POST /api/profile/users/:userId/reactivate
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "User account reactivated successfully",
  "data": {
    "userId": "abc123",
    "status": "active",
    "reactivatedAt": "2025-01-16T11:00:00.000Z"
  }
}
```

### Database Schema

#### User Document Structure
```javascript
{
  id: "user-id",
  email: "user@example.com",
  displayName: "John Doe",
  status: "suspended", // or "active"
  
  // Suspension metadata (only present if suspended)
  suspendedAt: "2025-01-16T10:30:00.000Z",
  suspensionReason: "Violating community guidelines",
  suspendedBy: "admin-user-id",
  
  // Reactivation metadata (only present if reactivated after suspension)
  reactivatedAt: "2025-01-16T11:00:00.000Z",
  reactivatedBy: "admin-user-id",
  
  lastUpdated: "2025-01-16T11:00:00.000Z"
}
```

### Authentication Middleware

The `verifyToken` middleware checks suspension status on **every authenticated request**:

```javascript
// In authMiddleware.js
const checkUserSuspension = async (userId) => {
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    return userData.status === 'suspended';
  }
  return false;
};

// Returns 403 if user is suspended
if (isSuspended) {
  return res.status(403).json({ 
    success: false, 
    error: 'Account suspended',
    message: 'Your account has been suspended. Please contact support.'
  });
}
```

## Frontend Implementation

### Admin Dashboard UI

#### User Table
- **Status Badge**: Shows "Suspended" (orange) or "Verified" (green)
- **Action Buttons**: 
  - 🔒 Suspend button (orange) for active users
  - 🔓 Reactivate button (green) for suspended users

#### Confirmation Dialog
Appears before suspension/reactivation with:
- **Clear description** of what will happen
- **User information** (name/email)
- **Action summary** (bullet points)
- **Warning message** for suspension
- **Cancel/Confirm buttons**

#### Suspension Reason Prompt
When suspending a user, admin can optionally enter a reason which is:
- Stored in the database
- Visible to other admins
- Can be referenced for support inquiries

### API Service Methods

```javascript
// In admin api.js
apiService.suspendUser(userId, reason);
apiService.reactivateUser(userId);
```

## User Experience

### What Suspended Users Experience

1. **Login Attempts**: 
   - Firebase Auth will reject login attempts
   - User sees: "Your account has been disabled"

2. **Active Sessions**:
   - Any API calls return 403 Forbidden
   - User is automatically logged out
   - Error message: "Account suspended. Please contact support."

3. **Platform Features**:
   - ❌ Cannot log in
   - ❌ Cannot access authenticated routes
   - ❌ Cannot make API calls
   - ❌ Cannot download games
   - ❌ Cannot comment or rate
   - ❌ Cannot update profile

### What Reactivated Users Experience

1. **Immediate Access**: Can log in right away
2. **Full Privileges**: All features restored
3. **No Data Loss**: All data (favorites, comments, ratings) intact
4. **Clean Slate**: Suspension metadata remains in DB but doesn't affect functionality

## Security Features

### Multi-Layer Protection

1. **Firebase Auth Level**: Account disabled/enabled
2. **Database Level**: Status field check
3. **Middleware Level**: Every request validated
4. **Admin Only**: Suspension endpoints require authentication

### Audit Trail

Every suspension/reactivation is logged with:
- Timestamp (suspendedAt/reactivatedAt)
- Reason (if provided)
- Admin who performed action (suspendedBy/reactivatedBy)

### Protection Against Abuse

- ✅ Only authenticated admins can suspend/reactivate
- ✅ Suspension is reversible (not permanent deletion)
- ✅ Reason tracking for accountability
- ✅ Toast notifications confirm actions
- ✅ Confirmation dialog prevents accidental suspensions

## Testing

### Manual Testing Steps

1. **Suspend a User**:
   ```
   - Go to Admin Dashboard > Users tab
   - Click suspend button (🔒) on a user
   - Confirm in dialog
   - Enter reason (optional)
   - Verify user status shows "Suspended"
   ```

2. **Test Suspended User Access**:
   ```
   - Try to log in as suspended user
   - Should see "Account disabled" error
   - Try API calls with suspended user token
   - Should get 403 Forbidden response
   ```

3. **Reactivate a User**:
   ```
   - Click reactivate button (🔓) on suspended user
   - Confirm in dialog
   - Verify user status shows "Verified" or "Unverified"
   ```

4. **Test Reactivated User Access**:
   ```
   - Log in as reactivated user
   - Should log in successfully
   - All features should work normally
   ```

### Automated Testing

```javascript
// Test suspension endpoint
describe('User Suspension', () => {
  it('should suspend user account', async () => {
    const response = await request(app)
      .post('/api/profile/users/user123/suspend')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Test suspension' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should block suspended user requests', async () => {
    const response = await request(app)
      .get('/api/profile/profile')
      .set('Authorization', `Bearer ${suspendedUserToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Account suspended');
  });
});
```

## Common Use Cases

### 1. Terms of Service Violation
```
Reason: "Violated Terms of Service - Section 3.2"
Action: Suspend → Review → Reactivate or Permanent Action
```

### 2. Spam/Abuse
```
Reason: "Posting spam content"
Action: Suspend → User appeal → Decision
```

### 3. Temporary Account Issues
```
Reason: "Payment dispute pending"
Action: Suspend → Issue resolved → Reactivate
```

### 4. Security Concerns
```
Reason: "Suspicious activity detected"
Action: Suspend → Verify identity → Reactivate
```

## Troubleshooting

### Issue: User still able to access after suspension

**Solutions:**
1. Check Firebase Auth console - user should be "Disabled"
2. Verify `status: 'suspended'` in Firestore users collection
3. Clear user's browser cookies/localStorage
4. Check middleware is imported correctly in routes
5. Verify backend is using updated code (restart server)

### Issue: Admin can't suspend users

**Solutions:**
1. Check admin has valid authentication token
2. Verify API endpoints are correct (/profile/users/:userId/suspend)
3. Check server logs for errors
4. Verify Firebase Admin SDK has proper permissions
5. Check CORS settings allow the request

### Issue: Suspended user not getting logged out

**Solutions:**
1. User must make an API call to trigger suspension check
2. Frontend should handle 403 errors and log user out
3. Check API interceptor in admin/client api.js
4. Verify authMiddleware.js has suspension check code

## Future Enhancements

### Potential Features

- [ ] **Suspension History**: Track all suspensions for a user
- [ ] **Automatic Expiration**: Suspend for X days then auto-reactivate
- [ ] **Suspension Levels**: Warning → Temporary → Permanent
- [ ] **Appeal System**: Users can appeal suspensions
- [ ] **Batch Operations**: Suspend multiple users at once
- [ ] **Email Notifications**: Notify users when suspended/reactivated
- [ ] **Suspension Reports**: Analytics on suspension patterns
- [ ] **Role-based Suspension**: Different levels of admin can suspend different users

## Related Files

### Backend
- `gt-server/controllers/tribeControllers/userController.js` - Suspension logic
- `gt-server/routes/tribeRoutes/userRoutes.js` - API routes
- `gt-server/middleware/authMiddleware.js` - Suspension checking
- `gt-server/config/firebase.js` - Firebase configuration

### Frontend
- `gt-admin/src/pages/Dashboard.jsx` - Admin UI
- `gt-admin/src/services/api.js` - API methods
- `gt-admin/src/contexts/ToastContext.jsx` - Notifications

## Support

For issues with the suspension system:

1. Check server logs for detailed error messages
2. Verify Firebase Admin SDK permissions
3. Test with Postman/Thunder Client first
4. Review this documentation for troubleshooting steps
5. Check browser console for frontend errors

---

**Last Updated**: January 2025  
**Version**: 1.0.0

