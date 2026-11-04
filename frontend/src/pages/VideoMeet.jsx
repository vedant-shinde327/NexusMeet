import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import server from "../environment";
import "../styles/videoComponent.css";
import "./lobby.css";

const server_url = server;

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/* VideoTile always attaches the latest stream and forces playback of audio + video */
function VideoTile({
  stream,
  label,
  muted = false,
  isLocal = false,
  isScreen = false,
  isPinned = false,
  showAvatar = false,
  onPin,
}) {
  const videoEl = useRef(null);

  useEffect(() => {
    const el = videoEl.current;
    if (!el || !stream) return;

    el.srcObject = stream;
    el.play().catch((err) => {
      console.warn("Video autoplay blocked or pending:", err);
    });
  }, [stream]);

  const initial = (label || "U").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`video-tile ${isLocal ? "is-local" : ""} ${
        isScreen ? "is-screen" : ""
      } ${isPinned ? "is-pinned" : ""}`}
    >
      <video ref={videoEl} autoPlay muted={muted} playsInline />

      {showAvatar && (
        <div className="tile-avatar-fallback">
          <div className="tile-avatar-circle">{initial}</div>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>Camera Off</span>
        </div>
      )}

      {onPin && (
        <button
          type="button"
          className={`pinButton ${isPinned ? "pinned" : ""}`}
          onClick={onPin}
          title={isPinned ? "Unpin" : "Pin to spotlight"}
        >
          {isPinned ? (
            <PushPinIcon fontSize="small" />
          ) : (
            <PushPinOutlinedIcon fontSize="small" />
          )}
        </button>
      )}

      <span className="nameTag">{label}</span>
    </div>
  );
}

