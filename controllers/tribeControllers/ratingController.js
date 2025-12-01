import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";

const ratingsCollection = db.collection("ratings");

// Submit a rating for a game
export const submitRating = async (req, res) => {
  try {
    console.log('Submit rating request received:', {
      body: req.body,
      user: req.user,
      headers: req.headers.authorization?.substring(0, 50) + '...'
    });
    
    const { gameId, rating } = req.body;
    
    // Make sure we have a valid user from the middleware
    if (!req.user || !req.user.uid) {
      console.error('No valid user found in request:', req.user);
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }
    
    const userId = req.user.uid;
    
    if (!gameId || rating === undefined || rating === null) {
      console.log('Missing gameId or rating:', { gameId, rating });
      return res.status(400).json({ 
        success: false, 
        error: "Game ID and rating are required" 
      });
    }

    // Validate rating value
    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating must be a number between 1 and 5" 
      });
    }

    // Check if user has already rated this game
    const existingRatingQuery = await ratingsCollection
      .where("gameId", "==", gameId)
      .where("userId", "==", userId)
      .get();

    if (!existingRatingQuery.empty) {
      return res.status(400).json({ 
        success: false, 
        error: "You have already rated this game. Use update endpoint to modify your rating." 
      });
    }

    console.log('Processing rating for userId:', userId);
    
    // Try to get user info from Firebase Auth first
    let userName = 'Anonymous';
    let userEmail = 'unknown@email.com';
    let userAvatar = null;
    
    try {
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
      
      if (req.user.email) {
        userEmail = req.user.email;
        userName = req.user.displayName || req.user.email.split('@')[0];
      }
      if (req.user.photoURL) {
        userAvatar = req.user.photoURL;
      }
    }

    const ratingData = {
      gameId,
      userId,
      userName,
      userEmail,
      userAvatar,
      rating: numRating,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log('Final rating data to be saved:', {
      ...ratingData,
      createdAt: '[ServerTimestamp]',
      updatedAt: '[ServerTimestamp]'
    });

    const docRef = await ratingsCollection.add(ratingData);
    
    console.log('Rating added successfully with ID:', docRef.id);
    
    // Fetch the created document to get the actual timestamp
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    
    const rating_response = {
      id: docRef.id,
      ...createdData,
      createdAt: createdData.createdAt ? createdData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: createdData.updatedAt ? createdData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };

    // Update game's average rating
    await updateGameAverageRating(gameId);

    // Track gamification (async, don't wait)
    import("../../services/gamificationService.js")
      .then(({ trackRating }) => trackRating(userId, gameId))
      .catch((err) => console.error("Gamification tracking error:", err));

    console.log('Final rating response:', rating_response);

    res.status(201).json({
      success: true,
      data: rating_response
    });
  } catch (error) {
    console.error("Error submitting rating:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit rating",
      details: error.message
    });
  }
};

// Get ratings for a specific game
export const getGameRatings = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ 
        success: false, 
        error: "Game ID is required" 
      });
    }

    console.log("Fetching ratings for gameId:", gameId);

    // Remove orderBy to avoid index requirement, we'll sort in memory
    const snapshot = await ratingsCollection
      .where("gameId", "==", gameId)
      .get();

    const ratings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      ratings.push({
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

    // Sort by createdAt in memory (most recent first)
    ratings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`Found ${ratings.length} ratings for game ${gameId}`);

    res.status(200).json({
      success: true,
      data: ratings
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch ratings",
      details: error.message
    });
  }
};

// Get user's rating for a specific game
export const getUserRating = async (req, res) => {
  try {
    const { gameId, userId } = req.params;
    
    if (!gameId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "Game ID and User ID are required" 
      });
    }

    // Verify that the requesting user can access this rating
    if (req.user.uid !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: "You can only access your own ratings" 
      });
    }

    console.log("Fetching user rating for gameId:", gameId, "userId:", userId);

    const snapshot = await ratingsCollection
      .where("gameId", "==", gameId)
      .where("userId", "==", userId)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Rating not found"
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const rating = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt ? 
        (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : 
        new Date().toISOString(),
      updatedAt: data.updatedAt ? 
        (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt) : 
        new Date().toISOString(),
    };

    console.log("Found user rating:", rating);

    res.status(200).json({
      success: true,
      data: rating
    });
  } catch (error) {
    console.error("Error fetching user rating:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user rating",
      details: error.message
    });
  }
};

