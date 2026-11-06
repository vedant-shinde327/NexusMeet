const IS_PROD =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

const server = IS_PROD
  ? "https://nexusmeetbackend-hef1.onrender.com"
  : "http://localhost:8000";

export default server;
