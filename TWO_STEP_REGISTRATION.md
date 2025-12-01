# Two-Step Registration System

## Overview

This document describes the two-step registration system that requires all users (including Google Sign-In users) to provide a username before their account is created in the database.

## Why This System?

Previously, Google Sign-In would automatically create user accounts without requiring any additional information. This new system ensures:

1. **Consistent User Experience**: All users, regardless of authentication method, must provide a username
2. **Better User Control**: Users can choose their own display name instead of using their Google name
3. **Data Integrity**: Accounts are only created in Firestore after user completes registration
4. **Username Validation**: Prevents duplicate usernames and ensures proper formatting

## How It Works

### Step 1: Authentication (Google Sign-In)

```
User clicks "Sign in with Google"
    ↓
Google authentication completes
    ↓
Firebase Auth account created (if new user)
    ↓
Backend checks if user exists in Firestore
    ↓
Returns needsRegistration: true if not found
```

### Step 2: Username Selection

```
Client receives needsRegistration: true
    ↓
Shows username modal
    ↓
User enters desired username
    ↓
Client sends username to /complete-registration
    ↓
Backend validates username (uniqueness, format)
    ↓
Creates Firestore user document
    ↓
User is fully registered and logged in
```

## Backend Implementation

### 1. Google Auth Endpoint (`/auth/google-auth`)

**Modified Behavior:**
- Creates Firebase Auth user immediately (for authentication)
- Checks if user exists in Firestore database
- Returns `needsRegistration: true` if no Firestore document found
- Returns normal user data if account is complete

**Response when registration needed:**
```json
{
  "success": true,
  "needsRegistration": true,
  "data": {
    "user": {
      "uid": "firebase-uid",
      "email": "user@gmail.com",
      "displayName": "John Doe",
      "photoURL": "https://...",
      "emailVerified": true
    },
    "token": "firebase-custom-token",
    "refreshToken": "firebase-custom-token"
  }
}
```

**Response when already registered:**
```json
{
  "success": true,
  "needsRegistration": false,
  "data": {
    "user": {
      "uid": "firebase-uid",
      "email": "user@gmail.com",
      "displayName": "chosen_username",
      "photoURL": "https://...",
      "emailVerified": true
    },
    "token": "firebase-custom-token",
    "refreshToken": "firebase-custom-token"
  }
}
```

### 2. Complete Registration Endpoint (`/auth/complete-registration`)

**Purpose:** Completes registration by creating Firestore document with chosen username

**Request:**
```http
POST /api/auth/complete-registration
Content-Type: application/json

{
  "uid": "firebase-user-id",
  "username": "chosen_username",
  "email": "user@gmail.com",
  "photoURL": "https://..."
}
```

**Validation:**
- Username must be at least 3 characters
- Username must be unique (not already taken)
- User must not already have a Firestore document

**Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "displayName": "chosen_username"
  }
}
```

**Error Responses:**
```json
// Username too short
{
  "success": false,
  "error": "Username must be at least 3 characters long"
}

// Username taken
{
  "success": false,
  "error": "Username is already taken"
}

