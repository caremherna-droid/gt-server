import { db } from '../../config/firebase.js';
import admin from '../../config/firebase.js';
import { getBioLengthLimit, isProfileFeatured } from '../../services/privilegesService.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.uid;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    
    // Remove sensitive information
    delete userData.password;
    
    res.json({
      success: true,
      data: {
        id: userDoc.id,
        ...userData
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.uid;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const {
      displayName,
      photoURL,
      bio,
      favoriteGenre,
      gamerTag,
      location,
      preferences
    } = req.body;

    // Prepare update data
    const updateData = {
      lastUpdated: new Date().toISOString()
    };

    // Only update fields that are provided
    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (bio !== undefined) {
      // Check bio length limit based on user privileges
      const bioLengthLimit = await getBioLengthLimit(userId);
      if (bio && bio.length > bioLengthLimit) {
        // Determine which achievement unlocks the next tier
        let unlockMessage = "";
        if (bioLengthLimit === 200) {
          unlockMessage = 'Earn the "Social Butterfly" achievement (20 comments) to increase your limit to 500 characters, or "Explorer" achievement (10 games) for 1000 characters!';
        } else if (bioLengthLimit === 500) {
          unlockMessage = 'Earn the "Explorer" achievement (10 games) to increase your limit to 1000 characters!';
        }

        return res.status(400).json({
          success: false,
          message: `Bio cannot exceed ${bioLengthLimit} characters. ${unlockMessage}`,
          limit: bioLengthLimit,
          current: bio.length,
          unlockMessage,
        });
      }
      updateData.bio = bio;
    }
    if (favoriteGenre !== undefined) updateData.favoriteGenre = favoriteGenre;
    if (gamerTag !== undefined) updateData.gamerTag = gamerTag;
    if (location !== undefined) updateData.location = location;
    if (preferences !== undefined) updateData.preferences = preferences;

    // Update featured status based on achievements
    const isFeatured = await isProfileFeatured(userId);
    if (isFeatured) {
      updateData.isFeatured = true;
      updateData.featuredBadge = "Featured User";
    }

    // Update user document in Firestore
    const userRef = db.collection('users').doc(userId);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      const userData = {
        email: req.user?.email || '',
        emailVerified: req.user?.emailVerified || false,
        createdAt: new Date().toISOString(),
        ...updateData
      };
      
      await userRef.set(userData);
      
      res.json({
        success: true,
        message: 'User profile created successfully',
        data: {
          id: userId,
          ...userData
        }
      });
    } else {
      // Update existing user document
      await userRef.update(updateData);
      
      // Get updated document
      const updatedDoc = await userRef.get();
      const updatedData = updatedDoc.data();
      
      // Also update Firebase Auth profile if displayName or photoURL changed
      if (displayName !== undefined || photoURL !== undefined) {
        const authUpdateData = {};
        if (displayName !== undefined) authUpdateData.displayName = displayName;
        if (photoURL !== undefined) authUpdateData.photoURL = photoURL;
        
        try {
          await admin.auth().updateUser(userId, authUpdateData);
        } catch (authError) {
          console.error('Error updating Firebase Auth profile:', authError);
          // Continue with Firestore update even if Auth update fails
        }
      }
      
      // Remove sensitive information
      delete updatedData.password;
      
      res.json({
        success: true,
        message: 'User profile updated successfully',
        data: {
          id: userId,
          ...updatedData
        }
      });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user profile',
      error: error.message
    });
  }
};

// Delete user profile (soft delete)
export const deleteUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.uid;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Soft delete by updating status
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user profile',
      error: error.message
    });
  }
};

// Get user's public profile (limited information)
export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    
    // Only return public information
    const publicData = {
      id: userDoc.id,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      bio: userData.bio,
      favoriteGenre: userData.favoriteGenre,
      gamerTag: userData.gamerTag,
      location: userData.location,
      createdAt: userData.createdAt
    };
    
    res.json({
      success: true,
      data: publicData
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching public profile',
      error: error.message
    });
  }
};

// Upload user profile image
export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // The image upload should be handled by the upload middleware
    // and the file URL should be available in req.file
    const imageUrl = req.file.url || req.file.path;
    
    // Update user profile with new image URL
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      photoURL: imageUrl,
      lastUpdated: new Date().toISOString()
    });

    // Also update Firebase Auth profile
    try {
      await admin.auth().updateUser(userId, { photoURL: imageUrl });
    } catch (authError) {
      console.error('Error updating Firebase Auth profile image:', authError);
      // Continue even if Auth update fails
    }

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        photoURL: imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile image',
      error: error.message
    });
  }
};

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      return res.json({
        success: true,
        data: [],
        message: 'No users found'
      });
    }

    // Map through all users and remove sensitive information
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      
      // Remove sensitive information
      delete userData.password;
      
      users.push({
        id: doc.id,
        ...userData
      });
    });

    // Sort by creation date (newest first)
    users.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Suspend user account (Admin only)
export const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Disable user in Firebase Authentication
    try {
      await admin.auth().updateUser(userId, {
        disabled: true
      });
    } catch (authError) {
      console.error('Error disabling user in Firebase Auth:', authError);
      // Continue with database update even if Auth update fails
    }

    // Update user status in Firestore
    await userRef.update({
      status: 'suspended',
      suspendedAt: new Date().toISOString(),
      suspensionReason: reason || 'No reason provided',
      suspendedBy: req.user?.uid || 'admin',
      lastUpdated: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User account suspended successfully',
      data: {
        userId,
        status: 'suspended',
        suspendedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending user account',
      error: error.message
    });
  }
};

// Reactivate user account (Admin only)
export const reactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Re-enable user in Firebase Authentication
    try {
      await admin.auth().updateUser(userId, {
        disabled: false
      });
    } catch (authError) {
      console.error('Error enabling user in Firebase Auth:', authError);
      // Continue with database update even if Auth update fails
    }

    // Update user status in Firestore
    await userRef.update({
      status: 'active',
      reactivatedAt: new Date().toISOString(),
      reactivatedBy: req.user?.uid || 'admin',
      suspensionReason: admin.firestore.FieldValue.delete(),
      lastUpdated: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User account reactivated successfully',
      data: {
        userId,
        status: 'active',
        reactivatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating user account',
      error: error.message
    });
  }
};
