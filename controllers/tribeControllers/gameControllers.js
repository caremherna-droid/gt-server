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
    const gameRef = gamesCollection.doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    const gameData = doc.data();

    // Delete game image from Firebase Storage if it exists
    if (gameData.public_id) {
      try {
        await storage.deleteFile(gameData.public_id);
      } catch (error) {
        console.error("Error deleting game image:", error);
        // Continue with deletion even if image deletion fails
      }
    }

    // Delete game file from Firebase Storage if it exists
    if (gameData.game_file_id) {
      try {
        await storage.deleteFile(gameData.game_file_id);
      } catch (error) {
        console.error("Error deleting game file:", error);
        // Continue with deletion even if file deletion fails
      }
    }

    await gameRef.delete();
    res.status(200).json({ message: "Game deleted successfully" });
  } catch (error) {
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
