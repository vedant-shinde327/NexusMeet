import { Router } from "express";
import { register, login, addToHistory, getUserHistory } from "../controllers/user.controller.js";
const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/add_to_activity", addToHistory);
router.get("/get_all_activity", getUserHistory);

export default router;