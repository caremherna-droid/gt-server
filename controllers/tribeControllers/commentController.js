import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";

const commentsCollection = db.collection("comments");

// Add a comment to a game
export const addComment = async (req, res) => {
  try {
    console.log('Add comment request received:', {
      body: req.body,
      user: req.user,
      headers: req.headers.authorization?.substring(0, 50) + '...'
    }); // Debug log
    
    const { gameId, content } = req.body;
    
    // Make sure we have a valid user from the middleware
    if (!req.user || !req.user.uid) {
      console.error('No valid user found in request:', req.user);
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }
    
    const userId = req.user.uid;
    
    if (!gameId || !content) {
      console.log('Missing gameId or content:', { gameId, content });
      return res.status(400).json({ 
        success: false, 
        error: "Game ID and content are required" 
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Comment cannot be empty" 
      });
    }

    // Get comment length limit based on user privileges
    const { getCommentLengthLimit } = await import("../../services/privilegesService.js");
    const commentLengthLimit = await getCommentLengthLimit(userId);

    if (content.length > commentLengthLimit) {
      // Determine which achievement unlocks the next tier
      let unlockMessage = "";
      if (commentLengthLimit === 500) {
        unlockMessage = 'Earn the "Social Butterfly" achievement (20 comments) to increase your limit to 1000 characters!';
      } else if (commentLengthLimit === 1000) {
        unlockMessage = 'Earn the "Critic" achievement (50 ratings) to increase your limit to 2000 characters!';
      }

      return res.status(400).json({ 
        success: false, 
        error: `Comment cannot exceed ${commentLengthLimit} characters. ${unlockMessage}`,
        limit: commentLengthLimit,
        current: content.length,
        unlockMessage,
      });
    }

    console.log('Processing comment for userId:', userId);
    console.log('User info from middleware:', req.user);
    
    // Try to get user info from Firebase Auth first
    let userName = 'Anonymous';
    let userEmail = 'unknown@email.com';
    let userAvatar = null;
    
    try {
      // First try to get user from Firebase Auth
      const userRecord = await admin.auth().getUser(userId);
      console.log('Firebase Auth user record found:', {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      });
      
      userName = userRecord.displayName || userRecord.email?.split('@')[0] || 'Anonymous';
      userEmail = userRecord.email || 'unknown@email.com';
      userAvatar = userRecord.photoURL || null;
      
    } catch (authError) {
      console.log('Firebase Auth lookup failed, using token data:', authError.message);
      
      // If Firebase Auth fails, use the user info we got from the token
      if (req.user.email) {
        userEmail = req.user.email;
        userName = req.user.displayName || req.user.email.split('@')[0];
      }
      if (req.user.photoURL) {
        userAvatar = req.user.photoURL;
      }
      
      console.log('Using fallback user data:', {
        userId,
        userName,
        userEmail,
        userAvatar
      });
    }

    const commentData = {
      gameId,
      userId, // This should be the actual user's UID, not the service account
      userName,
      userEmail,
      userAvatar,
      content: content.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log('Final comment data to be saved:', {
      ...commentData,
      createdAt: '[ServerTimestamp]',
      updatedAt: '[ServerTimestamp]'
    });

    const docRef = await commentsCollection.add(commentData);
    
    console.log('Comment added successfully with ID:', docRef.id);
    
    // Fetch the created document to get the actual timestamp
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    
    const comment = {
      id: docRef.id,
      ...createdData,
      createdAt: createdData.createdAt ? createdData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: createdData.updatedAt ? createdData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };

    // Track gamification (async, don't wait)
    import("../../services/gamificationService.js")
      .then(({ trackComment }) => trackComment(userId, gameId))
      .catch((err) => console.error("Gamification tracking error:", err));

    console.log('Final comment response:', comment);

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add comment",
      details: error.message
    });
  }
};

// Get comments for a specific game
export const getGameComments = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ 
        success: false, 
        error: "Game ID is required" 
      });
    }

    console.log("Fetching comments for gameId:", gameId);

    const snapshot = await commentsCollection
      .where("gameId", "==", gameId)
      .get();

    const comments = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? 
          (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : 
          new Date().toISOString(),
        updatedAt: data.updatedAt ? 
          (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt) : 
          new Date().toISOString(),
      });
    });

    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`Found ${comments.length} comments for game ${gameId}`);

    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch comments",
      details: error.message
    });
  }
};

