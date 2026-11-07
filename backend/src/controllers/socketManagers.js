import { Server } from "socket.io";
import Meeting from "../models/meeting.model.js";
import { User } from "../models/users.model.js";

const MAX_PARTICIPANTS_PER_ROOM = 30;
const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000; // Participants can enter lobby 5 mins before scheduled time

const rooms = {};
const socketToRoom = {};
const syncTimers = {}; // Debounce timers per roomId for bulk join bursts

const getRoomPath = (rawPath = "") => {
  try {
    const clean = rawPath.split("?")[0].replace(/\/+$/, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || clean || "default-room";
  } catch {
    return rawPath || "default-room";
  }
};

// Loads room metadata from MongoDB once and caches in memory
const ensureRoomLoaded = async (roomId) => {
  if (rooms[roomId]) return rooms[roomId];

  let dbMeeting = null;
  try {
    dbMeeting = await Meeting.findOne({ meetingCode: roomId }).lean();
  } catch (e) {
    console.error("Meeting DB lookup error:", e);
  }

  if (rooms[roomId]) return rooms[roomId];

  rooms[roomId] = {
    roomId,
    title: dbMeeting?.title || "NexusMeet Session",
    scheduledAt: dbMeeting?.scheduledAt
      ? new Date(dbMeeting.scheduledAt)
      : null,
    isScheduled: Boolean(dbMeeting?.isScheduled),
    organizerSocketId: null,
    organizerKey: dbMeeting?.user_id || null,
    organizerName: dbMeeting?.organizerName || "Organizer",
    permissions: {
      allowMic: true,
      allowCam: true,
      allowScreen: true,
      chatMode: "everyone",
      waitingRoomEnabled:
        dbMeeting?.waitingRoomEnabled !== undefined
          ? Boolean(dbMeeting.waitingRoomEnabled)
          : true,
    },
    participants: {},
    waitingList: {},
    messages: [],
  };

  return rooms[roomId];
};

// Coalesces rapid bursts of joins/updates into a single broadcast per 150ms
const scheduleRoomSync = (io, roomId) => {
  if (syncTimers[roomId]) return;

  syncTimers[roomId] = setTimeout(() => {
    delete syncTimers[roomId];
    const room = rooms[roomId];
    if (!room) return;

    const participantList = Object.values(room.participants);
    const waitingArray = Object.values(room.waitingList);

    Object.keys(room.participants).forEach((sid) => {
      const isHost = sid === room.organizerSocketId;
      io.to(sid).emit("room-state-sync", {
        title: room.title,
        scheduledAt: room.scheduledAt,
        organizerSocketId: room.organizerSocketId,
        permissions: room.permissions,
        participants: participantList,
        waitingList: isHost ? waitingArray : [],
      });
    });
  }, 150);
};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    maxHttpBufferSize: 1e6,
  });

  const admitParticipantToRoom = (socket, roomId, userMeta) => {
    const room = rooms[roomId];
    if (!room) return;

    const activeCount = Object.keys(room.participants).length;
    if (activeCount >= MAX_PARTICIPANTS_PER_ROOM && !userMeta.isOrganizer) {
      socket.emit("join-denied", {
        message: `This room has reached its maximum capacity (${MAX_PARTICIPANTS_PER_ROOM} participants).`,
      });
      return;
    }

    const { name, userKey, isOrganizer, audio = true, video = true } = userMeta;

    delete room.waitingList[socket.id];
    socketToRoom[socket.id] = roomId;

    const finalAudio = isOrganizer ? audio : room.permissions.allowMic && audio;
    const finalVideo = isOrganizer ? video : room.permissions.allowCam && video;

    room.participants[socket.id] = {
      socketId: socket.id,
      name: name || "Participant",
      userKey: userKey || socket.id,
      isOrganizer: Boolean(isOrganizer),
      audio: Boolean(finalAudio),
      video: Boolean(finalVideo),
      screen: false,
    };

    const existingSocketIds = Object.keys(room.participants);
    const participantList = Object.values(room.participants);

    io.to(socket.id).emit("join-accepted", {
      socketId: socket.id,
      title: room.title,
      scheduledAt: room.scheduledAt,
      isOrganizer: Boolean(isOrganizer),
      organizerSocketId: room.organizerSocketId,
      permissions: room.permissions,
      participants: participantList,
      messages: room.messages.filter(
        (m) =>
          m.scope === "everyone" ||
          m.senderSocketId === socket.id ||
          m.toSocketId === socket.id ||
          (isOrganizer && m.scope === "host_only"),
      ),
    });

    existingSocketIds.forEach((peerSocketId) => {
      io.to(peerSocketId).emit(
        "user-joined",
        socket.id,
        existingSocketIds,
        participantList,
      );
    });

    scheduleRoomSync(io, roomId);
  };

  io.on("connection", (socket) => {
    socket.on("request-join-call", async (payload) => {
      const rawPath = typeof payload === "string" ? payload : payload?.path;
      const roomId = getRoomPath(rawPath);
      let name = (payload?.name || "Participant").trim();
      let userKey = payload?.userKey || name;
      const token =
        typeof payload === "object" && payload !== null
          ? payload.token || null
          : null;
      const wantsOrganizer = Boolean(payload?.isNewMeeting);
      const initialAudio = payload?.audio !== undefined ? payload.audio : true;
      const initialVideo = payload?.video !== undefined ? payload.video : true;

      // Resolve token to DB username so the Organizer is always recognized
      if (token) {
        try {
          const dbUser = await User.findOne({ token })
            .select("username name")
            .lean();
          if (dbUser) {
            if (dbUser.username) userKey = dbUser.username;
            if ((!name || name === "Participant") && dbUser.name) {
              name = dbUser.name;
            }
          }
        } catch (err) {
          console.error("Token lookup error in socket:", err);
        }
      }

      const room = await ensureRoomLoaded(roomId);
      socketToRoom[socket.id] = roomId;

      let isOrganizer = false;
      const activeOrganizerPresent =
        room.organizerSocketId && room.participants[room.organizerSocketId];

      if (!room.organizerKey || room.organizerKey === "guest-organizer") {
        if (!activeOrganizerPresent) {
          room.organizerKey = userKey;
          room.organizerSocketId = socket.id;
          isOrganizer = true;
        }
      } else if (room.organizerKey === userKey) {
        room.organizerSocketId = socket.id;
        isOrganizer = true;
      } else if (!activeOrganizerPresent && wantsOrganizer) {
        room.organizerKey = userKey;
        room.organizerSocketId = socket.id;
        isOrganizer = true;
      }

      // Check Scheduled Start Time Gate for non-organizers
      if (room.isScheduled && room.scheduledAt && !isOrganizer) {
        const now = Date.now();
        const startMs = new Date(room.scheduledAt).getTime();
        if (now < startMs - EARLY_JOIN_WINDOW_MS) {
          socket.emit("meeting-not-started", {
            title: room.title,
            scheduledAt: room.scheduledAt,
            organizerName: room.organizerName,
            message:
              "This meeting has not started yet. You can join 5 minutes before the scheduled start time.",
          });
          return;
        }
      }

      // If Organizer OR waiting room is disabled, admit immediately
      if (isOrganizer || !room.permissions.waitingRoomEnabled) {
        admitParticipantToRoom(socket, roomId, {
          name,
          userKey,
          isOrganizer,
          audio: initialAudio,
          video: initialVideo,
        });
        return;
      }

      // Place in Waiting Room
      room.waitingList[socket.id] = {
        socketId: socket.id,
        name,
        userKey,
        audio: initialAudio,
        video: initialVideo,
        requestedAt: Date.now(),
      };

      socket.emit("waiting-for-host", {
        title: room.title,
        message: "Waiting for the Organizer to admit you...",
      });

      if (room.organizerSocketId) {
        io.to(room.organizerSocketId).emit("waiting-room-notification", {
          socketId: socket.id,
          name,
          waitingList: Object.values(room.waitingList),
        });
      }

      scheduleRoomSync(io, roomId);
    });

    // Bulk & Individual Waiting Room Approval
    socket.on("host-handle-waiting", ({ targetSocketId, action }) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || room.organizerSocketId !== socket.id) return;

      if (action === "admit-all") {
        const waitingUsers = Object.values(room.waitingList);
        waitingUsers.forEach((waitingUser, index) => {
          setTimeout(() => {
            const targetSocket = io.sockets.sockets.get(waitingUser.socketId);
            if (targetSocket && rooms[roomId]) {
              admitParticipantToRoom(targetSocket, roomId, {
                ...waitingUser,
                isOrganizer: false,
              });
            } else if (rooms[roomId]) {
              delete rooms[roomId].waitingList[waitingUser.socketId];
            }
          }, index * 40);
        });
        scheduleRoomSync(io, roomId);
        return;
      }

      const waitingUser = room.waitingList[targetSocketId];
      if (!waitingUser) return;

      if (action === "admit") {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          admitParticipantToRoom(targetSocket, roomId, {
            ...waitingUser,
            isOrganizer: false,
          });
        } else {
          delete room.waitingList[targetSocketId];
        }
      } else if (action === "deny") {
        delete room.waitingList[targetSocketId];
        delete socketToRoom[targetSocketId];
        io.to(targetSocketId).emit("join-denied", {
          message: "The Organizer declined your request to join this meeting.",
        });
      }

      scheduleRoomSync(io, roomId);
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("media-state-change", ({ audio, video, screen }) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || !room.participants[socket.id]) return;

      const participant = room.participants[socket.id];
      const isHost = participant.isOrganizer;

      if (audio !== undefined) {
        participant.audio = isHost
          ? Boolean(audio)
          : Boolean(audio && room.permissions.allowMic);
      }
      if (video !== undefined) {
        participant.video = isHost
          ? Boolean(video)
          : Boolean(video && room.permissions.allowCam);
      }
      if (screen !== undefined) {
        const nextScreen = isHost
          ? Boolean(screen)
          : Boolean(screen && room.permissions.allowScreen);

        if (nextScreen) {
          // Ensure only one active presenter flag at a time
          Object.values(room.participants).forEach((p) => {
            if (p.socketId !== socket.id) p.screen = false;
          });
        }
        participant.screen = nextScreen;
      }

      scheduleRoomSync(io, roomId);
    });

    socket.on("host-update-permissions", (newPermissions) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || room.organizerSocketId !== socket.id) return;

      room.permissions = {
        ...room.permissions,
        ...newPermissions,
      };

      Object.values(room.participants).forEach((p) => {
        if (p.isOrganizer) return;

        if (!room.permissions.allowMic && p.audio) {
          p.audio = false;
          io.to(p.socketId).emit("host-enforced-action", {
            type: "force-mute-mic",
            reason: "Organizer disabled participant microphones.",
          });
        }

        if (!room.permissions.allowCam && p.video) {
          p.video = false;
          io.to(p.socketId).emit("host-enforced-action", {
            type: "force-disable-cam",
            reason: "Organizer disabled participant cameras.",
          });
        }

        if (!room.permissions.allowScreen && p.screen) {
          p.screen = false;
          io.to(p.socketId).emit("host-enforced-action", {
            type: "force-stop-screen",
            reason: "Organizer disabled participant screen sharing.",
          });
        }
      });

      scheduleRoomSync(io, roomId);
    });

    socket.on("host-moderate-participant", ({ targetSocketId, action }) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || room.organizerSocketId !== socket.id) return;

      if (action === "mute-all") {
        Object.values(room.participants).forEach((p) => {
          if (!p.isOrganizer) {
            p.audio = false;
            io.to(p.socketId).emit("host-enforced-action", {
              type: "force-mute-mic",
              reason: "Organizer muted everyone.",
            });
          }
        });
        scheduleRoomSync(io, roomId);
        return;
      }

      if (action === "end-meeting-for-all") {
        Meeting.updateMany(
          { meetingCode: roomId },
          { $set: { status: "completed", isScheduled: false } },
        ).catch(() => {});

        Object.keys(room.participants).forEach((sid) => {
          io.to(sid).emit("meeting-ended-by-host", {
            message: "The Organizer has ended the meeting for everyone.",
          });
          delete socketToRoom[sid];
        });
        Object.keys(room.waitingList).forEach((sid) => {
          io.to(sid).emit("meeting-ended-by-host", {
            message: "The meeting has ended.",
          });
          delete socketToRoom[sid];
        });
        if (syncTimers[roomId]) {
          clearTimeout(syncTimers[roomId]);
          delete syncTimers[roomId];
        }
        delete rooms[roomId];
        return;
      }

      const target = room.participants[targetSocketId];
      if (!target || target.isOrganizer) return;

      if (action === "mute-mic") {
        target.audio = false;
        io.to(targetSocketId).emit("host-enforced-action", {
          type: "force-mute-mic",
          reason: "The Organizer muted your microphone.",
        });
      } else if (action === "disable-cam") {
        target.video = false;
        io.to(targetSocketId).emit("host-enforced-action", {
          type: "force-disable-cam",
          reason: "The Organizer turned off your camera.",
        });
      } else if (action === "stop-screen") {
        target.screen = false;
        io.to(targetSocketId).emit("host-enforced-action", {
          type: "force-stop-screen",
          reason: "The Organizer stopped your screen share.",
        });
      } else if (action === "kick") {
        delete room.participants[targetSocketId];
        delete socketToRoom[targetSocketId];

        io.to(targetSocketId).emit("kicked-from-room", {
          message: "You have been removed from the meeting by the Organizer.",
        });

        Object.keys(room.participants).forEach((sid) => {
          io.to(sid).emit("user-left", targetSocketId);
        });
      }

      scheduleRoomSync(io, roomId);
    });

    socket.on("chat-message", (data, senderName, options = {}) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || !room.participants[socket.id]) return;

      const sender = room.participants[socket.id];
      const isHost = sender.isOrganizer;
      const { chatMode } = room.permissions;

      if (chatMode === "disabled" && !isHost) {
        socket.emit("host-enforced-action", {
          type: "chat-blocked",
          reason: "Chat is currently disabled by the Organizer.",
        });
        return;
      }

      const requestedToSocketId = options?.toSocketId || null;
      let scope = "everyone";
      let recipientSocketId = null;
      let recipientName = "Everyone";

      if (chatMode === "host_only" && !isHost) {
        scope = "direct";
        recipientSocketId = room.organizerSocketId;
        recipientName =
          room.participants[room.organizerSocketId]?.name || "Organizer";
      } else if (requestedToSocketId && requestedToSocketId !== "everyone") {
        scope = "direct";
        recipientSocketId = requestedToSocketId;
        recipientName =
          room.participants[requestedToSocketId]?.name || "Participant";
      }

      const msgPayload = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: sender.name || senderName || "Participant",
        senderSocketId: socket.id,
        isOrganizer: isHost,
        data,
        scope,
        toSocketId: recipientSocketId,
        toName: recipientName,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      room.messages.push(msgPayload);

      if (scope === "direct" && recipientSocketId) {
        io.to(recipientSocketId).emit(
          "chat-message",
          data,
          msgPayload.sender,
          socket.id,
          msgPayload,
        );
        if (recipientSocketId !== socket.id) {
          io.to(socket.id).emit(
            "chat-message",
            data,
            msgPayload.sender,
            socket.id,
            msgPayload,
          );
        }
      } else {
        Object.keys(room.participants).forEach((sid) => {
          io.to(sid).emit(
            "chat-message",
            data,
            msgPayload.sender,
            socket.id,
            msgPayload,
          );
        });
      }
    });

    socket.on("disconnect", () => {
      const roomId = socketToRoom[socket.id];
      delete socketToRoom[socket.id];
      if (!roomId || !rooms[roomId]) return;

      const room = rooms[roomId];
      delete room.waitingList[socket.id];

      if (room.participants[socket.id]) {
        const wasOrganizer = room.organizerSocketId === socket.id;
        delete room.participants[socket.id];

        Object.keys(room.participants).forEach((sid) => {
          io.to(sid).emit("user-left", socket.id);
        });

        if (wasOrganizer) {
          room.organizerSocketId = null;
          Meeting.updateMany(
            { meetingCode: roomId },
            { $set: { status: "completed", isScheduled: false } },
          ).catch(() => {});
        }
      }

      if (
        Object.keys(room.participants).length === 0 &&
        Object.keys(room.waitingList).length === 0
      ) {
        if (syncTimers[roomId]) {
          clearTimeout(syncTimers[roomId]);
          delete syncTimers[roomId];
        }
        delete rooms[roomId];
      } else {
        scheduleRoomSync(io, roomId);
      }
    });
  });

  return io;
};

export default connectToSocket;
