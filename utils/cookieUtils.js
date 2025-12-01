/**
 * Secure Cookie Utility Functions
 * Handles setting and clearing HttpOnly cookies with proper security flags
 */

const isProd = process.env.NODE_ENV === "production";

// Cookie configuration constants
const COOKIE_CONFIG = {
  // Access token: short-lived (1 hour)
  ACCESS_TOKEN: {
    name: "auth_token",
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
  },
  // Refresh token: long-lived (7 days)
  REFRESH_TOKEN: {
    name: "refresh_token",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
  // User session: matches access token
  USER_SESSION: {
    name: "user_session",
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
  },
};

/**
 * Get cookie domain based on environment
 * In production, use .gametribe.com for cross-subdomain sharing
 * In development, don't set domain (defaults to current host)
 */
const getCookieDomain = () => {
  if (isProd) {
    return ".gametribe.com";
  }
  // In development, don't set domain to allow localhost
  return undefined;
};

/**
 * Base cookie options with security flags
 */
const getBaseCookieOptions = () => ({
  httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
  secure: isProd, // HTTPS only in production
  sameSite: isProd ? "none" : "lax", // Use "none" for cross-site cookies in production (requires secure: true)
  domain: getCookieDomain(),
  path: "/", // Available across all routes
});

/**
 * Set access token cookie (short-lived)
 * @param {Object} res - Express response object
 * @param {string} token - JWT access token
 */
export const setAccessTokenCookie = (res, token) => {
  res.cookie(COOKIE_CONFIG.ACCESS_TOKEN.name, token, {
    ...getBaseCookieOptions(),
    maxAge: COOKIE_CONFIG.ACCESS_TOKEN.maxAge,
  });
};

/**
 * Set refresh token cookie (long-lived)
 * @param {Object} res - Express response object
 * @param {string} token - JWT refresh token
 */
export const setRefreshTokenCookie = (res, token) => {
  res.cookie(COOKIE_CONFIG.REFRESH_TOKEN.name, token, {
    ...getBaseCookieOptions(),
    maxAge: COOKIE_CONFIG.REFRESH_TOKEN.maxAge,
  });
};

/**
 * Set user session info cookie (NOT httpOnly - for UI display only)
 * This contains non-sensitive display data only
 * @param {Object} res - Express response object
 * @param {Object} userData - User display data (NO sensitive info)
 */
export const setUserSessionCookie = (res, userData) => {
  // Only include safe, non-sensitive display data
  const safeUserData = {
    displayName: userData.displayName || userData.email?.split("@")[0],
    photoURL: userData.photoURL || null,
    emailVerified: userData.emailVerified || false,
  };

  res.cookie(COOKIE_CONFIG.USER_SESSION.name, JSON.stringify(safeUserData), {
    ...getBaseCookieOptions(),
    httpOnly: false, // Allow JavaScript to read for UI purposes
    maxAge: COOKIE_CONFIG.USER_SESSION.maxAge,
  });
};

/**
 * Set all auth cookies at once (convenience function)
 * @param {Object} res - Express response object
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token (optional)
 * @param {Object} userData - User display data
 */
export const setAuthCookies = (res, accessToken, refreshToken, userData) => {
  setAccessTokenCookie(res, accessToken);

  if (refreshToken) {
    setRefreshTokenCookie(res, refreshToken);
  }

  if (userData) {
    setUserSessionCookie(res, userData);
  }
};

/**
 * Clear a specific cookie
 * @param {Object} res - Express response object
 * @param {string} cookieName - Name of the cookie to clear
 */
export const clearCookie = (res, cookieName) => {
  res.clearCookie(cookieName, {
    domain: getCookieDomain(),
    path: "/",
  });
};

/**
 * Clear all auth cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  clearCookie(res, COOKIE_CONFIG.ACCESS_TOKEN.name);
  clearCookie(res, COOKIE_CONFIG.REFRESH_TOKEN.name);
  clearCookie(res, COOKIE_CONFIG.USER_SESSION.name);
};

/**
 * Get access token from request cookies
 * @param {Object} req - Express request object
 * @returns {string|null} - Access token or null
 */
export const getAccessTokenFromCookies = (req) => {
  return req.cookies?.[COOKIE_CONFIG.ACCESS_TOKEN.name] || null;
};

/**
 * Get refresh token from request cookies
 * @param {Object} req - Express request object
 * @returns {string|null} - Refresh token or null
 */
export const getRefreshTokenFromCookies = (req) => {
  return req.cookies?.[COOKIE_CONFIG.REFRESH_TOKEN.name] || null;
};

/**
 * Check if access token cookie exists
 * @param {Object} req - Express request object
 * @returns {boolean}
 */
export const hasAccessToken = (req) => {
  return !!req.cookies?.[COOKIE_CONFIG.ACCESS_TOKEN.name];
};

/**
 * Check if refresh token cookie exists
 * @param {Object} req - Express request object
 * @returns {boolean}
 */
export const hasRefreshToken = (req) => {
  return !!req.cookies?.[COOKIE_CONFIG.REFRESH_TOKEN.name];
};

// Export cookie names for reference
export const COOKIE_NAMES = {
  ACCESS_TOKEN: COOKIE_CONFIG.ACCESS_TOKEN.name,
  REFRESH_TOKEN: COOKIE_CONFIG.REFRESH_TOKEN.name,
  USER_SESSION: COOKIE_CONFIG.USER_SESSION.name,
};

export default {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setUserSessionCookie,
  setAuthCookies,
  clearCookie,
  clearAuthCookies,
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
  hasAccessToken,
  hasRefreshToken,
  COOKIE_NAMES,
};
