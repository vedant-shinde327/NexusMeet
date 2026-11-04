import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  console.log("socket.IO initialized");

  io.on("connection", (socket) => {
    console.log("User connected: ", socket.id);

    socket.on("join-call", (path) => {
      const roomKey = path || "default-room";
      if (connections[roomKey] === undefined) {
        connections[roomKey] = [];
      }

      if (!connections[roomKey].includes(socket.id)) {
        connections[roomKey].push(socket.id);
      }

      timeOnline[socket.id] = new Date();
      socket.join(roomKey);

      for (let a = 0; a < connections[roomKey].length; a++) {
        io.to(connections[roomKey][a]).emit(
          "user-joined",
          socket.id,
          connections[roomKey],
        );
      }

      if (messages[roomKey] !== undefined) {
        for (let a = 0; a < messages[roomKey].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            messages[roomKey][a]["data"],
            messages[roomKey][a]["sender"],
            messages[roomKey][a]["socket-id-sender"],
          );
        }
      }
    });

    socket.on("signal", (toID, message) => {
      io.to(toID).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      let matchingRoom = "";
      for (const [roomKey, roomValue] of Object.entries(connections)) {
        if (roomValue.includes(socket.id)) {
          matchingRoom = roomKey;
          break;
        }
      }

      if (matchingRoom) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });

        connections[matchingRoom].forEach((element) => {
          io.to(element).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      for (const [key, v] of Object.entries(connections)) {
        if (v.includes(socket.id)) {
          for (let a = 0; a < v.length; ++a) {
            io.to(v[a]).emit("user-left", socket.id);
          }

          const index = connections[key].indexOf(socket.id);
          if (index !== -1) {
            connections[key].splice(index, 1);
          }

          if (connections[key].length === 0) {
            delete connections[key];
            delete messages[key];
          }
        }
      }
      delete timeOnline[socket.id];
      console.log("User disconnected: ", socket.id);
    });
  });
};

export default connectToSocket;
