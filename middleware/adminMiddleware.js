import { verifyToken } from './authMiddleware.js';
import { db } from '../config/firebase.js';

// Middleware to check if user is an admin
export const verifyAdmin = async (req, res, next) => {
  try {
    // First verify the token
    await verifyToken(req, res, async () => {
      // If token verification passed, check if user is admin
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user has admin role in Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({
          success: false,
          message: 'User not found'
        });
      }

      const userData = userDoc.data();
      
      // Check if user has admin role
      if (userData.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // User is admin, proceed
      next();
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying admin access',
      error: error.message
    });
  }
};

// Middleware to optionally check admin but not fail if not admin
export const checkAdminOptional = async (req, res, next) => {
  try {
    // First verify the token
    await verifyToken(req, res, async () => {
      const userId = req.user?.uid;
      
      if (userId) {
        // Check if user has admin role
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          req.isAdmin = userData.role === 'admin';
        } else {
          req.isAdmin = false;
        }
      } else {
        req.isAdmin = false;
      }

      next();
    });
  } catch (error) {
    req.isAdmin = false;
    next();
  }
};