// Already registered
{
  "success": false,
  "error": "User already completed registration"
}
```

## Frontend Implementation

### 1. AuthContext Changes

**New Function: `completeRegistration(username)`**

```javascript
async function completeRegistration(username) {
  // Get pending registration data from sessionStorage
  const pendingData = sessionStorage.getItem('pendingRegistration');
  
  // Send username to backend
  await axios.post(`${API_URL}/auth/complete-registration`, {
    uid, username, email, photoURL
  });
  
  // Clear pending registration
  sessionStorage.removeItem('pendingRegistration');
  
  // Update current user and store auth data
  setCurrentUser(user);
  storeAuthData(token, user);
}
```

**Modified Function: `signInWithGoogle()`**

```javascript
async function signInWithGoogle() {
  // Existing Google sign-in logic
  const response = await axios.post(`${API_URL}/auth/google-auth`, { idToken });
  
  const needsRegistration = response.data.needsRegistration;
  
  if (needsRegistration) {
    // Store temporary auth data in sessionStorage
    sessionStorage.setItem('pendingRegistration', JSON.stringify({
      uid, email, photoURL, token
    }));
    
    return { needsRegistration: true, user, token };
  }
  
  // Continue normal sign-in flow
  storeAuthData(token, user);
  setCurrentUser(user);
}
```

### 2. SignIn Component Changes

**New State:**
```javascript
const [showUsernameModal, setShowUsernameModal] = useState(false);
const [googleUsername, setGoogleUsername] = useState('');
const [googleUsernameError, setGoogleUsernameError] = useState('');
```

**Check on Mount:**
```javascript
useEffect(() => {
  // Check if there's pending registration (e.g., from redirect)
  const pendingData = sessionStorage.getItem('pendingRegistration');
  if (pendingData) {
    setShowUsernameModal(true);
  }
}, []);
```

**Handle Google Sign-In:**
```javascript
const handleGoogleSignIn = async (e) => {
  e.preventDefault();
  const result = await signInWithGoogle();
  
  // Check if registration needs to be completed
  if (result?.needsRegistration) {
    setShowUsernameModal(true);
    return; // Don't navigate yet
  }
  
  // Normal navigation for existing users
  navigate('/');
};
```

**Username Modal UI:**
```jsx
{showUsernameModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6">
      <h3>Choose Your Username</h3>
      <input 
        value={googleUsername}
        onChange={(e) => setGoogleUsername(e.target.value)}
        placeholder="Enter your username"
      />
      <button onClick={handleUsernameSubmit}>
        Complete Registration
      </button>
    </div>
  </div>
)}
```

**Submit Username:**
```javascript
const handleUsernameSubmit = async (e) => {
  e.preventDefault();
  
  // Validate username
  const error = validateUsername(googleUsername);
  if (error) {
    setGoogleUsernameError(error);
    return;
  }
  
  // Complete registration
  await completeRegistration(googleUsername);
  setShowUsernameModal(false);
  navigate('/');
};
```

## User Flow Scenarios

### Scenario 1: New Google User

1. User clicks "Sign in with Google" on SignIn page
2. Google authentication popup opens
3. User authorizes the app
4. Backend creates Firebase Auth account
5. Backend checks Firestore → no document found
6. Backend returns `needsRegistration: true`
7. Username modal appears
8. User enters "coolplayer123"
9. Client sends username to `/complete-registration`
10. Backend validates and creates Firestore document
11. User is logged in and redirected to home page

### Scenario 2: Returning Google User

1. User clicks "Sign in with Google"
2. Google authentication completes
3. Backend checks Firestore → document exists
4. Backend returns user data with `needsRegistration: false`
5. User is immediately logged in and redirected

### Scenario 3: Google Redirect Flow

1. User on mobile or COOP-protected browser
2. Popup is blocked, so redirect flow is used
3. User is redirected to Google
4. Google redirects back to app
5. `useEffect` detects redirect result
6. Checks `needsRegistration` in response
7. If true, stores data in sessionStorage
8. Shows username modal
9. User completes registration

### Scenario 4: User Closes Modal

1. User starts Google sign-in
2. Username modal appears
3. User clicks X or Cancel
4. sessionStorage is cleared
5. Firebase Auth account exists but no Firestore document
6. Next time user signs in, they'll see the modal again

## Data Storage

### sessionStorage (Temporary)

**Key:** `pendingRegistration`

**Value:**
```json
{
  "uid": "firebase-uid",
  "email": "user@gmail.com",
  "photoURL": "https://...",
  "token": "firebase-custom-token"
}
```

**Purpose:** Store auth data temporarily while user chooses username

**Cleared:** After successful registration or modal cancellation

### Firestore (Permanent)

**Collection:** `users`

**Document ID:** Firebase UID

**Structure:**
```javascript
{
  email: "user@gmail.com",
  displayName: "chosen_username", // User's chosen username
  photoURL: "https://...",
  emailVerified: true,
  createdAt: "2025-01-16T10:00:00.000Z",
  lastUpdated: "2025-01-16T10:00:00.000Z",
  status: "active"
}
```

### Firebase Auth

**Created:** Immediately after Google sign-in (even before username)

**Updated:** `displayName` field updated after username chosen

**Purpose:** Provides authentication and token generation

## Username Validation Rules

1. **Minimum Length:** 3 characters
2. **Format:** Letters, numbers, and underscores only (`/^[a-zA-Z0-9_]+$/`)
3. **Uniqueness:** Must not already exist in Firestore
4. **Required:** Cannot be empty

**Validation in Client:**
```javascript
const validateUsername = (username) => {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return '';
};
```

**Validation in Server:**
```javascript
// Check length
if (username.length < 3) {
  return res.status(400).json({
    success: false,
    error: "Username must be at least 3 characters long"
  });
}

// Check uniqueness
const usersSnapshot = await db.collection('users')
  .where('displayName', '==', username)
  .limit(1)
  .get();

