import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import connectToSocket from "./src/controllers/socketManagers.js";

import mongoose from "mongoose";
import cors from "cors";
import { connect } from "node:http2";

import authRoutes from "./src/routes/users.route.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);
app.use(cors());
app.use(express.json({limit: "40kb"}));
app.use(express.urlencoded({limit: "40kb", extended: true}));

app.use("/api/auth", authRoutes);

const start = async () => {
  const connectioDB = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MONGO connected DB Host : ${connectioDB.connection.host}`);

  server.listen(app.get("port"), () => {
    console.log(`server is running on port 8000`);
  });
};

start();
