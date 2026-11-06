import crypto from "crypto";
import Meeting from "../models/meeting.model.js";
import { User } from "../models/users.model.js";

const generateMeetCode = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const seg = (len) =>
    Array.from(crypto.randomBytes(len))
      .map((b) => chars[b % chars.length])
      .join("");
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
};

const resolveAuthenticatedUser = async (token) => {
  if (!token || typeof token !== "string" || !token.trim()) {
    return null;
  }

  const cleanToken = token.trim();

  try {
    const dbUser = await User.findOne({ token: cleanToken })
      .select("name username")
      .lean();

    if (dbUser && dbUser.username) {
      return {
        userId: dbUser.username,
        token: cleanToken,
        name: dbUser.name || dbUser.username,
      };
    }
  } catch (e) {
    console.error("User lookup error:", e);
  }

  const parts = cleanToken.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8"),
      );
      const jwtUser =
        payload.username || payload.email || payload.id || payload._id;
      if (jwtUser) {
        return {
          userId: String(jwtUser),
          token: cleanToken,
          name: payload.name || String(jwtUser),
        };
      }
    } catch {
      // Ignore non-JWT token
    }
  }

  return {
    userId: `token:${cleanToken}`,
    token: cleanToken,
    name: "Organizer",
  };
};

// POST /api/meeting/create
export const createMeeting = async (req, res) => {
  try {
    const {
      token,
      organizerName: reqOrganizerName,
      title,
      scheduledAt,
      isScheduled,
      waitingRoomEnabled,
    } = req.body || {};

    const authUser = await resolveAuthenticatedUser(token);
    if (!authUser) {
      return res.status(401).json({ message: "Authentication token required" });
    }

    let meetingCode = generateMeetCode();
    let exists = await Meeting.exists({ meetingCode });
    while (exists) {
      meetingCode = generateMeetCode();
      exists = await Meeting.exists({ meetingCode });
    }

    const parsedSchedule = scheduledAt ? new Date(scheduledAt) : new Date();
    const validSchedule = Number.isNaN(parsedSchedule.getTime())
      ? new Date()
      : parsedSchedule;

    const scheduledFlag = Boolean(isScheduled);

    const newMeeting = await Meeting.create({
      user_id: authUser.userId,
      organizerToken: authUser.token,
      organizerName: reqOrganizerName || authUser.name,
      meetingCode,
      title: (title || "NexusMeet Session").trim(),
      scheduledAt: validSchedule,
      isScheduled: scheduledFlag,
      waitingRoomEnabled:
        waitingRoomEnabled !== undefined ? Boolean(waitingRoomEnabled) : true,
      // Only scheduled meetings get status "upcoming"
      status: scheduledFlag ? "upcoming" : "live",
    });

    return res.status(201).json({
      _id: newMeeting._id,
      meetingCode: newMeeting.meetingCode,
      title: newMeeting.title,
      scheduledAt: newMeeting.scheduledAt,
      isScheduled: newMeeting.isScheduled,
      waitingRoomEnabled: newMeeting.waitingRoomEnabled,
      status: newMeeting.status,
      organizerName: newMeeting.organizerName,
      organizerUsername: newMeeting.user_id,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return res.status(500).json({ message: "Failed to create meeting" });
  }
};

// GET /api/meeting/scheduled?token=...
export const getUpcomingMeetings = async (req, res) => {
  try {
    const { token } = req.query;
    const authUser = await resolveAuthenticatedUser(token);

    if (!authUser) {
      return res.status(200).json([]);
    }

    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Strictly return ONLY scheduled meetings with status === "upcoming"
    // created by this specific user (ignores all participant history logs)
    const meetings = await Meeting.find({
      $and: [
        {
          $or: [
            { user_id: authUser.userId },
            { organizerToken: authUser.token },
          ],
        },
        { isScheduled: true },
        { status: "upcoming" },
        { scheduledAt: { $gte: cutoff } },
      ],
    })
      .sort({ scheduledAt: 1 })
      .limit(30)
      .lean();

    return res.status(200).json(meetings);
  } catch (error) {
    console.error("Error fetching scheduled meetings:", error);
    return res.status(500).json({ message: "Failed to fetch schedule" });
  }
};

// POST /api/meeting/complete/:code
export const completeMeeting = async (req, res) => {
  try {
    const { code } = req.params;
    const token = req.body?.token || req.query?.token;
    const authUser = await resolveAuthenticatedUser(token);

    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Use updateMany so even if duplicate documents exist for this code,
    // all scheduled entries owned by this organizer are marked completed
    await Meeting.updateMany(
      {
        meetingCode: code,
        $or: [{ user_id: authUser.userId }, { organizerToken: authUser.token }],
      },
      {
        $set: {
          status: "completed",
          isScheduled: false,
        },
      },
    );

    return res.status(200).json({ message: "Meeting marked as completed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to complete meeting" });
  }
};

// GET /api/meeting/details/:code
export const getMeetingDetails = async (req, res) => {
  try {
    const { code } = req.params;
    const meeting = await Meeting.findOne({
      meetingCode: code,
      organizerToken: { $ne: "" },
    }).lean();

    if (!meeting) {
      return res.status(200).json({
        meetingCode: code,
        title: "Instant Meeting",
        scheduledAt: new Date(),
        isScheduled: false,
        existsInDb: false,
      });
    }

    return res.status(200).json({
      ...meeting,
      existsInDb: true,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error looking up meeting" });
  }
};

// DELETE /api/meeting/:code?token=...
export const deleteScheduledMeeting = async (req, res) => {
  try {
    const { code } = req.params;
    const { token } = req.query;
    const authUser = await resolveAuthenticatedUser(token);

    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Meeting.updateMany(
      {
        meetingCode: code,
        $or: [{ user_id: authUser.userId }, { organizerToken: authUser.token }],
      },
      {
        $set: {
          status: "completed",
          isScheduled: false,
        },
      },
    );

    return res.status(200).json({ message: "Scheduled meeting removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete meeting" });
  }
};
