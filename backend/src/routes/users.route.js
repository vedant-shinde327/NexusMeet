import { Router } from "express";
import { googleLogin } from "../controllers/auth.controller.js";
import {
  register,
  login,
  addToHistory,
  getUserHistory,
  getUserProfile,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/add_to_activity", addToHistory);
router.get("/get_all_activity", getUserHistory);
router.post("/google-login", googleLogin);
router.get("/get_user_profile", getUserProfile); // Changed from .post to .get

export default router;
