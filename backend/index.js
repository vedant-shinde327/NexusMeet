import dns from "node:dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "node:http";
import connectToSocket from "./src/controllers/socketManagers.js";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./src/routes/users.route.js";
import meetingRoutes from "./src/routes/meeting.route.js";

const app = express();
const server = createServer(app);

connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/meeting", meetingRoutes);

const start = async () => {
  try {
    const connectionDB = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MONGO connected DB Host: ${connectionDB.connection.host}`);

    server.listen(app.get("port"), () => {
      console.log(`Server is running on port ${app.get("port")}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
  }
};

start();
