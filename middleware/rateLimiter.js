import rateLimit from "express-rate-limit";
import { getAccessTokenFromCookies } from "../utils/cookieUtils.js";

/**
 * Rate Limiter Configuration for Authentication Endpoints
 * Provides protection against brute force attacks and abuse
 */

// Stricter rate limiter for sensitive auth operations (login, register)
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: "Too many authentication attempts",
    message:
      "Too many login attempts from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address for tracking
  keyGenerator: (req) => {
    // Use IP address, or user ID if authenticated
    return req.ip || req.connection.remoteAddress;
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message:
        "Too many requests from this IP address. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
  // Skip rate limiting for successful authentications (to avoid blocking legitimate users)
  skip: (req) => {
    // Skip if user is already authenticated (for refresh token endpoint)
    const token = getAccessTokenFromCookies(req);
    return !!token;
  },
});

// Moderate rate limiter for token verification and refresh
export const moderateAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: "Too many requests",
    message: "Too many token verification requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Lenient rate limiter for less sensitive operations (check-email, etc.)
export const lenientAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: "Too many requests",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Special rate limiter for Google OAuth (can be more lenient as Google handles some security)
export const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 Google auth attempts per windowMs
  message: {
    success: false,
    error: "Too many Google authentication attempts",
    message:
      "Too many Google sign-in attempts from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message:
        "Too many Google authentication attempts. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Rate limiter for token refresh endpoint (more lenient for legitimate users)
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Allow more refresh requests (legitimate users refresh frequently)
  message: {
    success: false,
    error: "Too many token refresh requests",
    message: "Too many token refresh attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Try to use user ID if available, otherwise use IP
    const token = getAccessTokenFromCookies(req);
    if (token) {
      // For authenticated users, we can be more lenient
      return req.ip || req.connection.remoteAddress;
    }
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message: "Too many token refresh requests. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

export default {
  strictAuthLimiter,
  moderateAuthLimiter,
  lenientAuthLimiter,
  googleAuthLimiter,
  refreshTokenLimiter,
};

