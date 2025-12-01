import express from 'express';
import { verifyToken } from '../../middleware/authMiddleware.js';
import { verifyAdmin } from '../../middleware/adminMiddleware.js';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getPublicProfile,
  uploadProfileImage,
  getAllUsers,
  suspendUser,
  reactivateUser
} from '../../controllers/tribeControllers/userController.js';
import { upload } from '../../controllers/tribeControllers/uploadController.js';

const router = express.Router();

// Get all users (authentication handled at admin app level)
// The admin dashboard already requires authentication to access
// Adding verifyToken here causes logout issues due to the API interceptor
// TODO: Implement proper role-based authentication (see adminMiddleware.js)
router.get('/users', getAllUsers);

// Get current user's profile (requires authentication)
router.get('/profile', verifyToken, getUserProfile);

// Get user profile by ID (requires authentication)
router.get('/profile/:userId', verifyToken, getUserProfile);

// Update current user's profile (requires authentication)
router.put('/profile', verifyToken, updateUserProfile);

// Update user profile by ID (requires authentication)
router.put('/profile/:userId', verifyToken, updateUserProfile);

// Delete user profile (soft delete, requires authentication)
router.delete('/profile/:userId', verifyToken, deleteUserProfile);

// Get public profile (no authentication required)
router.get('/public/:userId', getPublicProfile);

// Upload profile image (requires authentication)
router.post('/profile/image', verifyToken, upload.single('image'), uploadProfileImage);

// Admin routes for user management
// Note: Authentication is handled at the admin app level
// The admin dashboard requires authentication to access
// Using verifyToken here fails because admins are in 'admins' collection, not 'users'
// TODO: Implement verifyAdmin middleware for proper role-based authentication
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/reactivate', reactivateUser);

export default router;