function VideoMeet() {
  const routeTo = useNavigate();
  const { meetingCode, url } = useParams();
  const currentRoomCode = meetingCode || url || "default-room";

  const location = useLocation();
  const isNewMeeting = location.state?.isNewMeeting === true;

  const [pinnedVideo, setPinnedVideo] = useState(null);
  const [showMeetingCode, setShowMeetingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const lobbyVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  const connections = useRef({});
  const remoteStreamsRef = useRef({});
  const iceCandidateQueue = useRef({});

  const [localStreamState, setLocalStreamState] = useState(null);
  const [micReady, setMicReady] = useState(false);
  const [camReady, setCamReady] = useState(false);

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);

  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);

  const [screenAvailable, setScreenAvailable] = useState(false);
  const [screen, setScreen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  const [showModal, setModal] = useState(false);
  const [videos, setVideos] = useState([]);

  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");

  /* Fallback silent audio track */
  const silence = useCallback(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  }, []);

  /* Fallback black video track */
  const blackScreen = useCallback(({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream(15);
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  }, []);

  /* Attach stream to Lobby video preview */
  useEffect(() => {
    if (askForUsername && lobbyVideoRef.current && localStreamState) {
      lobbyVideoRef.current.srcObject = localStreamState;
      lobbyVideoRef.current.play().catch(() => {});
    }
  }, [askForUsername, localStreamState]);

  /* Auto-scroll chat to bottom */
  useEffect(() => {
    if (showModal && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showModal]);

  /* Request camera + mic together in one call, with fallback if one device is busy */
  const getPermissions = useCallback(async () => {
    if (navigator.mediaDevices?.getDisplayMedia) {
      setScreenAvailable(true);
    }

    let videoTrack = null;
    let audioTrack = null;

    try {
      const combined = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      videoTrack = combined.getVideoTracks()[0] || null;
      audioTrack = combined.getAudioTracks()[0] || null;
    } catch {
      try {
        const vOnly = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoTrack = vOnly.getVideoTracks()[0] || null;
      } catch {
        videoTrack = null;
      }

      try {
        const aOnly = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioTrack = aOnly.getAudioTracks()[0] || null;
      } catch {
        audioTrack = null;
      }
    }

    const hasVideo = Boolean(videoTrack);
    const hasAudio = Boolean(audioTrack);

    setVideoAvailable(hasVideo);
    setAudioAvailable(hasAudio);
    setCamReady(hasVideo);
    setMicReady(hasAudio);
    setVideo(hasVideo);
    setAudio(hasAudio);

    const tracks = [];
    if (videoTrack) tracks.push(videoTrack);
    if (audioTrack) tracks.push(audioTrack);

    const finalStream = new MediaStream(tracks);
    window.localStream = finalStream;
    setLocalStreamState(finalStream);
  }, []);

  useEffect(() => {
    if (isNewMeeting && currentRoomCode) {
      setShowMeetingCode(true);
    }
  }, [isNewMeeting, currentRoomCode]);

  useEffect(() => {
    getPermissions();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(connections.current).forEach((pc) => pc.close());
      connections.current = {};
      remoteStreamsRef.current = {};
      iceCandidateQueue.current = {};
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [getPermissions]);

  /* Flush any ICE candidates that arrived before remoteDescription was set */
  const flushIceQueue = async (peerId, pc) => {
    const queue = iceCandidateQueue.current[peerId];
    if (!queue || queue.length === 0) return;

    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("Failed to add queued ICE candidate:", e);
      }
    }
  };

  /* Create or return existing RTCPeerConnection for a remote socket ID */
  const createPeerConnection = useCallback(
    (socketListId) => {
      if (connections.current[socketListId]) {
        return connections.current[socketListId];
      }

      const pc = new RTCPeerConnection(peerConfigConnections);
      connections.current[socketListId] = pc;
      iceCandidateQueue.current[socketListId] = [];

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit(
            "signal",
            socketListId,
            JSON.stringify({ ice: event.candidate }),
          );
        }
      };

      /* Combine incoming audio + video tracks into a new MediaStream reference so React re-renders */
      pc.ontrack = (event) => {
        let existingTracks = [];
        if (remoteStreamsRef.current[socketListId]) {
          existingTracks = remoteStreamsRef.current[socketListId]
            .getTracks()
            .filter((t) => t.kind !== event.track.kind);
        } else if (event.streams && event.streams[0]) {
          existingTracks = event.streams[0]
            .getTracks()
            .filter((t) => t.kind !== event.track.kind);
        }

        const updatedStream = new MediaStream([...existingTracks, event.track]);
        remoteStreamsRef.current[socketListId] = updatedStream;

        setVideos((prevVideos) => {
          const exists = prevVideos.some((v) => v.socketId === socketListId);
          if (exists) {
            return prevVideos.map((v) =>
              v.socketId === socketListId ? { ...v, stream: updatedStream } : v,
            );
          }
          return [
            ...prevVideos,
            { socketId: socketListId, stream: updatedStream },
          ];
        });
      };

      /* Attach local tracks (or fallback dummy tracks so transceivers are bidirectional) */
      const localStream = window.localStream;
      const videoTrack = localStream?.getVideoTracks()[0] || blackScreen();
      const audioTrack = localStream?.getAudioTracks()[0] || silence();

      const outboundStream = new MediaStream([videoTrack, audioTrack]);
      outboundStream.getTracks().forEach((track) => {
        pc.addTrack(track, outboundStream);
      });

      return pc;
    },
    [blackScreen, silence],
  );

  /* Handle incoming SDP offers, answers, and ICE candidates */
  const gotMessageFromServer = useCallback(
    async (fromId, message) => {
      try {
        if (fromId === socketIdRef.current) return;
        const signal = JSON.parse(message);

        /* Ensure peer connection exists even if offer arrives before user-joined */
        const pc = connections.current[fromId] || createPeerConnection(fromId);

        if (signal.sdp) {
          const remoteDescription = new RTCSessionDescription(signal.sdp);

          if (signal.sdp.type === "offer") {
            await pc.setRemoteDescription(remoteDescription);
            await flushIceQueue(fromId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socketRef.current.emit(
              "signal",
              fromId,
              JSON.stringify({ sdp: pc.localDescription }),
            );
          } else if (signal.sdp.type === "answer") {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(remoteDescription);
              await flushIceQueue(fromId, pc);
            }
          }
        }

        if (signal.ice) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
          } else {
            /* Queue ICE candidate until setRemoteDescription finishes */
            if (!iceCandidateQueue.current[fromId]) {
              iceCandidateQueue.current[fromId] = [];
            }
            iceCandidateQueue.current[fromId].push(signal.ice);
          }
        }
      } catch (e) {
        console.error("Signal error:", e);
      }
    },
    [createPeerConnection],
  );

  /* Replace tracks and renegotiate SDP with all connected peers */
  const syncStreamWithPeers = useCallback((stream) => {
    for (const id in connections.current) {
      if (id === socketIdRef.current) continue;
      const pc = connections.current[id];
      const senders = pc.getSenders();

      stream.getTracks().forEach((track) => {
        const sender = senders.find(
          (s) => s.track && s.track.kind === track.kind,
        );
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, stream);
        }
      });

      if (pc.signalingState === "stable" && socketRef.current) {
        pc.createOffer()
          .then((description) => pc.setLocalDescription(description))
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: pc.localDescription }),
            );
          })
          .catch((e) => console.error("Renegotiation error:", e));
      }
    }
  }, []);

  /* Toggle microphone */
  const toggleMic = () => {
    if (!window.localStream || !audioAvailable) return;
    const audioTrack = window.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicReady(audioTrack.enabled);
      setAudio(audioTrack.enabled);
    }
  };

  /* Toggle camera */
  const toggleCamera = () => {
    if (!window.localStream || !videoAvailable) return;
    const videoTrack = window.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamReady(videoTrack.enabled);
      setVideo(videoTrack.enabled);
    }
  };

  const addMessage = useCallback((data, sender, socketId) => {
    setMessages((prev) => [...prev, { sender, data, socketId }]);
    if (socketId !== socketIdRef.current) {
      setNewMessages((prev) => prev + 1);
    }
  }, []);

  const connectToSocketServer = () => {
    socketRef.current = io(server_url, {
      transports: ["websocket"],
    });

    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("chat-message", addMessage);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", currentRoomCode);
    });

    socketRef.current.on("user-left", (id) => {
      setVideos((prev) => prev.filter((v) => v.socketId !== id));
      setPinnedVideo((curr) => (curr === id ? null : curr));

      delete remoteStreamsRef.current[id];
      delete iceCandidateQueue.current[id];

      if (connections.current[id]) {
        connections.current[id].close();
        delete connections.current[id];
      }
    });

    socketRef.current.on("user-joined", (id, clients) => {
      clients.forEach((socketListId) => {
        if (socketListId === socketIdRef.current) return;
        createPeerConnection(socketListId);
      });

      if (id === socketIdRef.current) {
        for (const id2 in connections.current) {
          if (id2 === socketIdRef.current) continue;
          const pc = connections.current[id2];
          if (pc.signalingState !== "stable") continue;

          pc.createOffer()
            .then((desc) => pc.setLocalDescription(desc))
            .then(() => {
              socketRef.current.emit(
                "signal",
                id2,
                JSON.stringify({ sdp: pc.localDescription }),
              );
            })
            .catch((err) => console.error("Offer error:", err));
        }
      }
    });
  };

  const handleJoinRoom = (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;
    setAskForUsername(false);
    connectToSocketServer();
  };

  const restoreCameraStream = useCallback(async () => {
    let vTrack = null;
    if (videoAvailable) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        vTrack = camStream.getVideoTracks()[0];
        if (vTrack) vTrack.enabled = video;
      } catch {
        vTrack = null;
      }
    }

    const existingAudio = window.localStream?.getAudioTracks()[0] || silence();
    const restoredStream = new MediaStream(
      vTrack ? [vTrack, existingAudio] : [existingAudio],
    );

    window.localStream = restoredStream;
    setLocalStreamState(restoredStream);
    syncStreamWithPeers(
      new MediaStream([vTrack || blackScreen(), existingAudio]),
    );
  }, [videoAvailable, video, silence, blackScreen, syncStreamWithPeers]);

  const handleScreen = async () => {
    if (!screenAvailable) return;

    if (!screen) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = displayStream.getVideoTracks()[0];
        const audioTrack = window.localStream?.getAudioTracks()[0] || silence();

        const combinedStream = new MediaStream([screenTrack, audioTrack]);

        window.localStream = combinedStream;
        setLocalStreamState(combinedStream);
        setScreen(true);
        syncStreamWithPeers(combinedStream);

        screenTrack.onended = () => {
          setScreen(false);
          restoreCameraStream();
        };
      } catch (e) {
        console.log("Screen share cancelled:", e);
        setScreen(false);
      }
    } else {
      window.localStream?.getVideoTracks().forEach((track) => track.stop());
      setScreen(false);
      restoreCameraStream();
    }
  };

  const handleChat = () => {
    setModal((prev) => {
      const next = !prev;
      if (next) setNewMessages(0);
      return next;
    });
  };

  const sendMessage = (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", message.trim(), username);
    setMessage("");
  };

  const handleEndCall = () => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    } catch (e) {
      console.error(e);
    }
    const destination = localStorage.getItem("token") ? "/home" : "/";
    routeTo(destination);
  };

  const handleCopyMeetingCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handlePinVideo = (id) => {
    setPinnedVideo((curr) => (curr === id ? null : id));
  };

  const allTiles = [
    {
      id: "local",
      stream: localStreamState,
      label: `You (${username || "Host"})`,
      muted: true,
      isLocal: true,
      isScreen: screen,
      showAvatar: (!video || !videoAvailable) && !screen,
    },
    ...videos.map((v, idx) => ({
      id: v.socketId,
      stream: v.stream,
      label: `Participant ${idx + 1}`,
      muted: false,
      isLocal: false,
      isScreen: false,
      showAvatar: false,
    })),
  ];

  const totalCount = allTiles.length;
  const gridCountClass =
    totalCount === 1
      ? "count-1"
      : totalCount === 2
        ? "count-2"
        : totalCount <= 4
          ? `count-${totalCount}`
          : "count-many";

  const pinnedTile = allTiles.find((t) => t.id === pinnedVideo);
  const unpinnedTiles = allTiles.filter((t) => t.id !== pinnedVideo);

  return (
    <>
      {showMeetingCode && (
        <div className="meetingCodeOverlay">
          <div className="meetingCodeModal">
            <button
              type="button"
              className="closeMeetingCode"
              onClick={() => setShowMeetingCode(false)}
            >
              ×
            </button>
            <h2>Your meeting is ready</h2>
            <p className="meetingCodeDescription">
              Share this room code with others so they can join immediately.
            </p>
            <div className="meetingCodeBox">
              <span>{currentRoomCode}</span>
              <button type="button" onClick={handleCopyMeetingCode}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              className="continueMeetingButton"
              onClick={() => setShowMeetingCode(false)}
            >
              Continue to Setup
            </button>
          </div>
        </div>
      )}

      {askForUsername ? (
        <div className="lobby-container">
          <div className="lobby-card">
            <div className="lobby-preview-col">
              <div className="lobbyVideo">
                <video ref={lobbyVideoRef} autoPlay muted playsInline />

                {(!camReady || !videoAvailable) && (
                  <div className="lobby-cam-off-overlay">
                    <div className="lobby-avatar-circle">
                      {(username || "Y").trim().charAt(0).toUpperCase()}
                    </div>
                    <span>
                      {videoAvailable
                        ? "Camera is turned off"
                        : "Camera unavailable / in use"}
                    </span>
                  </div>
                )}

                <span className="lobby-video-label">
                  {username.trim() ? username : "Preview"}
                </span>

                <div className="lobby-video-controls">
                  <button
                    type="button"
                    className={`lobby-icon-btn ${!micReady ? "muted" : ""}`}
                    onClick={toggleMic}
                    title={micReady ? "Mute microphone" : "Unmute microphone"}
                  >
                    {micReady ? (
                      <MicIcon fontSize="small" />
                    ) : (
                      <MicOffIcon fontSize="small" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={`lobby-icon-btn ${!camReady ? "muted" : ""}`}
                    onClick={toggleCamera}
                    title={camReady ? "Turn off camera" : "Turn on camera"}
                  >
                    {camReady ? (
                      <VideocamIcon fontSize="small" />
                    ) : (
                      <VideocamOffIcon fontSize="small" />
                    )}
                  </button>
                </div>
              </div>

              <div className="lobby-status-row">
                <div
                  className={`lobby-status-chip ${micReady ? "ready" : "error"}`}
                >
                  {micReady ? (
                    <MicIcon fontSize="small" />
                  ) : (
                    <MicOffIcon fontSize="small" />
                  )}
                  <span>{micReady ? "Microphone On" : "Microphone Muted"}</span>
                </div>
                <div
                  className={`lobby-status-chip ${camReady ? "ready" : "error"}`}
                >
                  {camReady ? (
                    <VideocamIcon fontSize="small" />
                  ) : (
                    <VideocamOffIcon fontSize="small" />
                  )}
                  <span>{camReady ? "Camera On" : "Camera Off"}</span>
                </div>
              </div>
            </div>

            <form className="lobby-form-col" onSubmit={handleJoinRoom}>
              <div className="lobby-meta">
                <div className="lobby-room-badge">
                  <span>Room: {currentRoomCode}</span>
                </div>
                <h2 className="lobby-heading">Ready to join?</h2>
                <p className="lobby-subtext">
                  Configure your audio and video before entering the meeting
                  room.
                </p>
              </div>

              <div className="lobby-field">
                <label htmlFor="lobby-username">Display Name</label>
                <input
                  id="lobby-username"
                  type="text"
                  className="lobby-native-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name..."
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="connect-btn"
                disabled={!username.trim()}
              >
                Join Meeting Now
              </button>

              <button
                type="button"
                className="lobby-back-btn"
                onClick={() =>
                  routeTo(localStorage.getItem("token") ? "/home" : "/")
                }
              >
                Cancel & Return
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="meetRoom">
          <header className="meet-topbar">
            <div className="meet-topbar-left">
              <span className="meet-brand-dot" />
              <span className="meet-topbar-title">NexusMeet</span>
              <button
                type="button"
                className="meet-code-pill"
                onClick={handleCopyMeetingCode}
                title="Click to copy meeting code"
              >
                <span>Room:</span>
                <code>{currentRoomCode}</code>
                <ContentCopyIcon sx={{ fontSize: 14 }} />
                {copied && (
                  <span style={{ color: "#4ade80", fontSize: "11px" }}>
                    Copied!
                  </span>
                )}
              </button>
            </div>

            <div className="meet-topbar-right">
              <div className="meet-stat-badge">
                <PeopleAltOutlinedIcon
                  sx={{ fontSize: 16, color: "#3ec6e0" }}
                />
                <span>
                  {totalCount}{" "}
                  {totalCount === 1 ? "Participant" : "Participants"}
                </span>
              </div>
            </div>
          </header>

          <div className="meet-workspace">
            <div className="videoStage">
              {pinnedTile ? (
                <div className="pinned-stage-container">
                  <div className="pinned-main-slot">
                    <VideoTile
                      stream={pinnedTile.stream}
                      label={pinnedTile.label}
                      muted={pinnedTile.muted}
                      isLocal={pinnedTile.isLocal}
                      isScreen={pinnedTile.isScreen}
                      isPinned={true}
                      showAvatar={pinnedTile.showAvatar}
                      onPin={() => handlePinVideo(pinnedTile.id)}
                    />
                  </div>

                  {unpinnedTiles.length > 0 && (
                    <div className="pinned-filmstrip">
                      {unpinnedTiles.map((tile) => (
                        <VideoTile
                          key={tile.id}
                          stream={tile.stream}
                          label={tile.label}
                          muted={tile.muted}
                          isLocal={tile.isLocal}
                          isScreen={tile.isScreen}
                          isPinned={false}
                          showAvatar={tile.showAvatar}
                          onPin={() => handlePinVideo(tile.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`video-grid ${gridCountClass}`}>
                  {allTiles.map((tile) => (
                    <VideoTile
                      key={tile.id}
                      stream={tile.stream}
                      label={tile.label}
                      muted={tile.muted}
                      isLocal={tile.isLocal}
                      isScreen={tile.isScreen}
                      isPinned={false}
                      showAvatar={tile.showAvatar}
                      onPin={() => handlePinVideo(tile.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {showModal && (
              <aside className="chat-room">
                <div className="chat-header">
                  <h3>In-Call Messages</h3>
                  <button
                    type="button"
                    className="chat-close-btn"
                    onClick={() => setModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="chattingDisplay">
                  {messages.length > 0 ? (
                    messages.map((item, index) => {
                      const isMine =
                        item.socketId === socketIdRef.current ||
                        item.sender === username;
                      return (
                        <div
                          key={index}
                          className={`chat-bubble-wrap ${
                            isMine ? "is-mine" : "is-other"
                          }`}
                        >
                          <span className="chat-sender-name">
                            {isMine ? "You" : item.sender}
                          </span>
                          <div className="chat-bubble">{item.data}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="chat-empty-state">
                      No messages yet. Say hello to everyone in the room!
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className="chattingArea" onSubmit={sendMessage}>
                  <input
                    type="text"
                    className="chat-native-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Send a message to everyone..."
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!message.trim()}
                  >
                    Send
                  </button>
                </form>
              </aside>
            )}
          </div>

          <div className="buttonContainer">
            <button
              type="button"
              onClick={toggleCamera}
              className={`ctrl-btn ${!video ? "is-off" : ""}`}
              title={video ? "Turn off camera" : "Turn on camera"}
            >
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`ctrl-btn ${!audio ? "is-off" : ""}`}
              title={audio ? "Mute microphone" : "Unmute microphone"}
            >
              {audio ? <MicIcon /> : <MicOffIcon />}
            </button>

            {screenAvailable && (
              <button
                type="button"
                onClick={handleScreen}
                className={`ctrl-btn ${screen ? "is-active" : ""}`}
                title={screen ? "Stop sharing screen" : "Share screen"}
              >
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </button>
            )}

            <button
              type="button"
              onClick={handleChat}
              className={`ctrl-btn ${showModal ? "is-active" : ""}`}
              title="Toggle chat"
            >
              <ChatIcon />
              {newMessages > 0 && !showModal && (
                <span className="chat-unread-badge">
                  {newMessages > 99 ? "99+" : newMessages}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="ctrl-btn end-call-btn"
              title="Leave meeting"
            >
              <CallEndIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default VideoMeet;
