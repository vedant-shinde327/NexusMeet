import express from "express";
import { createMeeting } from "../controllers/meeting.controller.js";

const router = express.Router();

router.post("/create", createMeeting);

export default router;