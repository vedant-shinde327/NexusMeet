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
        credentials: true
    }
  });

  io.on( "connection", (socket) => {
    socket.on("join-call", (path) => {
      if (connections[path] === undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);

      timeOnline[socket.id] = new Date();

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path],
        );
      }

      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"],
          );
        }
      }
    });

    socket.on("signal", (toID, message) => {
      io.to(toID).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const [mathchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        if (messages[mathchingRoom] === undefined) {
          messages[mathchingRoom] = [];
        }
        messages[mathchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("message", key, ":", sender, data);

        connections[mathchingRoom].array.forEach((element) => {
          io.to(element).emit("chat-message", data, sender, socket.io);
        });
      }
    });

    socket.on("disconnect", () => {
      var diffTime = Math.abs(timeOnline[socket.id] - new Date());

      var key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections)),
      )) {
        for (let a = 0; a < v.length; ++a) {
          if (v[a] === socket.id) {
            key = k;

            for (let a = 0; a < connections[key].length; ++a) {
              io.to(connections[key][a]).emit("user-left", socket.id);
            }

            var index = connections[key].indexOf(socket.id);

            connections[key].splice(index, 1);

            // clean up temporary variable (was an invalid TypeScript annotation)
            let _connections_cleanup = {};
            if (connections[key].length === 0) {
              delete connections[key];
            }
          }
        }
      }
    });
  });
};

export default connectToSocket;
