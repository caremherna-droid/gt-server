import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

const gamesCollection = db.collection("games");

// Add Game
export const addGame = async (req, res) => {
  try {
    const gameData = {
      ...req.body,
      platforms: req.body.platforms || [],
      specialCategories: req.body.specialCategories || [],
      featured: req.body.featured || false,
      premium: req.body.premium || false,
      exclusive: req.body.exclusive || false,
      tournament: req.body.tournament || false,
      // Badge markers
      isNew: req.body.isNew || false,
      isUpdated: req.body.isUpdated || false,
      isTopRated: req.body.isTopRated || false,
      isHot: req.body.isHot || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (gameData.systemRequirements) {
      delete gameData.systemRequirements;
    }

    const docRef = await gamesCollection.add(gameData);
    const game = {
      id: docRef.id,
      ...gameData,
    };

    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// All Games
export const getAllGames = async (req, res) => {
  try {
    const snapshot = await gamesCollection.get();
    const games = [];

    snapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Game by ID
export const getGameById = async (req, res) => {
  try {
    const doc = await gamesCollection.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const game = {
      id: doc.id,
      ...doc.data(),
    };

    res.status(200).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Game
export const updateGame = async (req, res) => {
  try {
    const gameRef = gamesCollection.doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    // If there's a new image, handle the upload
    if (req.file) {
      const oldData = doc.data();
      // Delete old image if exists
      if (oldData.public_id) {
        try {
          await storage.deleteFile(oldData.public_id);
        } catch (error) {
          console.error("Error deleting old game image:", error);
        }
      }

      // Upload new image
      const filename = `${STORAGE_PATHS.GAMES.IMAGES}${uuidv4()}-${
        req.file.originalname
      }`;
      await storage.uploadFromBuffer(
        req.file.buffer,
        filename,
        req.file.mimetype
      );

      updateData.imageUrl = await storage.getSignedUrl(filename);
      updateData.public_id = filename;
    }

    // If there's a new game file, handle the upload
    if (req.files && req.files.game) {
      const oldData = doc.data();
      // Delete old game file if exists
      if (oldData.game_file_id) {
        try {
          await storage.deleteFile(oldData.game_file_id);
        } catch (error) {
          console.error("Error deleting old game file:", error);
        }
      }

      // Upload new game file
      const filename = `${STORAGE_PATHS.GAMES.FILES}${uuidv4()}-${
        req.files.game.originalname
      }`;
      await storage.uploadFromBuffer(
        req.files.game.buffer,
        filename,
        req.files.game.mimetype
      );

      updateData.downloadUrl = await storage.getSignedUrl(filename);
      updateData.game_file_id = filename;
      updateData.fileSize = req.files.game.size;
      updateData.fileName = req.files.game.originalname;
    }

    // Handle website URL from zip upload (if provided in body)
    // This allows setting demoUrl and downloadUrl from zip upload response
    if (req.body.websiteEntryPointUrl && (!updateData.demoUrl || updateData.demoUrl.trim() === '')) {
      updateData.demoUrl = req.body.websiteEntryPointUrl;
    }
    if (req.body.websiteEntryPointUrl && (!updateData.downloadUrl || updateData.downloadUrl.trim() === '')) {
      updateData.downloadUrl = req.body.websiteEntryPointUrl;
    }

    await gameRef.update(updateData);

    const updatedDoc = await gameRef.get();
    const game = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Game
export const deleteGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const gameRef = gamesCollection.doc(gameId);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const gameData = doc.data();
    const deletionErrors = [];

    // Delete game image from Firebase Storage if it exists
    if (gameData.public_id) {
      try {
        await storage.deleteFile(gameData.public_id);
        console.log(`Deleted game image: ${gameData.public_id}`);
      } catch (error) {
        console.error("Error deleting game image:", error);
        deletionErrors.push(`Image deletion failed: ${error.message}`);
      }
    }

    // Delete game file from Firebase Storage if it exists
    if (gameData.game_file_id) {
      try {
        await storage.deleteFile(gameData.game_file_id);
        console.log(`Deleted game file: ${gameData.game_file_id}`);
      } catch (error) {
        console.error("Error deleting game file:", error);
        deletionErrors.push(`File deletion failed: ${error.message}`);
      }
    }

    // Delete all related data in parallel
    let deletedCounts = {
      comments: 0,
      ratings: 0,
      favorites: 0,
      downloads: 0,
      sessions: 0
    };

    try {
      const batch = db.batch();

      // Delete all comments for this game
      const commentsSnapshot = await db.collection("comments")
        .where("gameId", "==", gameId)
        .get();
      commentsSnapshot.forEach((commentDoc) => {
        batch.delete(commentDoc.ref);
      });
      deletedCounts.comments = commentsSnapshot.size;
      console.log(`Deleting ${deletedCounts.comments} comments for game ${gameId}`);

      // Delete all ratings for this game
      const ratingsSnapshot = await db.collection("ratings")
        .where("gameId", "==", gameId)
        .get();
      ratingsSnapshot.forEach((ratingDoc) => {
        batch.delete(ratingDoc.ref);
      });
      deletedCounts.ratings = ratingsSnapshot.size;
      console.log(`Deleting ${deletedCounts.ratings} ratings for game ${gameId}`);

      // Delete all favorites for this game
      const favoritesSnapshot = await db.collection("favorites")
        .where("gameId", "==", gameId)
        .get();
      favoritesSnapshot.forEach((favoriteDoc) => {
        batch.delete(favoriteDoc.ref);
      });
      deletedCounts.favorites = favoritesSnapshot.size;
      console.log(`Deleting ${deletedCounts.favorites} favorites for game ${gameId}`);

      // Delete all download history for this game
      const downloadsSnapshot = await db.collection("downloadHistory")
        .where("gameId", "==", gameId)
        .get();
      downloadsSnapshot.forEach((downloadDoc) => {
        batch.delete(downloadDoc.ref);
      });
      deletedCounts.downloads = downloadsSnapshot.size;
      console.log(`Deleting ${deletedCounts.downloads} download records for game ${gameId}`);

      // Delete all game sessions for this game
      const sessionsSnapshot = await db.collection("gameSessions")
        .where("gameId", "==", gameId)
        .get();
      sessionsSnapshot.forEach((sessionDoc) => {
        batch.delete(sessionDoc.ref);
      });
      deletedCounts.sessions = sessionsSnapshot.size;
      console.log(`Deleting ${deletedCounts.sessions} game sessions for game ${gameId}`);

      // Delete the game document itself
      batch.delete(gameRef);

      // Commit all deletions
      await batch.commit();
      console.log(`Successfully deleted game ${gameId} and all related data`);
    } catch (error) {
      console.error("Error deleting related data:", error);
      deletionErrors.push(`Related data deletion failed: ${error.message}`);
      // Still try to delete the game document
      try {
        await gameRef.delete();
      } catch (deleteError) {
        return res.status(500).json({ 
          error: "Failed to delete game",
          details: deleteError.message,
          partialErrors: deletionErrors
        });
      }
    }

    const responseMessage = deletionErrors.length > 0
      ? `Game deleted successfully with some warnings: ${deletionErrors.join('; ')}`
      : "Game deleted successfully";

    res.status(200).json({ 
      message: responseMessage,
      deleted: {
        game: true,
        ...deletedCounts
      },
      warnings: deletionErrors.length > 0 ? deletionErrors : undefined
    });
  } catch (error) {
    console.error("Error deleting game:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Featured Games
export const getFeaturedGames = async (req, res) => {
  try {
    const snapshot = await gamesCollection.where("featured", "==", true).get();
    const games = [];

    snapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Premium Games
export const getPremiumGames = async (req, res) => {
  try {
    const snapshot = await gamesCollection.where("premium", "==", true).get();
    const games = [];

    snapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Exclusive Games
export const getExclusiveGames = async (req, res) => {
  try {
    const snapshot = await gamesCollection.where("exclusive", "==", true).get();
    const games = [];

    snapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Tournament Games
export const getTournamentGames = async (req, res) => {
  try {
    const snapshot = await gamesCollection
      .where("tournament", "==", true)
      .get();
    const games = [];

    snapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Featured Status
export const toggleFeatured = async (req, res) => {
  try {
    const gameRef = gamesCollection.doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const currentData = doc.data();
    const newFeaturedStatus = !currentData.featured;

    await gameRef.update({
      featured: newFeaturedStatus,
      updatedAt: new Date(),
    });

    const updatedDoc = await gameRef.get();
    const game = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json({
      message: `Game ${
        newFeaturedStatus ? "added to" : "removed from"
      } featured`,
      game,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Premium Status
export const togglePremium = async (req, res) => {
  try {
    const gameRef = gamesCollection.doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const currentData = doc.data();
    const newPremiumStatus = !currentData.premium;

    await gameRef.update({
      premium: newPremiumStatus,
      updatedAt: new Date(),
    });

    const updatedDoc = await gameRef.get();
    const game = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json({
      message: `Game ${newPremiumStatus ? "added to" : "removed from"} premium`,
      game,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Exclusive Status
export const toggleExclusive = async (req, res) => {
  try {
    const gameRef = gamesCollection.doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const currentData = doc.data();
    const newExclusiveStatus = !currentData.exclusive;

    await gameRef.update({
      exclusive: newExclusiveStatus,
      updatedAt: new Date(),
    });

    const updatedDoc = await gameRef.get();
    const game = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json({
      message: `Game ${
        newExclusiveStatus ? "added to" : "removed from"
      } exclusive`,
      game,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Tournament Status
export const toggleTournament = async (req, res) => {
  try {
    const gameRef = gamesCollection.doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const currentData = doc.data();
    const newTournamentStatus = !currentData.tournament;

    await gameRef.update({
      tournament: newTournamentStatus,
      updatedAt: new Date(),
    });

    const updatedDoc = await gameRef.get();
    const game = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json({
      message: `Game ${
        newTournamentStatus ? "added to" : "removed from"
      } tournament`,
      game,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk update game categories
export const bulkUpdateGameCategories = async (req, res) => {
  try {
    const { gameIds, categoryType, status } = req.body;

    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({ message: "Game IDs array is required" });
    }

    if (
      !["featured", "premium", "exclusive", "tournament"].includes(categoryType)
    ) {
      return res.status(400).json({ message: "Invalid category type" });
    }

    const batch = db.batch();
    const updatedGames = [];

    for (const gameId of gameIds) {
      const gameRef = gamesCollection.doc(gameId);
      const updateData = {
        [categoryType]: status,
        updatedAt: new Date(),
      };

      batch.update(gameRef, updateData);
    }

    await batch.commit();

    // Fetch updated games
    for (const gameId of gameIds) {
      const doc = await gamesCollection.doc(gameId).get();
      if (doc.exists) {
        updatedGames.push({
          id: doc.id,
          ...doc.data(),
        });
      }
    }

    res.status(200).json({
      message: `${gameIds.length} games updated successfully`,
      updatedGames,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get games by multiple categories
export const getGamesByCategories = async (req, res) => {
  try {
    const { featured, premium, exclusive, tournament } = req.query;

    let query = gamesCollection;
    const filters = [];

    if (featured === "true") filters.push(["featured", "==", true]);
    if (premium === "true") filters.push(["premium", "==", true]);
    if (exclusive === "true") filters.push(["exclusive", "==", true]);
    if (tournament === "true") filters.push(["tournament", "==", true]);

    // Apply filters
    for (const filter of filters) {
      query = query.where(...filter);
    }

    const snapshot = await query.get();
    const games = [];

    snapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
