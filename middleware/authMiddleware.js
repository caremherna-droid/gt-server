import admin from "../config/firebase.js";
import { db } from "../config/firebase.js";
import { getAccessTokenFromCookies } from "../utils/cookieUtils.js";

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

export const verifyToken = async (req, res, next) => {
  try {
    // Priority 1: Check HttpOnly cookie first (most secure)
    let token = getAccessTokenFromCookies(req);
    let tokenSource = "cookie";

    // Priority 2: Check Authorization header (backward compatibility)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split("Bearer ")[1];
        tokenSource = "header";
      }
    }

    // Priority 3: Check custom SSO headers (for cross-platform auth)
    if (!token) {
      token = req.headers["x-sso-token"];
      if (token) {
        tokenSource = "sso-header";
      }
    }

    // Only log in development mode
    if (process.env.NODE_ENV !== "production") {
      console.log("Token source:", tokenSource);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
        message: "Authentication required. Please log in.",
      });
    }

    // First try to validate as a Firebase ID token
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Only log in development
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "Token verified successfully for user:",
          decodedToken.email
        );
      }

      // Check if user is suspended
      const isSuspended = await checkUserSuspension(decodedToken.uid);
      if (isSuspended) {
        if (process.env.NODE_ENV !== "production") {
          console.log("User account is suspended:", decodedToken.email);
        }
        return res.status(403).json({
          success: false,
          error: "Account suspended",
          message:
            "Your account has been suspended. Please contact support for more information.",
        });
      }

      // Add user info to request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name,
      };

      next();
    } catch (verifyError) {
      // Only log in development
      if (process.env.NODE_ENV !== "production") {
        console.error("Token verification error:", verifyError.message);
      }

      // If Firebase token verification fails, try custom token validation
      try {
        // Decode JWT manually to get user info
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);

        // Only log in development
        if (process.env.NODE_ENV !== "production") {
          console.log("Decoded token payload:", payload);
        }

        // For custom tokens, the actual user ID is in the 'uid' field, not 'sub'
        const actualUserId = payload.uid; // Use the uid field, not sub

        if (!actualUserId) {
          throw new Error("No user ID found in token");
        }

        // Try to get user info from Firebase Auth using the actual user ID
        let userRecord = null;
        try {
          userRecord = await admin.auth().getUser(actualUserId);
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "Found user record for UID:",
              actualUserId,
              userRecord.email
            );
          }
        } catch (userError) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "Could not find user record for UID:",
              actualUserId,
              userError.message
            );
          }
        }

        // Check if user is suspended
        const isSuspended = await checkUserSuspension(actualUserId);
        if (isSuspended) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "User account is suspended:",
              userRecord?.email || payload.email
            );
          }
          return res.status(403).json({
            success: false,
            error: "Account suspended",
            message:
              "Your account has been suspended. Please contact support for more information.",
          });
        }

        // Set user info from Firebase Auth record if available, otherwise use token data
        req.user = {
          uid: actualUserId, // Use the actual user ID from the uid field
          email: userRecord?.email || payload.email,
          emailVerified:
            userRecord?.emailVerified || payload.email_verified || false,
          displayName:
            userRecord?.displayName || payload.name || payload.displayName,
        };

        // Only log in development
        if (process.env.NODE_ENV !== "production") {
          console.log("Using custom token validation for user:", {
            uid: req.user.uid,
            email: req.user.email,
            displayName: req.user.displayName,
          });
        }
        next();
      } catch (fallbackError) {
        // Only log in development
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "Fallback token validation failed:",
            fallbackError.message
          );
        }
        return res.status(401).json({
          success: false,
          error: "Invalid or expired token",
        });
      }
    }
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Add a new middleware for SSO tokens specifically
export const verifySsoToken = async (req, res, next) => {
  try {
    // Check for token in various locations
    const token =
      req.body.sso_token ||
      req.query.sso_token ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split("Bearer ")[1]
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No SSO token provided",
      });
    }

    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
    };

    next();
  } catch (error) {
    console.error("SSO Middleware Error:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired SSO token",
    });
  }
};
