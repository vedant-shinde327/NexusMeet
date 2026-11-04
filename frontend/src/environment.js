// frontend/src/environment.js

// You can check hostname, or toggle this manually before building for production
const IS_PROD =
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

const server = IS_PROD
  ? "https://nexusmeetbackend-hef1.onrender.com" // Your live Render backend link
  : "http://localhost:8000"; // Your local backend development server[cite: 3]

export default server;