if (!usersSnapshot.empty) {
  return res.status(400).json({
    success: false,
    error: "Username is already taken"
  });
}
```

## Security Considerations

### 1. Firebase Auth Account Creation

**Concern:** Firebase Auth account is created before registration is complete

**Mitigation:** 
- Firestore document check in `authMiddleware.js` will block suspended users
- Profile endpoints check for Firestore document existence
- Account can be manually cleaned up if user abandons registration

### 2. Race Conditions

**Concern:** Multiple users might try to claim same username simultaneously

**Mitigation:**
- Firestore query uses `.limit(1)` for performance
- Unique username check happens within transaction scope
- Rare race condition would result in error, user can try different username

### 3. Incomplete Registrations

**Concern:** User might have Firebase Auth account but no Firestore document

**Handling:**
- Next login attempt will show username modal again
- sessionStorage clears on browser close, so temporary data doesn't persist
- Admin can identify incomplete registrations via Firebase Auth vs Firestore comparison

## Testing

### Manual Testing

1. **New User Registration:**
   ```
   - Clear browser data
   - Click "Sign in with Google"
   - Authorize app
   - Verify username modal appears
   - Enter username "testuser123"
   - Submit
   - Verify logged in successfully
   - Check Firestore for user document
   ```

2. **Username Validation:**
   ```
   - Start Google sign-in
   - Try username "ab" (too short)
   - Verify error message
   - Try username "test@user" (invalid chars)
   - Verify error message
   - Try existing username
   - Verify "already taken" error
   - Enter valid unique username
   - Verify success
   ```

3. **Existing User:**
   ```
   - Sign in with already-registered Google account
   - Verify no username modal
   - Verify immediate login
   ```

4. **Modal Cancellation:**
   ```
   - Start Google sign-in
   - Close username modal
   - Verify sessionStorage cleared
   - Try signing in again
   - Verify modal appears again
   ```

### Automated Testing

```javascript
describe('Two-Step Registration', () => {
  it('should require username for new Google users', async () => {
    const response = await request(app)
      .post('/auth/google-auth')
      .send({ idToken: 'new-user-token' });
    
    expect(response.body.needsRegistration).toBe(true);
    expect(response.body.data.user).toBeDefined();
  });

  it('should not require username for existing users', async () => {
    const response = await request(app)
      .post('/auth/google-auth')
      .send({ idToken: 'existing-user-token' });
    
    expect(response.body.needsRegistration).toBe(false);
  });

  it('should complete registration with valid username', async () => {
    const response = await request(app)
      .post('/auth/complete-registration')
      .send({ 
        uid: 'test-uid', 
        username: 'testuser123',
        email: 'test@gmail.com'
      });
    
    expect(response.body.success).toBe(true);
  });

  it('should reject duplicate usernames', async () => {
    const response = await request(app)
      .post('/auth/complete-registration')
      .send({ 
        uid: 'test-uid-2', 
        username: 'existing_user',
        email: 'test2@gmail.com'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already taken');
  });
});
```

## Troubleshooting

### Issue: User sees username modal every time

**Cause:** Firestore document not being created

**Solution:**
1. Check server logs for errors in `/complete-registration`
2. Verify Firestore permissions allow document creation
3. Check if username validation is failing silently
4. Manually check Firestore for user document

### Issue: "Username already taken" for unique username

**Cause:** Case-sensitive comparison or whitespace

**Solution:**
1. Trim username before validation: `username.trim()`
2. Consider case-insensitive uniqueness check
3. Check for hidden characters in username

### Issue: Modal doesn't appear after redirect

**Cause:** sessionStorage not being set

**Solution:**
1. Check if redirect result is being detected
2. Verify `needsRegistration` flag in response
3. Check browser console for errors
4. Verify sessionStorage is enabled in browser

### Issue: Firebase Auth account but no Firestore document

**Cause:** User closed modal or registration failed

**Solution:**
1. User can sign in again to complete registration
2. Admin can manually create Firestore document
3. Admin can delete orphaned Firebase Auth account if needed

## Related Files

### Backend
- `gt-server/routes/tribeRoutes/authRoutes.js` - Auth endpoints
- `gt-server/controllers/tribeControllers/userController.js` - User management
- `gt-server/config/firebase.js` - Firebase configuration

### Frontend
- `gt-client/src/contexts/AuthContext.jsx` - Auth state management
- `gt-client/src/pages/SignIn.jsx` - Login UI with username modal
- `gt-client/src/services/api.js` - API calls

## Migration Notes

### For Existing Users

- Existing Google users already have Firestore documents
- They will continue to sign in normally
- No action required from existing users

### For New Deployments

1. Deploy backend changes first
2. Test with new user accounts
3. Deploy frontend changes
4. Monitor for any auth errors
5. Check Firestore for incomplete registrations

---

**Last Updated:** January 2025  
**Version:** 1.0.0