// Update a rating (only by the owner)
export const updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { rating } = req.body;
    const userId = req.user.uid;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating is required" 
      });
    }

    // Validate rating value
    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating must be a number between 1 and 5" 
      });
    }

    const ratingRef = ratingsCollection.doc(ratingId);
    const doc = await ratingRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Rating not found" 
      });
    }

    const ratingData = doc.data();
    
    if (ratingData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: "You can only edit your own ratings" 
      });
    }

    await ratingRef.update({
      rating: numRating,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await ratingRef.get();
    const updatedData = updatedDoc.data();
    
    const updatedRating = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt ? updatedData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: updatedData.updatedAt ? updatedData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };

    // Update game's average rating
    await updateGameAverageRating(ratingData.gameId);

    res.status(200).json({
      success: true,
      data: updatedRating
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update rating",
      details: error.message
    });
  }
};

// Delete a rating (only by the owner)
export const deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.uid;

    const ratingRef = ratingsCollection.doc(ratingId);
    const doc = await ratingRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Rating not found" 
      });
    }

    const ratingData = doc.data();
    
    if (ratingData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: "You can only delete your own ratings" 
      });
    }

    const gameId = ratingData.gameId;
    await ratingRef.delete();

    // Update game's average rating
    await updateGameAverageRating(gameId);

    res.status(200).json({
      success: true,
      message: "Rating deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting rating:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete rating",
      details: error.message
    });
  }
};

// Get ratings by a specific user
export const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    // Remove orderBy to avoid index requirement, we'll sort in memory
    const snapshot = await ratingsCollection
      .where("userId", "==", userId)
      .get();

    const ratings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      ratings.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      });
    });

    // Sort by createdAt in memory (most recent first)
    ratings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: ratings
    });
  } catch (error) {
    console.error("Error fetching user ratings:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user ratings",
      details: error.message
    });
  }
};

// Helper function to update game's average rating
const updateGameAverageRating = async (gameId) => {
  try {
    console.log('Updating average rating for game:', gameId);
    
    const ratingsSnapshot = await ratingsCollection
      .where("gameId", "==", gameId)
      .get();

    if (ratingsSnapshot.empty) {
      // No ratings, set average to 0
      await db.collection("games").doc(gameId).update({
        rating: 0,
        ratingCount: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return;
    }

    let totalRating = 0;
    let count = 0;

    ratingsSnapshot.forEach((doc) => {
      const data = doc.data();
      totalRating += data.rating;
      count++;
    });

    const averageRating = totalRating / count;

    await db.collection("games").doc(gameId).update({
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      ratingCount: count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Updated game ${gameId} average rating to ${averageRating} (${count} ratings)`);
  } catch (error) {
    console.error('Error updating game average rating:', error);
  }
};

// Get rating statistics for a game
export const getGameRatingStats = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ 
        success: false, 
        error: "Game ID is required" 
      });
    }

    console.log("Fetching rating stats for gameId:", gameId);

    const snapshot = await ratingsCollection
      .where("gameId", "==", gameId)
      .get();

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;
    let count = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const rating = Math.round(data.rating);
      if (rating >= 1 && rating <= 5) {
        breakdown[rating]++;
        totalRating += data.rating;
        count++;
      }
    });

    const average = count > 0 ? totalRating / count : 0;

    const stats = {
      average: Math.round(average * 10) / 10,
      total: count,
      breakdown
    };

    console.log(`Rating stats for game ${gameId}:`, stats);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching rating stats:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch rating stats",
      details: error.message
    });
  }
};
