import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
} from "../../controllers/contestControllers/usersController.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);

export default router;
