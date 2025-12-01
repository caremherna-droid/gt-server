import { db } from "../../config/firebase.js";
import storage from "../../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_PATHS } from "../../config/storagePaths.js";

const heroCollection = db.collection("hero");

// add Hero
export const addHero = async (req, res) => {
  try {
    const data = req.body || {};

    // Enforce max 4 hero slides
    const snapshot = await db.collection("hero").get();
    if (snapshot.size >= 4) {
      return res
        .status(400)
        .json({ message: "Maximum of 4 hero slides allowed" });
    }

    // Accept background and small image URLs/public ids if provided in body
    const heroData = {
      htmlUrl: data.htmlUrl || "",
      public_id: data.public_id || "",
      isActive: data.isActive === "false" ? false : data.isActive || true,

      // Basic fields
      title: data.title || "",
      subtitle: data.subtitle || "",
      description: data.description || "",

      // Badge fields
      badgeText: data.badgeText || "",
      badgeIcon: data.badgeIcon || "",

      // Game info fields
      categoryName: data.categoryName || "",
      rating: data.rating || "",
      playerCount: data.playerCount || "",
      releaseDate: data.releaseDate || "",

      // Background/media fields
      bgUrl: data.bgUrl || data.backgroundUrl || "",
      bgPublic: data.bgPublic || data.background_public_id || "",
      bgYouTubeUrl: data.bgYouTubeUrl || data.youtubeUrl || "",
      bgType: data.bgType || "image",
      smallUrl: data.smallUrl || data.thumbUrl || "",
      smallPublic: data.smallPublic || data.thumb_public_id || "",

      // CTA fields
      ctaText: data.ctaText || data.buttonText || "",
      ctaUrl: data.ctaUrl || data.buttonUrl || "",
      secondaryCtaText: data.secondaryCtaText || "",
      secondaryCtaUrl: data.secondaryCtaUrl || "",

      // Game/download fields
      gameUrl: data.gameUrl || "",
      gameFilePublicId:
        data.gameFilePublicId ||
        data.game_file_id ||
        data.game_file_public_id ||
        "",

      // Backwards-compatible button fields
      buttonText: data.buttonText || data.ctaText || "",
      buttonUrl: data.buttonUrl || data.ctaUrl || "",

      // Additional fields
      uploadType: data.uploadType || (req.file ? "file" : "url"),
      fileName: data.fileName || "",
      createdAt: new Date().toISOString(),
    };

    const docRef = await heroCollection.add(heroData);
    const newDoc = await docRef.get();
    return res.status(201).json({ id: docRef.id, data: newDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get Hero by ID
export const getHeroById = async (req, res) => {
  try {
    const doc = await heroCollection.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Hero not found" });
    }

    const hero = {
      id: doc.id,
      ...doc.data(),
    };

    res.status(200).json(hero);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get All Heroes
export const getAllHeroes = async (req, res) => {
  try {
    const snapshot = await heroCollection.get();
    const heroes = [];

    snapshot.forEach((doc) => {
      heroes.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(heroes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete Hero
export const deleteHero = async (req, res) => {
  try {
    const id = req.params.id;
    const heroRef = heroCollection.doc(id);
    const doc = await heroRef.get();

    if (!doc.exists) return res.status(404).json({ message: "Hero not found" });

    const heroData = doc.data() || {};

    // Delete any stored files (public ids) if present
    const deletes = [];
    if (heroData.public_id)
      deletes.push(storage.deleteFile(heroData.public_id).catch(() => {}));
    if (heroData.bgPublic)
      deletes.push(storage.deleteFile(heroData.bgPublic).catch(() => {}));
    if (heroData.smallPublic)
      deletes.push(storage.deleteFile(heroData.smallPublic).catch(() => {}));
    if (heroData.gameFilePublicId)
      deletes.push(
        storage.deleteFile(heroData.gameFilePublicId).catch(() => {})
      );

    await Promise.all(deletes);
    await heroRef.delete();
    return res.status(200).json({ message: "Hero deleted successfully" });
  } catch (error) {
    console.error("Error deleting hero:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// update Hero
export const updateHero = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body || {};
    const heroRef = heroCollection.doc(id);
    const doc = await heroRef.get();
    if (!doc.exists) return res.status(404).json({ message: "Hero not found" });

    const existing = doc.data() || {};

    // If request provides new bg/small public ids via body, delete old ones
    if (
      data.bgPublic &&
      existing.bgPublic &&
      data.bgPublic !== existing.bgPublic
    ) {
      try {
        await storage.deleteFile(existing.bgPublic);
      } catch (e) {
        console.error("Failed deleting old bg public id", e);
      }
    }
    if (
      data.smallPublic &&
      existing.smallPublic &&
      data.smallPublic !== existing.smallPublic
    ) {
      try {
        await storage.deleteFile(existing.smallPublic);
      } catch (e) {
        console.error("Failed deleting old small public id", e);
      }
    }

    // If a new file is uploaded via multipart (legacy), handle single file replacement
    if (req.file) {
      const oldPublicId = existing.public_id;
      if (oldPublicId) {
        try {
          await storage.deleteFile(oldPublicId);
        } catch (e) {
          console.error("Failed deleting old public_id", e);
        }
      }

      const uploadRes = await storage.uploadFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        STORAGE_PATHS.HERO_IMAGES
      );
      const signed = await storage.getSignedUrl(uploadRes.name);
      data.public_id = uploadRes.name;
      data.url = signed;
    }

    // If a new game file public id is provided, remove old game file
    if (
      data.gameFilePublicId &&
      existing.gameFilePublicId &&
      data.gameFilePublicId !== existing.gameFilePublicId
    ) {
      try {
        await storage.deleteFile(existing.gameFilePublicId);
      } catch (e) {
        console.error("Failed deleting old game file public id", e);
      }
    }

    const updatedPayload = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await heroRef.update(updatedPayload);
    const updatedDoc = await heroRef.get();
    return res.status(200).json({ id: updatedDoc.id, data: updatedDoc.data() });
  } catch (error) {
    console.error("Error updating hero:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
