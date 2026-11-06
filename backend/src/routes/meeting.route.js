import { Router } from "express";
import {
  createMeeting,
  getUpcomingMeetings,
  completeMeeting,
  getMeetingDetails,
  deleteScheduledMeeting,
} from "../controllers/meeting.controller.js";

const router = Router();

router.post("/create", createMeeting);
router.get("/scheduled", getUpcomingMeetings);
router.post("/complete/:code", completeMeeting);
router.get("/details/:code", getMeetingDetails);
router.delete("/:code", deleteScheduledMeeting);

export default router;
