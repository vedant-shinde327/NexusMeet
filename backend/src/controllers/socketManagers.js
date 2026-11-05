import { Server } from "socket.io";

// Authoritative in-memory room store
// rooms[roomId] = {
//   organizerSocketId: string,
//   organizerKey: string,
//   permissions: { allowMic, allowCam, allowScreen, chatMode, waitingRoomEnabled },
//   participants: { [socketId]: { socketId, name, userKey, isOrganizer, audio, video, screen } },
//   waitingList: { [socketId]: { socketId, name, userKey } },
//   messages: []
// }
const rooms = {};
const socketToRoom = {};

const getRoomPath = (rawPath = "") => {
  try {
    const clean = rawPath.split("?")[0].replace(/\/+$/, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || clean || "default-room";
  } catch {
    return rawPath || "default-room";
  }
};

const ensureRoom = (roomId) => {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      organizerSocketId: null,
      organizerKey: null,
      permissions: {
        allowMic: true,
        allowCam: true,
        allowScreen: true,
        chatMode: "everyone", // "everyone" | "host_only" | "disabled"
        waitingRoomEnabled: true,
      },
      participants: {},
      waitingList: {},
      messages: [],
    };
  }
  return rooms[roomId];
};

const broadcastRoomState = (io, roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  const participantList = Object.values(room.participants);
  const waitingArray = Object.values(room.waitingList);

  Object.keys(room.participants).forEach((sid) => {
    const isHost = sid === room.organizerSocketId;
    io.to(sid).emit("room-state-sync", {
      organizerSocketId: room.organizerSocketId,
      permissions: room.permissions,
      participants: participantList,
      waitingList: isHost ? waitingArray : [],
    });
  });
};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  // Helper to admit a user into the active WebRTC room
  const admitParticipantToRoom = (socket, roomId, userMeta) => {
    const room = ensureRoom(roomId);
    const { name, userKey, isOrganizer, audio = true, video = true } = userMeta;

    delete room.waitingList[socket.id];
    socketToRoom[socket.id] = roomId;

    // Enforce room permission locks on non-organizers upon entry
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

    // Tell the admitted user they are in
    io.to(socket.id).emit("join-accepted", {
      socketId: socket.id,
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

    // Notify all participants in the room to establish WebRTC peer connections
    existingSocketIds.forEach((peerSocketId) => {
      io.to(peerSocketId).emit(
        "user-joined",
        socket.id,
        existingSocketIds,
        participantList,
      );
    });

    broadcastRoomState(io, roomId);
  };

  io.on("connection", (socket) => {
    // 1. Join Request (Handles Organizer assignment & Waiting Room)
    socket.on("request-join-call", (payload) => {
      const rawPath = typeof payload === "string" ? payload : payload?.path;
      const roomId = getRoomPath(rawPath);
      const name = (payload?.name || "Participant").trim();
      const userKey = payload?.userKey || name;
      const wantsOrganizer = Boolean(payload?.isNewMeeting);
      const initialAudio = payload?.audio !== undefined ? payload.audio : true;
      const initialVideo = payload?.video !== undefined ? payload.video : true;

      const room = ensureRoom(roomId);
      socketToRoom[socket.id] = roomId;

      // Determine if this user is the Organizer:
      // 1) Room has no organizer yet, OR
      // 2) User created the meeting (wantsOrganizer) and no active organizer is present, OR
      // 3) Returning organizer after page refresh (matching organizerKey)
      let isOrganizer = false;
      const activeOrganizerPresent =
        room.organizerSocketId && room.participants[room.organizerSocketId];

      if (!room.organizerKey) {
        room.organizerKey = userKey;
        room.organizerSocketId = socket.id;
        isOrganizer = true;
      } else if (room.organizerKey === userKey) {
        room.organizerSocketId = socket.id;
        isOrganizer = true;
      } else if (!activeOrganizerPresent && wantsOrganizer) {
        room.organizerKey = userKey;
        room.organizerSocketId = socket.id;
        isOrganizer = true;
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

      // Otherwise place in Waiting Room
      room.waitingList[socket.id] = {
        socketId: socket.id,
        name,
        userKey,
        audio: initialAudio,
        video: initialVideo,
        requestedAt: Date.now(),
      };

      socket.emit("waiting-for-host", {
        message: "Waiting for the Organizer to let you in...",
      });

      if (room.organizerSocketId) {
        io.to(room.organizerSocketId).emit("waiting-room-notification", {
          socketId: socket.id,
          name,
          waitingList: Object.values(room.waitingList),
        });
      }

      broadcastRoomState(io, roomId);
    });

    // Legacy fallback if "join-call" is emitted directly
    socket.on("join-call", (pathOrPayload) => {
      const rawPath =
        typeof pathOrPayload === "string" ? pathOrPayload : pathOrPayload?.path;
      const roomId = getRoomPath(rawPath);
      const room = ensureRoom(roomId);

      // If already admitted via request-join-call, just sync state
      if (room.participants[socket.id]) {
        broadcastRoomState(io, roomId);
        return;
      }

      const isFirst = !room.organizerSocketId;
      if (isFirst) {
        room.organizerSocketId = socket.id;
        room.organizerKey = socket.id;
      }

      admitParticipantToRoom(socket, roomId, {
        name: pathOrPayload?.name || "Participant",
        userKey: socket.id,
        isOrganizer: isFirst,
        audio: true,
        video: true,
      });
    });

    // 2. Organizer Admits or Denies Waiting Room Participant
    socket.on("host-handle-waiting", ({ targetSocketId, action }) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || room.organizerSocketId !== socket.id) return;

      if (action === "admit-all") {
        Object.values(room.waitingList).forEach((waitingUser) => {
          const targetSocket = io.sockets.sockets.get(waitingUser.socketId);
          if (targetSocket) {
            admitParticipantToRoom(targetSocket, roomId, {
              ...waitingUser,
              isOrganizer: false,
            });
          } else {
            delete room.waitingList[waitingUser.socketId];
          }
        });
        broadcastRoomState(io, roomId);
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

      broadcastRoomState(io, roomId);
    });

    // 3. WebRTC Signaling Relay
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // 4. Participant Media State Update (Mic / Cam / Screen toggles)
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
        participant.screen = isHost
          ? Boolean(screen)
          : Boolean(screen && room.permissions.allowScreen);
      }

      broadcastRoomState(io, roomId);
    });

    // 5. Organizer Updates Room Permissions (Locks for Mic, Cam, Screen, Chat, Waiting Room)
    socket.on("host-update-permissions", (newPermissions) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || room.organizerSocketId !== socket.id) return;

      room.permissions = {
        ...room.permissions,
        ...newPermissions,
      };

      // Enforce locks immediately on all non-organizer participants
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

      broadcastRoomState(io, roomId);
    });

    // 6. Organizer Direct Moderation Actions (Mute individual/all, Disable Cam, Kick, End Meeting)
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
        broadcastRoomState(io, roomId);
        return;
      }

      if (action === "end-meeting-for-all") {
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

      broadcastRoomState(io, roomId);
    });

    // 7. Chat System (Supports Everyone, Direct-to-Host Only, Private DM, and Disabled)
    socket.on("chat-message", (data, senderName, options = {}) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room || !room.participants[socket.id]) return;

      const sender = room.participants[socket.id];
      const isHost = sender.isOrganizer;
      const { chatMode } = room.permissions;

      // Block non-hosts when chat is disabled
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
        // Force participant messages directly to the Organizer only
        scope = "direct";
        recipientSocketId = room.organizerSocketId;
        recipientName =
          room.participants[room.organizerSocketId]?.name || "Organizer";
      } else if (requestedToSocketId && requestedToSocketId !== "everyone") {
        // Explicit Direct Message
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
        scope, // "everyone" | "direct"
        toSocketId: recipientSocketId,
        toName: recipientName,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      room.messages.push(msgPayload);

      if (scope === "direct" && recipientSocketId) {
        // Deliver only to recipient and sender
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
        // Broadcast to everyone in the room
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

    // 8. Disconnect Cleanup
    socket.on("disconnect", () => {
      const roomId = socketToRoom[socket.id];
      delete socketToRoom[socket.id];
      if (!roomId || !rooms[roomId]) return;

      const room = rooms[roomId];
      const wasWaiting = Boolean(room.waitingList[socket.id]);
      delete room.waitingList[socket.id];

      if (room.participants[socket.id]) {
        const wasOrganizer = room.organizerSocketId === socket.id;
        delete room.participants[socket.id];

        Object.keys(room.participants).forEach((sid) => {
          io.to(sid).emit("user-left", socket.id);
        });

        // If the organizer disconnected and didn't end the meeting, keep their organizerKey
        // so if they refresh, they automatically reclaim Organizer status.
        if (wasOrganizer) {
          room.organizerSocketId = null;
        }
      }

      if (
        Object.keys(room.participants).length === 0 &&
        Object.keys(room.waitingList).length === 0
      ) {
        delete rooms[roomId];
      } else if (wasWaiting || room.participants) {
        broadcastRoomState(io, roomId);
      }
    });
  });

  return io;
};

export default connectToSocket;
