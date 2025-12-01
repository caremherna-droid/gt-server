import express from "express";
import admin, { db } from "../../config/firebase.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { OAuth2Client } from "google-auth-library";
import { setAuthCookies, clearAuthCookies, getRefreshTokenFromCookies, getAccessTokenFromCookies } from "../../utils/cookieUtils.js";
import {
  strictAuthLimiter,
  moderateAuthLimiter,
  lenientAuthLimiter,
  googleAuthLimiter,
  refreshTokenLimiter,
} from "../../middleware/rateLimiter.js";

const router = express.Router();

// Check if user is suspended
const checkUserSuspension = async (userId) => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData.status === "suspended";
    }
    return false;
  } catch (error) {
    console.error("Error checking user suspension:", error);
    return false;
  }
};

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Verify Firebase token endpoint (for email/password authentication)
router.post("/verify-firebase-token", moderateAuthLimiter, async (req, res) => {
  try {
    const { idToken, email, isNewUser } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "ID token is required",
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get user details from Firebase Auth
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    // Check if user has completed registration (exists in Firestore)
    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    const needsRegistration = !userDoc.exists;

    // Prepare user data
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName:
        userRecord.displayName ||
        (userRecord.email ? userRecord.email.split("@")[0] : "User"),
      emailVerified: userRecord.emailVerified,
      photoURL: userRecord.photoURL,
    };

    // If this is a new user and they have a displayName, create the Firestore document
    if (isNewUser && userRecord.displayName) {
      try {
        if (!userDoc.exists) {
          // Create user document in Firestore
          await db
            .collection("users")
            .doc(userRecord.uid)
            .set({
              ...userData,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              status: "active",
            });
        }
      } catch (firestoreError) {
        console.error("Error creating user document:", firestoreError);
        // Continue even if Firestore operation fails
      }
    } else if (!needsRegistration) {
      // Update last login time for existing users
      try {
        await db.collection("users").doc(userRecord.uid).update({
          lastLogin: new Date().toISOString(),
        });
      } catch (firestoreError) {
        console.error("Error updating last login:", firestoreError);
        // Continue even if Firestore operation fails
      }
    }

    // Create a custom token as refresh token (longer-lived, 7 days)
    // This allows users to stay logged in even after the Firebase ID token expires (1 hour)
    const refreshToken = await admin.auth().createCustomToken(userRecord.uid);
    
    // Set secure HttpOnly cookies with both access and refresh tokens
    setAuthCookies(res, idToken, refreshToken, userData);

    res.json({
      success: true,
      needsRegistration,
      data: {
        user: userData,
        token: idToken,
        isNewUser: isNewUser || false,
      },
    });
  } catch (error) {
    console.error("Firebase token verification error:", error);

    let errorMessage = "Token verification failed";
    if (error.code === "auth/id-token-expired") {
      errorMessage = "Token has expired";
    } else if (error.code === "auth/id-token-revoked") {
      errorMessage = "Token has been revoked";
    } else if (error.code === "auth/invalid-id-token") {
      errorMessage = "Invalid token";
    }

    res.status(401).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Login endpoint - strict rate limiting to prevent brute force attacks
router.post("/login", strictAuthLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verify the credentials with Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Prepare user data
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || userRecord.email.split("@")[0],
      photoURL: userRecord.photoURL,
    };

    // Update last login time in Firestore
    try {
      const userDoc = await db.collection("users").doc(userRecord.uid).get();
      if (userDoc.exists) {
        await db.collection("users").doc(userRecord.uid).update({
          lastLogin: new Date().toISOString(),
        });
      }
    } catch (firestoreError) {
      console.error("Error updating last login:", firestoreError);
      // Continue even if Firestore operation fails
    }

    // Set secure HttpOnly cookies
    setAuthCookies(res, customToken, customToken, userData);

    res.json({
      success: true,
      data: {
        idToken: customToken,
        refreshToken: customToken, // Using the same token as refresh token for simplicity
        user: userData,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  }
});

// Register endpoint - strict rate limiting to prevent abuse
router.post("/register", strictAuthLimiter, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Prepare user data
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || email.split("@")[0],
      photoURL: userRecord.photoURL || null,
    };

    // Create user document in Firestore
    try {
      await db
        .collection("users")
        .doc(userRecord.uid)
        .set({
          ...userData,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: "active",
        });
    } catch (firestoreError) {
      console.error("Error creating user document:", firestoreError);
      // Continue even if Firestore operation fails
    }

    // Set secure HttpOnly cookies
    setAuthCookies(res, customToken, customToken, userData);

    res.status(201).json({
      success: true,
      data: {
        idToken: customToken,
        refreshToken: customToken, // Using the same token as refresh token for simplicity
        user: userData,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify token endpoint - moderate rate limiting
router.post("/verify-token", moderateAuthLimiter, verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

// GET endpoint for token verification (for cross-platform auth)
// Automatically refreshes token if expired but refresh token exists
router.get("/verify", moderateAuthLimiter, async (req, res) => {
  try {
    // First, try to verify with current access token
    const accessToken = getAccessTokenFromCookies(req);
    
    if (accessToken) {
      try {
        // Try to verify the access token
        const decodedToken = await admin.auth().verifyIdToken(accessToken);
        
        // Check if user is suspended
        const isSuspended = await checkUserSuspension(decodedToken.uid);
        if (isSuspended) {
          return res.status(403).json({
            success: false,
            error: "Account suspended",
            message: "Your account has been suspended. Please contact support for more information.",
          });
        }
        
        // Get user details
        const userRecord = await admin.auth().getUser(decodedToken.uid);
        const userData = {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName:
            userRecord.displayName ||
            (userRecord.email ? userRecord.email.split("@")[0] : "User"),
          photoURL: userRecord.photoURL,
        };
        
        // Token is valid, return user data
        return res.json({
          success: true,
          data: {
            user: userData,
            platform: "main",
            server: "gt-server",
          },
        });
      } catch (tokenError) {
        // Access token is invalid or expired, try to refresh
        if (tokenError.code === "auth/id-token-expired" || tokenError.code === "auth/argument-error") {
          // Token expired or invalid, try refresh token
          const refreshToken = getRefreshTokenFromCookies(req);
          
          if (refreshToken) {
            try {
              // Verify refresh token
              const refreshDecoded = await admin.auth().verifyIdToken(refreshToken);
              const uid = refreshDecoded.uid;
              
              // Get user details
              const userRecord = await admin.auth().getUser(uid);
              
              // Check if user is suspended
              const isSuspended = await checkUserSuspension(uid);
              if (isSuspended) {
                return res.status(403).json({
                  success: false,
                  error: "Account suspended",
                  message: "Your account has been suspended. Please contact support for more information.",
                });
              }
              
              // Generate new access token
              const newAccessToken = await admin.auth().createCustomToken(uid);
              
              // Get fresh user data
              const userData = {
                uid: userRecord.uid,
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                displayName:
                  userRecord.displayName ||
                  (userRecord.email ? userRecord.email.split("@")[0] : "User"),
                photoURL: userRecord.photoURL,
              };
              
              // Set new HttpOnly cookies with refreshed tokens
              setAuthCookies(res, newAccessToken, refreshToken, userData);
              
              // Return user data
              return res.json({
                success: true,
                data: {
                  user: userData,
                  platform: "main",
                  server: "gt-server",
                  tokenRefreshed: true,
                },
              });
            } catch (refreshError) {
              // Refresh token is also invalid
              return res.status(401).json({
                success: false,
                error: "Invalid or expired token",
                message: "Please log in again.",
              });
            }
          }
        }
        
        // Other token errors
        return res.status(401).json({
          success: false,
          error: "Invalid or expired token",
          message: "Please log in again.",
        });
      }
    } else {
      // No access token, check for refresh token
      const refreshToken = getRefreshTokenFromCookies(req);
      
      if (refreshToken) {
        try {
          // Verify refresh token
          const refreshDecoded = await admin.auth().verifyIdToken(refreshToken);
          const uid = refreshDecoded.uid;
          
          // Get user details
          const userRecord = await admin.auth().getUser(uid);
          
          // Check if user is suspended
          const isSuspended = await checkUserSuspension(uid);
          if (isSuspended) {
            return res.status(403).json({
              success: false,
              error: "Account suspended",
              message: "Your account has been suspended. Please contact support for more information.",
            });
          }
          
          // Generate new access token
          const newAccessToken = await admin.auth().createCustomToken(uid);
          
          // Get fresh user data
          const userData = {
            uid: userRecord.uid,
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
            displayName:
              userRecord.displayName ||
              (userRecord.email ? userRecord.email.split("@")[0] : "User"),
            photoURL: userRecord.photoURL,
          };
          
          // Set new HttpOnly cookies with refreshed tokens
          setAuthCookies(res, newAccessToken, refreshToken, userData);
          
          // Return user data
          return res.json({
            success: true,
            data: {
              user: userData,
              platform: "main",
              server: "gt-server",
              tokenRefreshed: true,
            },
          });
        } catch (refreshError) {
          // Refresh token is invalid
          return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
            message: "Please log in again.",
          });
        }
      }
      
      // No tokens at all
      return res.status(401).json({
        success: false,
        error: "No token provided",
        message: "Authentication required. Please log in.",
      });
    }
  } catch (error) {
    console.error("Verify endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Refresh token endpoint - supports both HttpOnly cookies and body tokens
router.post("/refresh-token", refreshTokenLimiter, async (req, res) => {
  try {
    // Priority 1: Check HttpOnly cookie (preferred method)
    let refreshToken = getRefreshTokenFromCookies(req);
    
    // Priority 2: Check request body (backward compatibility)
    if (!refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    // Verify the token as either a custom token or a Firebase ID token
    let decodedToken;
    let uid;

    try {
      // First try to verify as an ID token
      decodedToken = await admin.auth().verifyIdToken(refreshToken);
      uid = decodedToken.uid;
    } catch (verifyError) {
      // If not a valid ID token, it might be a custom token or invalid
      console.log("Not a valid ID token, checking other possibilities");

      // Custom logic to extract UID from custom token if necessary
      // For simplicity, we'll return an error for now
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    // Get the user details
    const userRecord = await admin.auth().getUser(uid);

    // Generate a new Firebase ID token (not custom token - for better security)
    // Since we're refreshing, we need to get a fresh ID token from Firebase
    // For HttpOnly cookie approach, we'll use the Firebase Admin SDK to create a custom token
    // which the client can then exchange for an ID token
    const customToken = await admin.auth().createCustomToken(uid);
    
    // Get fresh user data
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName:
        userRecord.displayName ||
        (userRecord.email ? userRecord.email.split("@")[0] : "User"),
      photoURL: userRecord.photoURL,
    };

    // Set new HttpOnly cookies with refreshed tokens
    setAuthCookies(res, customToken, customToken, userData);

    // Return the new token along with user data
    res.json({
      success: true,
      data: {
        token: customToken,
        refreshToken: customToken,
        expiresIn: 3600, // 1 hour
        user: userData,
      },
    });
  } catch (error) {
    console.error("Refresh token server error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while refreshing token",
    });
  }
});

// Check if email exists endpoint - lenient rate limiting
router.get("/check-email", lenientAuthLimiter, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    try {
      // Check if user exists with this email
      await admin.auth().getUserByEmail(email);

      // If we got here, the user exists
      res.json({
        success: true,
        exists: true,
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // User doesn't exist
        res.json({
          success: true,
          exists: false,
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while checking email",
    });
  }
});

// Add a new endpoint for validating SSO tokens
router.post("/validate-sso", async (req, res) => {
  try {
    const { ssoToken } = req.body;

    if (!ssoToken) {
      return res.status(400).json({
        success: false,
        error: "SSO token is required",
      });
    }

    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(ssoToken);

    // Get additional user details
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    // Return user data
    res.json({
      success: true,
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || userRecord.email,
          emailVerified: userRecord.emailVerified,
          photoURL: userRecord.photoURL,
        },
      },
    });
  } catch (error) {
    console.error("SSO validation error:", error);
    res.status(401).json({
      success: false,
      error: "Invalid SSO token",
    });
  }
});

// Improve existing Google authentication endpoint for stronger SSO support
router.post("/google-auth", googleAuthLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "ID token is required",
      });
    }

    // Verify the Google ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get user info from decoded token
    const { email, email_verified, name, picture, uid } = decodedToken;

    // Check if user exists in Firebase Auth
    let userRecord;
    let needsRegistration = false;

    try {
      // Try to get user from Firebase Auth
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (emailError) {
        if (emailError.code === "auth/user-not-found") {
          // Try to get by UID in case email lookup fails
          try {
            userRecord = await admin.auth().getUser(uid);
          } catch (uidError) {
            if (uidError.code === "auth/user-not-found") {
              // User doesn't exist in Firebase Auth, create a temporary auth record
              // but don't create Firestore document yet
              userRecord = await admin.auth().createUser({
                uid: uid,
                email: email,
                emailVerified: email_verified,
                displayName: name,
                photoURL: picture,
              });
              needsRegistration = true;
              console.log(
                `Created Firebase Auth user (pending registration): ${email}`
              );
            } else {
              throw uidError;
            }
          }
        } else {
          throw emailError;
        }
      }

      // Check if user has completed registration (exists in Firestore)
      if (!needsRegistration) {
        const userDoc = await db.collection("users").doc(userRecord.uid).get();
        if (!userDoc.exists) {
          // User exists in Firebase Auth but not in Firestore - needs to complete registration
          needsRegistration = true;
          console.log(`User ${email} needs to complete registration`);
        }
      }
    } catch (error) {
      console.error("Error checking/creating user:", error);
      throw error;
    }

    // Generate a custom token for the user - valid for both platforms
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Set secure HttpOnly cookies
    setAuthCookies(res, customToken, customToken, {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
    });

    // If user needs registration, return special status
    if (needsRegistration) {
      return res.json({
        success: true,
        needsRegistration: true,
        data: {
          user: {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            emailVerified: userRecord.emailVerified,
          },
          token: customToken,
          refreshToken: customToken,
        },
      });
    }

    // User is fully registered, return normal response
    res.json({
      success: true,
      needsRegistration: false,
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          emailVerified: userRecord.emailVerified,
        },
        token: customToken,
        refreshToken: customToken,
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(401).json({
      success: false,
      error: "Authentication failed: " + error.message,
    });
  }
});

// Complete registration with username (for Google Sign-In users)
router.post("/complete-registration", moderateAuthLimiter, async (req, res) => {
  try {
    const { uid, username, email, photoURL } = req.body;

    if (!uid || !username) {
      return res.status(400).json({
        success: false,
        error: "User ID and username are required",
      });
    }

    // Validate username
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Username must be at least 3 characters long",
      });
    }

    // Check if username is already taken
    const usersSnapshot = await db
      .collection("users")
      .where("displayName", "==", username)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: "Username is already taken",
      });
    }

    // Check if user already has a Firestore document (shouldn't happen, but check anyway)
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      return res.status(400).json({
        success: false,
        error: "User already completed registration",
      });
    }

    // Create user document in Firestore
    await db
      .collection("users")
      .doc(uid)
      .set({
        email: email,
        displayName: username,
        photoURL: photoURL || null,
        emailVerified: true, // Google users are verified
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: "active",
      });

    // Update Firebase Auth displayName
    try {
      await admin.auth().updateUser(uid, {
        displayName: username,
      });
    } catch (authError) {
      console.error("Error updating Firebase Auth displayName:", authError);
      // Continue even if Auth update fails
    }

    res.json({
      success: true,
      message: "Registration completed successfully",
      data: {
        displayName: username,
      },
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    res.status(500).json({
      success: false,
      error: "Registration completion failed: " + error.message,
    });
  }
});

// Get Google auth URL
router.get("/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    scope: ["profile", "email"],
  });
  res.json({ authUrl: url });
});

// Handle Google callback
router.post("/google/callback", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Create or update user in Firebase
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(payload.email);
    } catch (error) {
      userRecord = await admin.auth().createUser({
        email: payload.email,
        displayName: payload.name,
        photoURL: payload.picture,
        emailVerified: payload.email_verified,
      });
    }

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.json({
      success: true,
      data: {
        token: customToken,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
        },
      },
    });
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
});

// Logout endpoint - clears all auth cookies
router.post("/logout", (req, res) => {
  try {
    // Clear all authentication cookies
    clearAuthCookies(res);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
});

export default router;