// Update a comment (only by the owner)
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.uid;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        error: "Content is required" 
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Comment cannot be empty" 
      });
    }

    // Get comment length limit based on user privileges
    const { getCommentLengthLimit } = await import("../../services/privilegesService.js");
    const commentLengthLimit = await getCommentLengthLimit(userId);

    if (content.length > commentLengthLimit) {
      // Determine which achievement unlocks the next tier
      let unlockMessage = "";
      if (commentLengthLimit === 500) {
        unlockMessage = 'Earn the "Social Butterfly" achievement (20 comments) to increase your limit to 1000 characters!';
      } else if (commentLengthLimit === 1000) {
        unlockMessage = 'Earn the "Critic" achievement (50 ratings) to increase your limit to 2000 characters!';
      }

      return res.status(400).json({ 
        success: false, 
        error: `Comment cannot exceed ${commentLengthLimit} characters. ${unlockMessage}`,
        limit: commentLengthLimit,
        current: content.length,
        unlockMessage,
      });
    }

    const commentRef = commentsCollection.doc(commentId);
    const doc = await commentRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Comment not found" 
      });
    }

    const commentData = doc.data();
    
    if (commentData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: "You can only edit your own comments" 
      });
    }

    await commentRef.update({
      content: content.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await commentRef.get();
    const updatedData = updatedDoc.data();
    
    const updatedComment = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt ? updatedData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: updatedData.updatedAt ? updatedData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update comment",
      details: error.message
    });
  }
};

// Delete a comment (only by the owner)
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.uid;

    const commentRef = commentsCollection.doc(commentId);
    const doc = await commentRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Comment not found" 
      });
    }

    const commentData = doc.data();
    
    if (commentData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: "You can only delete your own comments" 
      });
    }

    await commentRef.delete();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete comment",
      details: error.message
    });
  }
};

// Get comments by a specific user
export const getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    const snapshot = await commentsCollection
      .where("userId", "==", userId)
      .get();

    const comments = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      });
    });

    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error("Error fetching user comments:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user comments",
      details: error.message
    });
  }
};

// Get all comments (admin only)
export const getAllComments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      gameId, 
      sortBy = 'newest' 
    } = req.query;

    console.log('Getting all comments with params:', { page, limit, status, gameId, sortBy });

    let query = commentsCollection;

    // Apply filters
    if (status && status !== 'all') {
      query = query.where("status", "==", status);
    }

    if (gameId) {
      query = query.where("gameId", "==", gameId);
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        query = query.orderBy('createdAt', 'asc');
        break;
      case 'newest':
      default:
        query = query.orderBy('createdAt', 'desc');
        break;
    }

    // Get the total count for pagination
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.offset(offset).limit(parseInt(limit));

    const snapshot = await query.get();
    const comments = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        status: data.status || 'pending', // Default status
        createdAt: data.createdAt ? 
          (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : 
          new Date().toISOString(),
        updatedAt: data.updatedAt ? 
          (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt) : 
          new Date().toISOString(),
      });
    });

    console.log(`Found ${comments.length} comments out of ${total} total`);

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching all comments:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch comments",
      details: error.message
    });
  }
};

// Approve a comment (admin only)
export const approveComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    console.log('Approving comment:', commentId);

    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Comment not found" 
      });
    }

    await commentRef.update({
      status: 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: req.user.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Comment approved successfully');

    res.status(200).json({
      success: true,
      message: "Comment approved successfully"
    });
  } catch (error) {
    console.error("Error approving comment:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to approve comment",
      details: error.message
    });
  }
};

// Reject a comment (admin only)
export const rejectComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    console.log('Rejecting comment:', commentId);

    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Comment not found" 
      });
    }

    await commentRef.update({
      status: 'rejected',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectedBy: req.user.uid,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Comment rejected successfully');

    res.status(200).json({
      success: true,
      message: "Comment rejected successfully"
    });
  } catch (error) {
    console.error("Error rejecting comment:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to reject comment",
      details: error.message
    });
  }
};

// Flag a comment (admin only)
export const flagComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;

    console.log('Flagging comment:', commentId, 'Reason:', reason);

    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Comment not found" 
      });
    }

    await commentRef.update({
      status: 'flagged',
      flagReason: reason || 'No reason provided',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      flaggedBy: req.user.uid,
      flaggedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Comment flagged successfully');

    res.status(200).json({
      success: true,
      message: "Comment flagged successfully"
    });
  } catch (error) {
    console.error("Error flagging comment:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to flag comment",
      details: error.message
    });
  }
};

// Get comment statistics (admin only)
export const getCommentStats = async (req, res) => {
  try {
    console.log('Getting comment statistics');

    const [pendingSnapshot, approvedSnapshot, rejectedSnapshot, flaggedSnapshot] = await Promise.all([
      commentsCollection.where('status', '==', 'pending').get(),
      commentsCollection.where('status', '==', 'approved').get(),
      commentsCollection.where('status', '==', 'rejected').get(),
      commentsCollection.where('status', '==', 'flagged').get()
    ]);

    const stats = {
      pending: pendingSnapshot.size,
      approved: approvedSnapshot.size,
      rejected: rejectedSnapshot.size,
      flagged: flaggedSnapshot.size,
      total: pendingSnapshot.size + approvedSnapshot.size + rejectedSnapshot.size + flaggedSnapshot.size
    };

    console.log('Comment statistics:', stats);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error getting comment statistics:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get comment statistics",
      details: error.message
    });
  }
}; 