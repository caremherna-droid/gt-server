import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";
import { getFavoritesLimit } from "../../services/privilegesService.js";

// Add a game to user's favorites
export const addToFavorites = async (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.user.uid;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }

    // Check if the game exists
    const gameDoc = await db.collection("games").doc(gameId).get();
    if (!gameDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    // Check if the game is already in favorites
    const favoriteQuery = await db
      .collection("favorites")
      .where("userId", "==", userId)
      .where("gameId", "==", gameId)
      .get();

    if (!favoriteQuery.empty) {
      return res.status(409).json({
        success: false,
        error: "Game is already in favorites",
      });
    }

    // Check favorites limit based on user privileges
    const currentFavoritesQuery = await db
      .collection("favorites")
      .where("userId", "==", userId)
      .get();
    
    const currentFavoritesCount = currentFavoritesQuery.size;
    const favoritesLimit = await getFavoritesLimit(userId);

    if (currentFavoritesCount >= favoritesLimit) {
      // Determine which achievement unlocks the next tier
      let unlockMessage = "";
      if (favoritesLimit === 50) {
        unlockMessage = 'Earn the "Collector" achievement (25 favorites) to increase your limit to 100!';
      } else if (favoritesLimit === 100) {
        unlockMessage = 'Earn the "Critic" achievement (50 ratings) to increase your limit to 200!';
      }

      return res.status(403).json({
        success: false,
        error: `Favorites limit reached (${favoritesLimit}). ${unlockMessage}`,
        limit: favoritesLimit,
        current: currentFavoritesCount,
        unlockMessage,
      });
    }

    // Add to favorites
    const favoriteData = {
      userId,
      gameId,
      gameData: gameDoc.data(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const favoriteRef = await db.collection("favorites").add(favoriteData);

    // Track gamification (async, don't wait)
    import("../../services/gamificationService.js")
      .then(({ trackFavorite }) => trackFavorite(userId, gameId))
      .catch((err) => console.error("Gamification tracking error:", err));

    // Update user's favorites count
    const userRef = db.collection("users").doc(userId);
    try {
      await userRef.update({
        favoritesCount: admin.firestore.FieldValue.increment(1),
        lastUpdated: new Date().toISOString(),
      });
    } catch (updateError) {
      // If user document doesn't exist, create it
      if (updateError.code === "not-found") {
        await userRef.set({
          email: req.user.email,
          displayName: req.user.displayName || req.user.email,
          favoritesCount: 1,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
      } else {
        console.error("Error updating user favorites count:", updateError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Game added to favorites successfully",
      data: {
        id: favoriteRef.id,
        ...favoriteData,
      },
    });
  } catch (error) {
    console.error("Error adding to favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add game to favorites",
      details: error.message,
    });
  }
};

// Remove a game from user's favorites
export const removeFromFavorites = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.uid;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }

    // Find the favorite document
    const favoriteQuery = await db
      .collection("favorites")
      .where("userId", "==", userId)
      .where("gameId", "==", gameId)
      .get();

    if (favoriteQuery.empty) {
      return res.status(404).json({
        success: false,
        error: "Game not found in favorites",
      });
    }

    // Delete the favorite document
    const favoriteDoc = favoriteQuery.docs[0];
    await favoriteDoc.ref.delete();

    // Update user's favorites count
    const userRef = db.collection("users").doc(userId);
    try {
      await userRef.update({
        favoritesCount: admin.firestore.FieldValue.increment(-1),
        lastUpdated: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error("Error updating user favorites count:", updateError);
    }

    res.status(200).json({
      success: true,
      message: "Game removed from favorites successfully",
    });
  } catch (error) {
    console.error("Error removing from favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove game from favorites",
      details: error.message,
    });
  }
};

// Get user's favorite games
export const getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;

    // Simplified query without ordering for now - we'll sort in memory
    let query = db.collection("favorites").where("userId", "==", userId);

    const snapshot = await query.get();

    // Get all favorites and sort in memory to avoid index issues
    let favorites = [];
    for (const doc of snapshot.docs) {
      const favoriteData = doc.data();

      // Get fresh game data to ensure it's up to date
      const gameDoc = await db
        .collection("games")
        .doc(favoriteData.gameId)
        .get();

      if (gameDoc.exists) {
        const gameData = gameDoc.data();

        // Ensure the game data has required properties
        if (gameData && gameData.title) {
          favorites.push({
            id: doc.id,
            gameId: favoriteData.gameId,
            game: gameData,
            createdAt: favoriteData.createdAt,
            updatedAt: favoriteData.updatedAt,
          });
        } else {
          console.warn(
            `Game ${favoriteData.gameId} exists but has incomplete data:`,
            gameData
          );
        }
      } else {
        console.warn(`Game ${favoriteData.gameId} not found in database`);
      }
    }

    // Sort in memory
    favorites.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "title":
          aValue = a.game.title || "";
          bValue = b.game.title || "";
          break;
        case "rating":
          aValue = a.game.rating || 0;
          bValue = b.game.rating || 0;
          break;
        case "createdAt":
        default:
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const total = favorites.length;

    // Apply pagination in memory
    const paginatedFavorites = favorites.slice(
      offset,
      offset + parseInt(limit)
    );

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      success: true,
      data: paginatedFavorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Error getting user favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve favorites",
      details: error.message,
    });
  }
};

// Check if a game is in user's favorites
export const isFavorite = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.uid;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
      });
    }

    const favoriteQuery = await db
      .collection("favorites")
      .where("userId", "==", userId)
      .where("gameId", "==", gameId)
      .get();

    const isFavorite = !favoriteQuery.empty;
    let favoriteId = null;

    if (isFavorite) {
      favoriteId = favoriteQuery.docs[0].id;
    }

    res.status(200).json({
      success: true,
      data: {
        isFavorite,
        favoriteId,
      },
    });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check favorite status",
      details: error.message,
    });
  }
};

// Get user's favorites count
export const getFavoritesCount = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Simple query without ordering
    const favoritesQuery = await db
      .collection("favorites")
      .where("userId", "==", userId)
      .get();

    const count = favoritesQuery.size;

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Error getting favorites count:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get favorites count",
      details: error.message,
    });
  }
};

// Bulk remove favorites
export const bulkRemoveFavorites = async (req, res) => {
  try {
    const { gameIds } = req.body;
    const userId = req.user.uid;

    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Game IDs array is required",
      });
    }

    const batch = db.batch();
    let removedCount = 0;

    for (const gameId of gameIds) {
      const favoriteQuery = await db
        .collection("favorites")
        .where("userId", "==", userId)
        .where("gameId", "==", gameId)
        .get();

      if (!favoriteQuery.empty) {
        batch.delete(favoriteQuery.docs[0].ref);
        removedCount++;
      }
    }

    await batch.commit();

    // Update user's favorites count
    if (removedCount > 0) {
      const userRef = db.collection("users").doc(userId);
      try {
        await userRef.update({
          favoritesCount: admin.firestore.FieldValue.increment(-removedCount),
          lastUpdated: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error("Error updating user favorites count:", updateError);
      }
    }

    res.status(200).json({
      success: true,
      message: `${removedCount} games removed from favorites`,
      data: { removedCount },
    });
  } catch (error) {
    console.error("Error bulk removing favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to bulk remove favorites",
      details: error.message,
    });
  }
};
