import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import SecurityIcon from "@mui/icons-material/Security";
import SendIcon from "@mui/icons-material/Send";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import axios from "axios";
import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import AuthContext from "../contexts/AuthContext";
import server from "../environment";
import "./VideoMeet.css";

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Inline Pin SVG Icon
function PinSvgIcon({ filled = false }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 3H8v2l2 2v5l-3 3v2h4v5l1 1 1-1v-5h4v-2l-3-3V7l2-2V3z" />
    </svg>
  );
}

// Local Video Tile Component
function LocalVideoTile({
  stream,
  username,
  isOrganizer,
  audio,
  video,
  screen,
  isPinned,
  fitContain,
  onToggleFit,
  onTogglePin,
  getInitials,
}) {
  const videoRef = useRef(null);
  const showVideo = Boolean(video || screen);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    if (showVideo) {
      el.play().catch(() => {});
    }
  }, [stream, showVideo, video, screen, isPinned]);

  return (
    <div
      className={`vm-video-tile local-tile ${
        isOrganizer ? "organizer-tile" : ""
      } ${isPinned ? "is-pinned-tile" : ""}`}
      onDoubleClick={() => onTogglePin("local")}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`vm-video-element ${!showVideo ? "video-hidden" : ""} ${
          isPinned || screen ? (fitContain ? "fit-contain" : "fit-cover") : ""
        } ${!screen ? "mirror-video" : ""}`}
      />

      {!showVideo && (
        <div className="vm-avatar-fallback">
          <div className="vm-avatar-circle">{getInitials(username)}</div>
        </div>
      )}

      <div className="vm-tile-top-bar">
        <span
          className={`vm-status-pill ${audio ? "mic-on" : "mic-off"}`}
          title={audio ? "Microphone On" : "Microphone Muted"}
        >
          {audio ? (
            <MicIcon fontSize="inherit" />
          ) : (
            <MicOffIcon fontSize="inherit" />
          )}
        </span>

        <div className="vm-tile-host-actions always-visible-on-hover">
          {isPinned && showVideo && (
            <button
              type="button"
              className="vm-pin-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFit();
              }}
              title="Toggle Fit / Fill Screen"
            >
              <span>{fitContain ? "Fill" : "Fit"}</span>
            </button>
          )}

          <button
            type="button"
            className={`vm-pin-btn ${isPinned ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin("local");
            }}
            title={isPinned ? "Unpin screen" : "Pin screen (3/4 view)"}
          >
            <PinSvgIcon filled={isPinned} />
            <span>{isPinned ? "Unpin" : "Pin"}</span>
          </button>
        </div>
      </div>

      <div className="vm-tile-label">
        <span className="vm-participant-name">{username} (You)</span>
        {screen && <span className="vm-presenting-badge">Presenting</span>}
        {isOrganizer && <span className="vm-organizer-sub">Organizer</span>}
      </div>
    </div>
  );
}

// Remote Participant Video Tile Component
function RemoteVideoTile({
  peer,
  participantMeta,
  isViewerOrganizer,
  isPinned,
  fitContain,
  onToggleFit,
  onTogglePin,
  onModerate,
  onDirectMessage,
}) {
  const videoRef = useRef(null);

  const name = participantMeta?.name || "Participant";
  const isTileOrganizer = Boolean(participantMeta?.isOrganizer);
  const micOn = participantMeta?.audio !== false;
  const camOn = participantMeta?.video !== false;
  const isPresenting = Boolean(participantMeta?.screen);
  const showVideo = camOn || isPresenting;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !peer?.stream) return;

    if (el.srcObject !== peer.stream) {
      el.srcObject = peer.stream;
    }
    if (showVideo) {
      el.play().catch(() => {});
    }
  }, [
    peer?.stream,
    peer?.streamRevision,
    showVideo,
    isPinned,
    camOn,
    isPresenting,
  ]);

  const getInitials = (fullName) => {
    const parts = (fullName || "P").trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={`vm-video-tile ${isTileOrganizer ? "organizer-tile" : ""} ${
        isPinned ? "is-pinned-tile" : ""
      }`}
      onDoubleClick={() => onTogglePin(peer.socketId)}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`vm-video-element ${!showVideo ? "video-hidden" : ""} ${
          isPinned || isPresenting
            ? fitContain
              ? "fit-contain"
              : "fit-cover"
            : ""
        }`}
      />

      {!showVideo && (
        <div className="vm-avatar-fallback">
          <div className="vm-avatar-circle">{getInitials(name)}</div>
        </div>
      )}

      <div className="vm-tile-top-bar">
        <span
          className={`vm-status-pill ${micOn ? "mic-on" : "mic-off"}`}
          title={micOn ? "Microphone On" : "Microphone Muted"}
        >
          {micOn ? (
            <MicIcon fontSize="inherit" />
          ) : (
            <MicOffIcon fontSize="inherit" />
          )}
        </span>

        <div className="vm-tile-host-actions always-visible-on-hover">
          {isPinned && showVideo && (
            <button
              type="button"
              className="vm-pin-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFit();
              }}
              title="Toggle Fit / Fill Screen"
            >
              <span>{fitContain ? "Fill" : "Fit"}</span>
            </button>
          )}

          <button
            type="button"
            className={`vm-pin-btn ${isPinned ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(peer.socketId);
            }}
            title={isPinned ? "Unpin screen" : "Pin screen (3/4 view)"}
          >
            <PinSvgIcon filled={isPinned} />
            <span>{isPinned ? "Unpin" : "Pin"}</span>
          </button>

          {isViewerOrganizer && !isTileOrganizer && (
            <>
              {micOn && (
                <button
                  type="button"
                  className="vm-mini-host-btn"
                  title="Mute Participant"
                  onClick={() => onModerate(peer.socketId, "mute-mic")}
                >
                  <MicOffIcon fontSize="inherit" />
                </button>
              )}
              {camOn && (
                <button
                  type="button"
                  className="vm-mini-host-btn"
                  title="Turn Off Camera"
                  onClick={() => onModerate(peer.socketId, "disable-cam")}
                >
                  <VideocamOffIcon fontSize="inherit" />
                </button>
              )}
              <button
                type="button"
                className="vm-mini-host-btn"
                title="Direct Message"
                onClick={() => onDirectMessage(peer.socketId)}
              >
                <ChatIcon fontSize="inherit" />
              </button>
              <button
                type="button"
                className="vm-mini-host-btn danger"
                title="Remove from Meeting"
                onClick={() => onModerate(peer.socketId, "kick")}
              >
                <PersonRemoveIcon fontSize="inherit" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="vm-tile-label">
        <span className="vm-participant-name">{name}</span>
        {isPresenting && (
          <span className="vm-presenting-badge">Presenting</span>
        )}
        {isTileOrganizer && <span className="vm-organizer-sub">Organizer</span>}
      </div>
    </div>
  );
}

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useContext(AuthContext);

  // Refs for WebRTC & Socket state
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoref = useRef(null);
  const localStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const connectionsRef = useRef({});

  // Pre-filling logged-in user's name
  const defaultName = userData?.name || localStorage.getItem("userName") || "";
  const [username, setUsername] = useState(defaultName);
  const [askForUsername, setAskForUsername] = useState(true);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState("");

  // Hardware availability & active states
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [activeLocalStream, setActiveLocalStream] = useState(null);

  // Pin / Spotlight State ("local" | socketId | null)
  const [pinnedTileId, setPinnedTileId] = useState(null);
  const [fitContain, setFitContain] = useState(true);
  const lastAutoPinnedPresenterRef = useRef(null);

  // Room & Organizer State
  const [isOrganizer, setIsOrganizer] = useState(
    Boolean(location.state?.isNewMeeting),
  );
  const [organizerSocketId, setOrganizerSocketId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [permissions, setPermissions] = useState({
    allowMic: true,
    allowCam: true,
    allowScreen: true,
    chatMode: "everyone",
    waitingRoomEnabled: true,
  });

  // Remote Video Streams
  const [videos, setVideos] = useState([]);

  // Side Panels & Notifications
  const [activeSidePanel, setActiveSidePanel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatTarget, setChatTarget] = useState("everyone");
  const [newMessages, setNewMessages] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [meetingTitle, setMeetingTitle] = useState("NexusMeet Session");
  const [scheduledInfo, setScheduledInfo] = useState(null);
  const [countdownText, setCountdownText] = useState("");

  function getRoomCode() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "room";
  }

  // Create dummy silent audio track so RTCPeerConnection always has an audio sender
  const createSilenceTrack = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const dst = oscillator.connect(ctx.createMediaStreamDestination());
      oscillator.start();
      ctx.resume().catch(() => {});
      return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    } catch {
      return null;
    }
  };

  // Create dummy black video track so RTCPeerConnection ALWAYS negotiates m=video
  // even when testing 4 tabs on 1 PC where Tab 1 locked the physical webcam
  const createBlackTrack = ({ width = 640, height = 360 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#07080a";
      ctx.fillRect(0, 0, width, height);
    }
    const stream = canvas.captureStream(15);
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  // Guarantees any stream has at least 1 video track and 1 audio track
  const ensureCompleteStream = (rawStream) => {
    const tracks = [];
    const videoTracks = rawStream ? rawStream.getVideoTracks() : [];
    const audioTracks = rawStream ? rawStream.getAudioTracks() : [];

    if (videoTracks.length > 0) {
      tracks.push(videoTracks[0]);
    } else {
      const black = createBlackTrack();
      if (black) tracks.push(black);
    }

    if (audioTracks.length > 0) {
      tracks.push(audioTracks[0]);
    } else {
      const silent = createSilenceTrack();
      if (silent) tracks.push(silent);
    }

    return new MediaStream(tracks);
  };

  // Enforce Login When Clicking a Shared Meeting Link Directly
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      sessionStorage.setItem("postLoginRedirect", window.location.pathname);
      navigate("/auth");
    }
  }, [navigate]);

  // Fetch Meeting Metadata on Mount
  useEffect(() => {
    const code = getRoomCode();
    axios
      .get(`${server}/api/meeting/details/${code}`)
      .then((res) => {
        if (res.data?.title) setMeetingTitle(res.data.title);
      })
      .catch(() => {});
  }, []);

  // Auto-Pin Remote Presenter When Screen Sharing Starts
  useEffect(() => {
    const remotePresenter = participants.find(
      (p) => p.screen && p.socketId !== socketIdRef.current,
    );
    const localPresenter = participants.find(
      (p) => p.screen && p.socketId === socketIdRef.current,
    );

    const activePresenter = remotePresenter || localPresenter;

    if (activePresenter) {
      const targetId =
        activePresenter.socketId === socketIdRef.current
          ? "local"
          : activePresenter.socketId;

      if (lastAutoPinnedPresenterRef.current !== targetId) {
        lastAutoPinnedPresenterRef.current = targetId;
        setPinnedTileId(targetId);
        setFitContain(true);
      }
    } else if (lastAutoPinnedPresenterRef.current) {
      const prevId = lastAutoPinnedPresenterRef.current;
      lastAutoPinnedPresenterRef.current = null;
      setPinnedTileId((curr) => (curr === prevId ? null : curr));
    }
  }, [participants]);

  const handleTogglePin = (tileId) => {
    setPinnedTileId((prev) => {
      const next = prev === tileId ? null : tileId;
      if (next) setFitContain(true);
      return next;
    });
  };

  // Adaptive Resolution Scaling for Bulk Participant Load (only on camera, never screen)
  useEffect(() => {
    if (!localStreamRef.current || screen || !videoAvailable) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack || !videoTrack.applyConstraints) return;

    const peerCount = videos.length + 1;
    if (peerCount >= 10) {
      videoTrack
        .applyConstraints({ width: 480, height: 270, frameRate: 15 })
        .catch(() => {});
    } else if (peerCount >= 5) {
      videoTrack
        .applyConstraints({ width: 640, height: 360, frameRate: 20 })
        .catch(() => {});
    } else {
      videoTrack
        .applyConstraints({ width: 1280, height: 720, frameRate: 30 })
        .catch(() => {});
    }
  }, [videos.length, screen, videoAvailable]);

  // Live Countdown Timer if Participant Arrives Before Scheduled Time
  useEffect(() => {
    if (!scheduledInfo?.scheduledAt) return;
    const interval = setInterval(() => {
      const diff = new Date(scheduledInfo.scheduledAt).getTime() - Date.now();
      if (diff <= 5 * 60 * 1000) {
        clearInterval(interval);
        setScheduledInfo(null);
        connectToSocketServer();
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdownText(
        `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(
          2,
          "0",
        )}m ${String(secs).padStart(2, "0")}s`,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledInfo]);

  const activeSidePanelRef = useRef(activeSidePanel);
  useEffect(() => {
    activeSidePanelRef.current = activeSidePanel;
    if (activeSidePanel === "chat") {
      setNewMessages(0);
    }
  }, [activeSidePanel]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? "" : prev));
    }, 4000);
  };

  useEffect(() => {
    if (!username && (userData?.name || localStorage.getItem("userName"))) {
      setUsername(userData?.name || localStorage.getItem("userName") || "");
    }
  }, [userData]);

  // Initialize Local Camera & Microphone Preview for Lobby
  useEffect(() => {
    const initPermissions = async () => {
      setScreenAvailable(
        Boolean(
          navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia,
        ),
      );

      try {
        const rawStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const complete = ensureCompleteStream(rawStream);
        setVideoAvailable(true);
        setAudioAvailable(true);
        setVideo(true);
        setAudio(true);
        cameraStreamRef.current = complete;
        localStreamRef.current = complete;
        setActiveLocalStream(complete);
        window.localStream = complete;
        if (localVideoref.current) {
          localVideoref.current.srcObject = complete;
        }
      } catch {
        // Fallback when webcam is locked by another tab on the same PC
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          // Inject black video track so WebRTC still negotiates m=video!
          const complete = ensureCompleteStream(audioOnly);
          setVideoAvailable(false);
          setVideo(false);
          setAudioAvailable(true);
          setAudio(true);
          cameraStreamRef.current = complete;
          localStreamRef.current = complete;
          setActiveLocalStream(complete);
          window.localStream = complete;
        } catch {
          const fallback = ensureCompleteStream(null);
          setVideoAvailable(false);
          setAudioAvailable(false);
          setVideo(false);
          setAudio(false);
          cameraStreamRef.current = fallback;
          localStreamRef.current = fallback;
          setActiveLocalStream(fallback);
          window.localStream = fallback;
        }
      }
    };

    initPermissions();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Push new video/audio tracks to all connected peers with automatic SDP renegotiation fallback
  const syncStreamToPeers = async (newStream) => {
    const entries = Object.entries(connectionsRef.current);

    for (const [peerId, pc] of entries) {
      if (peerId === socketIdRef.current || !pc) continue;
      if (pc.signalingState === "closed" || pc.connectionState === "closed") {
        continue;
      }

      try {
        let needsRenegotiation = false;
        const senders = pc.getSenders ? pc.getSenders() : [];

        for (const track of newStream.getTracks()) {
          // Match sender by track.kind (or fallback to transceiver receiver track kind)
          const existingSender = senders.find(
            (s) => s.track && s.track.kind === track.kind,
          );

          if (existingSender) {
            await existingSender.replaceTrack(track);
          } else {
            pc.addTrack(track, newStream);
            needsRenegotiation = true;
          }
        }

        if (needsRenegotiation) {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          socketRef.current?.emit(
            "signal",
            peerId,
            JSON.stringify({ sdp: pc.localDescription }),
          );
        }
      } catch (err) {
        console.error(`Error syncing stream to peer ${peerId}:`, err);
      }
    }
  };

  // Toggle Microphone
  const handleToggleAudio = (forcedState) => {
    const nextAudio = typeof forcedState === "boolean" ? forcedState : !audio;

    if (nextAudio && !isOrganizer && !permissions.allowMic) {
      showToast("Microphone is locked by the Organizer.");
      return;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = nextAudio;
      });
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = nextAudio;
      });
    }

    setAudio(nextAudio);
    socketRef.current?.emit("media-state-change", { audio: nextAudio });
  };

  // Toggle Camera
  const handleToggleVideo = async (forcedState) => {
    const nextVideo = typeof forcedState === "boolean" ? forcedState : !video;

    if (nextVideo && !isOrganizer && !permissions.allowCam) {
      showToast("Camera is locked by the Organizer.");
      return;
    }

    // If user is currently screen sharing, update camera state without killing the screen track
    if (screen) {
      if (cameraStreamRef.current && videoAvailable) {
        cameraStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = nextVideo;
        });
      }
      setVideo(nextVideo);
      socketRef.current?.emit("media-state-change", { video: nextVideo });
      return;
    }

    if (nextVideo && !videoAvailable) {
      // Try acquiring camera again in case another tab released it
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = camStream.getVideoTracks()[0];
        const audioTracks = localStreamRef.current
          ? localStreamRef.current.getAudioTracks()
          : [];
        const updated = ensureCompleteStream(
          new MediaStream([newVideoTrack, ...audioTracks]),
        );
        cameraStreamRef.current = updated;
        localStreamRef.current = updated;
        setActiveLocalStream(updated);
        setVideoAvailable(true);
        setVideo(true);
        if (localVideoref.current) {
          localVideoref.current.srcObject = updated;
        }
        await syncStreamToPeers(updated);
        socketRef.current?.emit("media-state-change", { video: true });
        return;
      } catch {
        showToast(
          "Camera is unavailable or in use by another browser/application.",
        );
        return;
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = nextVideo;
      });
      setActiveLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    setVideo(nextVideo);
    socketRef.current?.emit("media-state-change", { video: nextVideo });
  };

  // Stop Screen Share & Restore Camera/Fallback Track
  const stopScreenSharing = async () => {
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
        screenStreamRef.current = null;
      }

      let restoredVideoTrack = null;

      // Check if we have a live camera track in cameraStreamRef
      if (cameraStreamRef.current && videoAvailable) {
        const camTracks = cameraStreamRef.current.getVideoTracks();
        if (camTracks.length > 0 && camTracks[0].readyState === "live") {
          restoredVideoTrack = camTracks[0];
          restoredVideoTrack.enabled = video;
        }
      }

      // If camera track ended, re-acquire if available
      if (!restoredVideoTrack && videoAvailable) {
        try {
          const freshCam = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          restoredVideoTrack = freshCam.getVideoTracks()[0];
          restoredVideoTrack.enabled = video;
        } catch {
          restoredVideoTrack = createBlackTrack();
        }
      }

      if (!restoredVideoTrack) {
        restoredVideoTrack = createBlackTrack();
      }

      const existingAudio = localStreamRef.current
        ? localStreamRef.current.getAudioTracks()
        : [];

      const restoredStream = ensureCompleteStream(
        new MediaStream([restoredVideoTrack, ...existingAudio]),
      );

      cameraStreamRef.current = restoredStream;
      localStreamRef.current = restoredStream;
      window.localStream = restoredStream;
      setActiveLocalStream(restoredStream);

      await syncStreamToPeers(restoredStream);
    } catch (err) {
      console.error("Error stopping screen share:", err);
    } finally {
      setScreen(false);
      setPinnedTileId((prev) => (prev === "local" ? null : prev));
      socketRef.current?.emit("media-state-change", {
        screen: false,
        video,
      });
    }
  };

  // Toggle Screen Share
  const handleToggleScreen = async (forcedOff = false) => {
    const nextScreen = forcedOff ? false : !screen;

    if (!nextScreen) {
      await stopScreenSharing();
      return;
    }

    if (!isOrganizer && !permissions.allowScreen) {
      showToast("Screen sharing is disabled by the Organizer.");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        setScreen(false);
        return;
      }

      screenTrack.enabled = true;
      screenStreamRef.current = displayStream;

      // Automatically stop sharing if user clicks browser's native "Stop sharing" bar
      screenTrack.onended = () => {
        stopScreenSharing();
      };

      const existingAudioTracks = localStreamRef.current
        ? localStreamRef.current.getAudioTracks()
        : [];

      const combinedStream = ensureCompleteStream(
        new MediaStream([screenTrack, ...existingAudioTracks]),
      );

      localStreamRef.current = combinedStream;
      window.localStream = combinedStream;
      setActiveLocalStream(combinedStream);

      setScreen(true);
      setPinnedTileId("local");
      setFitContain(true);

      await syncStreamToPeers(combinedStream);
      socketRef.current?.emit("media-state-change", { screen: true });
    } catch (err) {
      console.error("Screen share cancelled or failed:", err);
      setScreen(false);
    }
  };

  // WebRTC Signaling Handler
  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;

    const pc = connectionsRef.current[fromId];
    if (!pc) return;

    if (signal.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            pc.createAnswer()
              .then((description) => {
                pc.setLocalDescription(description).then(() => {
                  socketRef.current.emit(
                    "signal",
                    fromId,
                    JSON.stringify({ sdp: pc.localDescription }),
                  );
                });
              })
              .catch((e) => console.error(e));
          }
        })
        .catch((e) => console.error(e));
    }

    if (signal.ice) {
      pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) =>
        console.error(e),
      );
    }
  };

  // Connect to Socket.IO Server
  const connectToSocketServer = () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnecting(true);
    setDeniedMessage("");

    socketRef.current = io(server, {
      secure: server.startsWith("https"),
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
      reconnectionDelay: 1500,
      timeout: 8000,
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setConnecting(false);
      setDeniedMessage(
        `Cannot reach signaling server (${server}). Make sure your backend server is running on port 8000.`,
      );
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      setConnecting(false);
      socketIdRef.current = socketRef.current.id;
      const userKey =
        userData?.username ||
        localStorage.getItem("userName") ||
        username.trim();

      socketRef.current.emit("request-join-call", {
        path: window.location.href,
        name: username.trim() || "Participant",
        userKey,
        token: localStorage.getItem("token"),
        isNewMeeting: Boolean(location.state?.isNewMeeting),
        audio,
        video,
      });
    });

    socketRef.current.on("meeting-not-started", (info) => {
      setWaitingForApproval(false);
      setAskForUsername(false);
      setScheduledInfo(info);
      socketRef.current?.disconnect();
    });

    socketRef.current.on("waiting-for-host", () => {
      setWaitingForApproval(true);
      setAskForUsername(false);
    });

    socketRef.current.on("join-denied", ({ message: msg }) => {
      setWaitingForApproval(false);
      setAskForUsername(true);
      setDeniedMessage(
        msg || "The Organizer declined your request to join this meeting.",
      );
      socketRef.current?.disconnect();
    });

    socketRef.current.on("join-accepted", (payload) => {
      setWaitingForApproval(false);
      setAskForUsername(false);
      setIsOrganizer(Boolean(payload.isOrganizer));
      setOrganizerSocketId(payload.organizerSocketId);
      if (payload.permissions) {
        setPermissions(payload.permissions);
        if (!payload.isOrganizer) {
          if (!payload.permissions.allowMic) handleToggleAudio(false);
          if (!payload.permissions.allowCam) handleToggleVideo(false);
        }
      }
      if (Array.isArray(payload.participants)) {
        setParticipants(payload.participants);
      }
      if (Array.isArray(payload.messages)) {
        setMessages(payload.messages);
      }
    });

    socketRef.current.on("room-state-sync", (state) => {
      if (state.organizerSocketId !== undefined) {
        setOrganizerSocketId(state.organizerSocketId);
        setIsOrganizer(state.organizerSocketId === socketIdRef.current);
      }
      if (state.permissions) {
        setPermissions(state.permissions);
      }
      if (Array.isArray(state.participants)) {
        setParticipants(state.participants);
      }
      if (Array.isArray(state.waitingList)) {
        setWaitingList(state.waitingList);
      }
    });

    socketRef.current.on(
      "waiting-room-notification",
      ({ name: joinerName, waitingList: updatedWaiting }) => {
        if (Array.isArray(updatedWaiting)) {
          setWaitingList(updatedWaiting);
        }
        showToast(`${joinerName} is waiting in the lobby to join.`);
      },
    );

    socketRef.current.on("host-enforced-action", ({ type, reason }) => {
      if (type === "force-mute-mic") {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = false;
          });
        }
        setAudio(false);
      } else if (type === "force-disable-cam") {
        if (!screen && localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => {
            t.enabled = false;
          });
        }
        setVideo(false);
      } else if (type === "force-stop-screen") {
        stopScreenSharing();
      }
      if (reason) showToast(reason);
    });

    socketRef.current.on("kicked-from-room", ({ message: kickMsg }) => {
      alert(kickMsg || "You were removed from the meeting by the Organizer.");
      handleEndCall();
    });

    socketRef.current.on("meeting-ended-by-host", ({ message: endMsg }) => {
      alert(endMsg || "The Organizer has ended the meeting.");
      handleEndCall();
    });

    socketRef.current.on(
      "chat-message",
      (data, sender, socketIdSender, meta) => {
        const incomingMsg = meta || {
          id: `${Date.now()}-${Math.random()}`,
          sender,
          senderSocketId: socketIdSender,
          data,
          scope: "everyone",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, incomingMsg]);
        if (
          socketIdSender !== socketIdRef.current &&
          activeSidePanelRef.current !== "chat"
        ) {
          setNewMessages((prev) => prev + 1);
        }
      },
    );

    socketRef.current.on("user-left", (id) => {
      if (connectionsRef.current[id]) {
        connectionsRef.current[id].close();
        delete connectionsRef.current[id];
      }
      setVideos((prev) => prev.filter((v) => v.socketId !== id));
      setPinnedTileId((prev) => (prev === id ? null : prev));
    });

    socketRef.current.on("user-joined", (id, clients, participantList) => {
      if (Array.isArray(participantList)) {
        setParticipants(participantList);
      }

      // Ensure localStreamRef ALWAYS has 1 video track and 1 audio track before adding to peers
      localStreamRef.current = ensureCompleteStream(localStreamRef.current);
      setActiveLocalStream(localStreamRef.current);

      clients.forEach((socketListId) => {
        if (socketListId === socketIdRef.current) return;
        if (connectionsRef.current[socketListId]) return;

        const pc = new RTCPeerConnection(peerConfigConnections);
        connectionsRef.current[socketListId] = pc;

        pc.onicecandidate = (event) => {
          if (event.candidate != null) {
            socketRef.current.emit(
              "signal",
              socketListId,
              JSON.stringify({ ice: event.candidate }),
            );
          }
        };

        pc.ontrack = (event) => {
          let remoteStream = event.streams && event.streams[0];
          if (!remoteStream) {
            remoteStream = new MediaStream([event.track]);
          }

          setVideos((prev) => {
            const exists = prev.some((v) => v.socketId === socketListId);
            if (exists) {
              return prev.map((v) =>
                v.socketId === socketListId
                  ? {
                      ...v,
                      stream: remoteStream,
                      streamRevision: Date.now(),
                    }
                  : v,
              );
            }
            return [
              ...prev,
              {
                socketId: socketListId,
                stream: remoteStream,
                streamRevision: Date.now(),
              },
            ];
          });
        };

        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      });

      if (id === socketIdRef.current) {
        Object.entries(connectionsRef.current).forEach(([peerId, pc]) => {
          if (peerId === socketIdRef.current) return;
          pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
            .then((description) => {
              pc.setLocalDescription(description).then(() => {
                socketRef.current.emit(
                  "signal",
                  peerId,
                  JSON.stringify({ sdp: pc.localDescription }),
                );
              });
            })
            .catch((e) => console.error(e));
        });
      }
    });
  };

  const handleConnect = (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;
    setDeniedMessage("");
    connectToSocketServer();
  };

  const handleEndCall = async () => {
    const code = getRoomCode();
    const token = localStorage.getItem("token");

    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (token) {
        localStorage.removeItem("nexus_scheduled_meetings");
        localStorage.removeItem(`nexus_scheduled_${token}`);
        await axios.post(`${server}/api/meeting/complete/${code}`, { token });
      }
    } catch (e) {
      console.error(e);
    }

    navigate(token ? "/home" : "/");
  };

  const handleUpdatePermission = (patch) => {
    if (!isOrganizer || !socketRef.current) return;
    socketRef.current.emit("host-update-permissions", patch);
  };

  const handleModerateParticipant = (targetSocketId, action) => {
    if (!isOrganizer || !socketRef.current) return;
    socketRef.current.emit("host-moderate-participant", {
      targetSocketId,
      action,
    });
  };

  const handleWaitingDecision = (targetSocketId, action) => {
    if (!isOrganizer || !socketRef.current) return;
    socketRef.current.emit("host-handle-waiting", {
      targetSocketId,
      action,
    });
  };

  const openDirectChatWith = (targetSid) => {
    setChatTarget(targetSid);
    setActiveSidePanel("chat");
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || !socketRef.current) return;

    const toSocketId =
      !isOrganizer && permissions.chatMode === "host_only"
        ? organizerSocketId
        : chatTarget === "everyone"
          ? null
          : chatTarget;

    socketRef.current.emit("chat-message", message.trim(), username, {
      toSocketId,
    });
    setMessage("");
  };

  const copyMeetingCode = () => {
    const fullUrl = `${window.location.origin}/meeting/${getRoomCode()}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getInitials = (fullName) => {
    const parts = (fullName || "U").trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (fullName || "U").substring(0, 2).toUpperCase();
  };

  const participantMap = participants.reduce((acc, p) => {
    acc[p.socketId] = p;
    return acc;
  }, {});

  const sortedParticipants = [...participants].sort((a, b) =>
    a.isOrganizer === b.isOrganizer ? 0 : a.isOrganizer ? -1 : 1,
  );

  // ── 0. SCHEDULED MEETING NOT STARTED YET VIEW ──
  if (scheduledInfo) {
    return (
      <div className="vm-lobby-wrapper">
        <div className="vm-waiting-card">
          <div className="vm-lobby-badge">Scheduled Session</div>
          <h2>{scheduledInfo.title || meetingTitle}</h2>
          <p>{scheduledInfo.message}</p>
          <div className="vm-schedule-readout">
            <span>
              Starts at:{" "}
              <strong>
                {new Date(scheduledInfo.scheduledAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </strong>
            </span>
            {countdownText && (
              <span className="vm-countdown-pill">
                Opens in {countdownText}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              className="vm-lobby-join-btn"
              style={{ padding: "0 16px", height: "36px" }}
              onClick={() => {
                setScheduledInfo(null);
                connectToSocketServer();
              }}
            >
              Retry now
            </button>
            <button
              type="button"
              className="vm-btn-leave-lobby"
              onClick={handleEndCall}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 1. WAITING ROOM VIEW ──
  if (waitingForApproval) {
    return (
      <div className="vm-lobby-wrapper">
        <div className="vm-waiting-card">
          <div className="vm-waiting-spinner" />
          <h2>Waiting for the Organizer</h2>
          <p>
            You have requested to join room <strong>{getRoomCode()}</strong> as{" "}
            <strong>{username}</strong>. The meeting Organizer will let you in
            shortly.
          </p>
          <button
            type="button"
            className="vm-btn-leave-lobby"
            onClick={handleEndCall}
          >
            Cancel & Leave
          </button>
        </div>
      </div>
    );
  }

  // ── 2. PRE-JOIN LOBBY VIEW ──
  if (askForUsername) {
    return (
      <div className="vm-lobby-wrapper">
        <div className="vm-lobby-container">
          <div className="vm-lobby-preview">
            <video
              ref={localVideoref}
              autoPlay
              muted
              playsInline
              className={`vm-lobby-video ${!video ? "video-hidden" : ""}`}
            />
            {!video && (
              <div className="vm-lobby-avatar">
                <div className="vm-avatar-circle large">
                  {getInitials(username || "You")}
                </div>
                <span>Camera is off</span>
              </div>
            )}
            <div className="vm-lobby-media-toggles">
              <button
                type="button"
                className={`vm-ctrl-btn ${!audio ? "off" : ""}`}
                onClick={() => handleToggleAudio()}
              >
                {audio ? <MicIcon /> : <MicOffIcon />}
              </button>
              <button
                type="button"
                className={`vm-ctrl-btn ${!video ? "off" : ""}`}
                onClick={() => handleToggleVideo()}
              >
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </button>
            </div>
          </div>

          <form className="vm-lobby-card" onSubmit={handleConnect}>
            <div className="vm-lobby-badge">
              {location.state?.isNewMeeting
                ? "● Joining as Meeting Organizer"
                : `● Room: ${getRoomCode()}`}
            </div>
            <h1>Ready to join?</h1>
            <p>
              Enter your display name so other participants and the Organizer
              can identify you in the meeting.
            </p>

            {deniedMessage && (
              <div className="vm-lobby-alert">{deniedMessage}</div>
            )}

            <label className="vm-lobby-label" htmlFor="display-name-input">
              Your Display Name
            </label>
            <input
              id="display-name-input"
              type="text"
              className="vm-lobby-input"
              placeholder="e.g. Vedant Shinde"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <button
              type="submit"
              className="vm-lobby-join-btn"
              disabled={!username.trim() || connecting}
            >
              {connecting
                ? "Connecting to room..."
                : location.state?.isNewMeeting
                  ? "Start Meeting as Organizer"
                  : "Join Meeting"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── 3. LIVE MEETING WORKSPACE ──
  const micLocked = !isOrganizer && !permissions.allowMic;
  const camLocked = !isOrganizer && !permissions.allowCam;
  const screenLocked = !isOrganizer && !permissions.allowScreen;

  const totalCount = videos.length + 1;
  const gridCountClass = totalCount <= 9 ? `count-${totalCount}` : "count-many";

  const activePinnedId =
    pinnedTileId === "local" || videos.some((v) => v.socketId === pinnedTileId)
      ? pinnedTileId
      : null;

  const renderLocalTile = (isPinnedView) => (
    <LocalVideoTile
      key="local"
      stream={activeLocalStream}
      username={username}
      isOrganizer={isOrganizer}
      audio={audio}
      video={video}
      screen={screen}
      isPinned={isPinnedView}
      fitContain={fitContain}
      onToggleFit={() => setFitContain((f) => !f)}
      onTogglePin={handleTogglePin}
      getInitials={getInitials}
    />
  );

  const renderRemoteTile = (peer, isPinnedView) => (
    <RemoteVideoTile
      key={peer.socketId}
      peer={peer}
      participantMeta={participantMap[peer.socketId]}
      isViewerOrganizer={isOrganizer}
      isPinned={isPinnedView}
      fitContain={fitContain}
      onToggleFit={() => setFitContain((f) => !f)}
      onTogglePin={handleTogglePin}
      onModerate={handleModerateParticipant}
      onDirectMessage={openDirectChatWith}
    />
  );

  return (
    <div className="vm-room-container">
      {/* Toast Notification Banner */}
      {toastMessage && <div className="vm-toast-banner">{toastMessage}</div>}

      {/* Top Room Header */}
      <header className="vm-room-header">
        <div className="vm-room-info">
          <span className="vm-brand-dot" />
          <span className="vm-room-title">NexusMeet</span>
          <button
            type="button"
            className="vm-room-code-chip"
            onClick={copyMeetingCode}
            title="Copy Full Meeting Link"
          >
            <span>{getRoomCode()}</span>
            <ContentCopyIcon style={{ fontSize: "13px" }} />
            {copiedCode && <span className="copied-tag">Copied link!</span>}
          </button>
          {isOrganizer && (
            <span className="vm-role-pill">You are the Organizer</span>
          )}
          {activePinnedId && (
            <button
              type="button"
              className="vm-header-unpin-chip"
              onClick={() => setPinnedTileId(null)}
            >
              <PinSvgIcon filled />
              <span>Exit pinned view (Gallery)</span>
            </button>
          )}
        </div>

        {/* Waiting Room Quick Alert for Organizer */}
        {isOrganizer && waitingList.length > 0 && (
          <div className="vm-waiting-alert-bar">
            <span>
              <strong>{waitingList.length}</strong> waiting in lobby
            </span>
            <button
              type="button"
              className="vm-admit-quick-btn"
              onClick={() => handleWaitingDecision(null, "admit-all")}
            >
              Admit All
            </button>
            <button
              type="button"
              className="vm-view-waiting-btn"
              onClick={() => setActiveSidePanel("host")}
            >
              Review
            </button>
          </div>
        )}
      </header>

      {/* Main Content Stage */}
      <div className="vm-main-stage">
        {activePinnedId ? (
          <div
            className={`vm-spotlight-stage ${
              totalCount === 1 ? "single-user" : ""
            }`}
          >
            <div className="vm-pinned-primary">
              {activePinnedId === "local"
                ? renderLocalTile(true)
                : renderRemoteTile(
                    videos.find((v) => v.socketId === activePinnedId),
                    true,
                  )}
            </div>

            {totalCount > 1 && (
              <div className="vm-filmstrip-sidebar">
                {activePinnedId !== "local" && renderLocalTile(false)}
                {videos
                  .filter((v) => v.socketId !== activePinnedId)
                  .map((peer) => renderRemoteTile(peer, false))}
              </div>
            )}
          </div>
        ) : (
          <div className={`vm-video-grid ${gridCountClass}`}>
            {renderLocalTile(false)}
            {videos.map((peer) => renderRemoteTile(peer, false))}
          </div>
        )}

        {/* Side Drawer: Chat / Participants / Organizer Controls */}
        {activeSidePanel && (
          <aside className="vm-side-drawer">
            <div className="vm-drawer-tabs">
              <button
                type="button"
                className={`vm-drawer-tab ${
                  activeSidePanel === "people" ? "active" : ""
                }`}
                onClick={() => setActiveSidePanel("people")}
              >
                <PeopleAltIcon fontSize="small" />
                <span>People ({participants.length})</span>
              </button>

              <button
                type="button"
                className={`vm-drawer-tab ${
                  activeSidePanel === "chat" ? "active" : ""
                }`}
                onClick={() => setActiveSidePanel("chat")}
              >
                <ChatIcon fontSize="small" />
                <span>Chat</span>
              </button>

              {isOrganizer && (
                <button
                  type="button"
                  className={`vm-drawer-tab ${
                    activeSidePanel === "host" ? "active" : ""
                  }`}
                  onClick={() => setActiveSidePanel("host")}
                >
                  <SecurityIcon fontSize="small" />
                  <span>Host</span>
                  {waitingList.length > 0 && (
                    <span className="vm-tab-badge">{waitingList.length}</span>
                  )}
                </button>
              )}

              <button
                type="button"
                className="vm-drawer-close"
                onClick={() => setActiveSidePanel(null)}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            {/* ── TAB 1: PEOPLE / PARTICIPANTS LIST ── */}
            {activeSidePanel === "people" && (
              <div className="vm-drawer-body">
                {isOrganizer && (
                  <div className="vm-bulk-actions">
                    <button
                      type="button"
                      className="vm-bulk-btn"
                      onClick={() =>
                        handleModerateParticipant(null, "mute-all")
                      }
                    >
                      <MicOffIcon fontSize="small" /> Mute All Participants
                    </button>
                  </div>
                )}

                <div className="vm-participant-list">
                  {sortedParticipants.map((p) => {
                    const isMe = p.socketId === socketIdRef.current;
                    const targetPinKey = isMe ? "local" : p.socketId;
                    const isThisPinned = activePinnedId === targetPinKey;

                    return (
                      <div key={p.socketId} className="vm-participant-item">
                        <div className="vm-participant-avatar">
                          {getInitials(p.name)}
                        </div>
                        <div className="vm-participant-details">
                          <span className="vm-p-name">
                            {p.name} {isMe ? "(You)" : ""}
                          </span>
                          <span
                            className={`vm-p-role ${
                              p.isOrganizer ? "is-org" : ""
                            }`}
                          >
                            {p.isOrganizer ? "Organizer" : "Participant"}
                            {p.screen ? " · Presenting" : ""}
                          </span>
                        </div>

                        <div className="vm-participant-actions">
                          <button
                            type="button"
                            className={`vm-p-action-btn ${
                              isThisPinned ? "pinned-active" : ""
                            }`}
                            title={isThisPinned ? "Unpin screen" : "Pin screen"}
                            onClick={() => handleTogglePin(targetPinKey)}
                          >
                            <PinSvgIcon filled={isThisPinned} />
                          </button>

                          <span
                            className={`vm-p-icon ${p.audio ? "on" : "off"}`}
                          >
                            {p.audio ? (
                              <MicIcon fontSize="small" />
                            ) : (
                              <MicOffIcon fontSize="small" />
                            )}
                          </span>
                          <span
                            className={`vm-p-icon ${p.video ? "on" : "off"}`}
                          >
                            {p.video ? (
                              <VideocamIcon fontSize="small" />
                            ) : (
                              <VideocamOffIcon fontSize="small" />
                            )}
                          </span>

                          {!isMe && (
                            <button
                              type="button"
                              className="vm-p-action-btn"
                              title={`Message ${p.name}`}
                              onClick={() => openDirectChatWith(p.socketId)}
                            >
                              <ChatIcon fontSize="inherit" />
                            </button>
                          )}

                          {isOrganizer && !p.isOrganizer && (
                            <>
                              {p.audio && (
                                <button
                                  type="button"
                                  className="vm-p-action-btn"
                                  title="Force Mute"
                                  onClick={() =>
                                    handleModerateParticipant(
                                      p.socketId,
                                      "mute-mic",
                                    )
                                  }
                                >
                                  <MicOffIcon fontSize="inherit" />
                                </button>
                              )}
                              <button
                                type="button"
                                className="vm-p-action-btn danger"
                                title="Remove Participant"
                                onClick={() =>
                                  handleModerateParticipant(p.socketId, "kick")
                                }
                              >
                                <PersonRemoveIcon fontSize="inherit" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 2: ORGANIZER / HOST CONTROLS ── */}
            {activeSidePanel === "host" && isOrganizer && (
              <div className="vm-drawer-body">
                <div className="vm-host-section">
                  <div className="vm-host-section-header">
                    <h3>Waiting Room ({waitingList.length})</h3>
                    {waitingList.length > 1 && (
                      <button
                        type="button"
                        className="vm-text-btn"
                        onClick={() => handleWaitingDecision(null, "admit-all")}
                      >
                        Admit All
                      </button>
                    )}
                  </div>

                  {waitingList.length === 0 ? (
                    <p className="vm-empty-hint">
                      No one is currently waiting to join.
                    </p>
                  ) : (
                    <div className="vm-waiting-list">
                      {waitingList.map((w) => (
                        <div key={w.socketId} className="vm-waiting-item">
                          <span className="vm-waiting-name">{w.name}</span>
                          <div className="vm-waiting-btns">
                            <button
                              type="button"
                              className="vm-approve-btn"
                              onClick={() =>
                                handleWaitingDecision(w.socketId, "admit")
                              }
                            >
                              <CheckIcon fontSize="inherit" /> Admit
                            </button>
                            <button
                              type="button"
                              className="vm-deny-btn"
                              onClick={() =>
                                handleWaitingDecision(w.socketId, "deny")
                              }
                            >
                              <CloseIcon fontSize="inherit" /> Deny
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="vm-host-section">
                  <h3>Participant Permissions</h3>

                  <label className="vm-switch-row">
                    <div>
                      <span className="vm-switch-title">
                        Waiting Room Approval
                      </span>
                      <span className="vm-switch-desc">
                        Organizer must approve everyone before they join
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.waitingRoomEnabled}
                      onChange={(e) =>
                        handleUpdatePermission({
                          waitingRoomEnabled: e.target.checked,
                        })
                      }
                    />
                  </label>

                  <label className="vm-switch-row">
                    <div>
                      <span className="vm-switch-title">Allow Microphones</span>
                      <span className="vm-switch-desc">
                        Let participants unmute themselves
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.allowMic}
                      onChange={(e) =>
                        handleUpdatePermission({
                          allowMic: e.target.checked,
                        })
                      }
                    />
                  </label>

                  <label className="vm-switch-row">
                    <div>
                      <span className="vm-switch-title">Allow Cameras</span>
                      <span className="vm-switch-desc">
                        Let participants turn on their video
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.allowCam}
                      onChange={(e) =>
                        handleUpdatePermission({
                          allowCam: e.target.checked,
                        })
                      }
                    />
                  </label>

                  <label className="vm-switch-row">
                    <div>
                      <span className="vm-switch-title">
                        Allow Screen Sharing
                      </span>
                      <span className="vm-switch-desc">
                        Let participants share their screen
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.allowScreen}
                      onChange={(e) =>
                        handleUpdatePermission({
                          allowScreen: e.target.checked,
                        })
                      }
                    />
                  </label>

                  <div className="vm-chat-mode-control">
                    <span className="vm-switch-title">
                      Meeting Chat Permissions
                    </span>
                    <select
                      className="vm-select"
                      value={permissions.chatMode}
                      onChange={(e) =>
                        handleUpdatePermission({ chatMode: e.target.value })
                      }
                    >
                      <option value="everyone">
                        Everyone (Public & Direct Chat)
                      </option>
                      <option value="host_only">
                        Direct to Organizer Only
                      </option>
                      <option value="disabled">
                        Disabled (Only Organizer Can Send)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="vm-host-section">
                  <button
                    type="button"
                    className="vm-end-all-btn"
                    onClick={() =>
                      handleModerateParticipant(null, "end-meeting-for-all")
                    }
                  >
                    End Meeting for All
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 3: CHAT PANEL ── */}
            {activeSidePanel === "chat" && (
              <div className="vm-chat-wrapper">
                <div className="vm-chat-mode-banner">
                  {permissions.chatMode === "everyone" &&
                    "Chat is open to everyone"}
                  {permissions.chatMode === "host_only" &&
                    "Participants can only message the Organizer directly"}
                  {permissions.chatMode === "disabled" &&
                    "Chat is disabled for participants"}
                </div>

                <div className="vm-chat-messages">
                  {messages.length === 0 ? (
                    <p className="vm-empty-hint">No messages yet.</p>
                  ) : (
                    messages.map((item) => {
                      const isMine =
                        item.senderSocketId === socketIdRef.current;
                      return (
                        <div
                          key={item.id}
                          className={`vm-chat-bubble ${
                            isMine ? "mine" : ""
                          } ${item.scope === "direct" ? "direct-msg" : ""}`}
                        >
                          <div className="vm-chat-meta">
                            <span className="vm-chat-sender">
                              {item.sender}
                              {item.isOrganizer && (
                                <span className="vm-chat-org-tag">
                                  Organizer
                                </span>
                              )}
                            </span>
                            {item.scope === "direct" && (
                              <span className="vm-direct-pill">
                                Direct to {item.toName || "Organizer"}
                              </span>
                            )}
                            {item.timestamp && (
                              <span className="vm-chat-time">
                                {item.timestamp}
                              </span>
                            )}
                          </div>
                          <p className="vm-chat-text">{item.data}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form className="vm-chat-form" onSubmit={handleSendMessage}>
                  {permissions.chatMode === "everyone" || isOrganizer ? (
                    <div className="vm-chat-recipient-row">
                      <span>To:</span>
                      <select
                        className="vm-recipient-select"
                        value={chatTarget}
                        onChange={(e) => setChatTarget(e.target.value)}
                      >
                        <option value="everyone">Everyone in Meeting</option>
                        {sortedParticipants
                          .filter((p) => p.socketId !== socketIdRef.current)
                          .map((p) => (
                            <option key={p.socketId} value={p.socketId}>
                              {p.name}{" "}
                              {p.isOrganizer
                                ? "(Organizer - Direct)"
                                : "(Direct)"}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    permissions.chatMode === "host_only" && (
                      <div className="vm-chat-recipient-row">
                        <span>To:</span>
                        <span className="vm-direct-pill">
                          Organizer Only (Direct)
                        </span>
                      </div>
                    )
                  )}

                  <div className="vm-chat-input-row">
                    <input
                      type="text"
                      className="vm-chat-input"
                      placeholder={
                        !isOrganizer && permissions.chatMode === "disabled"
                          ? "Chat disabled by Organizer..."
                          : "Type a message..."
                      }
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={
                        !isOrganizer && permissions.chatMode === "disabled"
                      }
                    />
                    <button
                      type="submit"
                      className="vm-chat-send-btn"
                      disabled={
                        !message.trim() ||
                        (!isOrganizer && permissions.chatMode === "disabled")
                      }
                    >
                      <SendIcon fontSize="small" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Floating Control Dock */}
      <footer className="vm-control-dock">
        <button
          type="button"
          className={`vm-dock-btn ${!audio ? "off" : ""} ${
            micLocked ? "locked" : ""
          }`}
          onClick={() => handleToggleAudio()}
          title={
            micLocked
              ? "Microphone locked by Organizer"
              : audio
                ? "Mute Microphone"
                : "Unmute Microphone"
          }
        >
          {micLocked ? (
            <LockIcon fontSize="small" />
          ) : audio ? (
            <MicIcon />
          ) : (
            <MicOffIcon />
          )}
          <span>{micLocked ? "Mic Locked" : audio ? "Mute" : "Unmute"}</span>
        </button>

        <button
          type="button"
          className={`vm-dock-btn ${!video ? "off" : ""} ${
            camLocked ? "locked" : ""
          }`}
          onClick={() => handleToggleVideo()}
          title={
            camLocked
              ? "Camera locked by Organizer"
              : video
                ? "Turn Off Camera"
                : "Turn On Camera"
          }
        >
          {camLocked ? (
            <LockIcon fontSize="small" />
          ) : video ? (
            <VideocamIcon />
          ) : (
            <VideocamOffIcon />
          )}
          <span>
            {camLocked ? "Cam Locked" : video ? "Stop Video" : "Start Video"}
          </span>
        </button>

        {screenAvailable && (
          <button
            type="button"
            className={`vm-dock-btn ${screen ? "active-share" : ""} ${
              screenLocked ? "locked" : ""
            }`}
            onClick={() => handleToggleScreen()}
          >
            {screenLocked ? (
              <LockIcon fontSize="small" />
            ) : screen ? (
              <StopScreenShareIcon />
            ) : (
              <ScreenShareIcon />
            )}
            <span>{screen ? "Stop Share" : "Share"}</span>
          </button>
        )}

        <button
          type="button"
          className={`vm-dock-btn ${
            activeSidePanel === "people" ? "panel-open" : ""
          }`}
          onClick={() =>
            setActiveSidePanel(activeSidePanel === "people" ? null : "people")
          }
        >
          <PeopleAltIcon />
          <span>People ({participants.length})</span>
        </button>

        <button
          type="button"
          className={`vm-dock-btn ${
            activeSidePanel === "chat" ? "panel-open" : ""
          }`}
          onClick={() =>
            setActiveSidePanel(activeSidePanel === "chat" ? null : "chat")
          }
        >
          <div className="vm-badge-wrap">
            <ChatIcon />
            {newMessages > 0 && (
              <span className="vm-unread-badge">{newMessages}</span>
            )}
          </div>
          <span>Chat</span>
        </button>

        {isOrganizer && (
          <button
            type="button"
            className={`vm-dock-btn host-dock-btn ${
              activeSidePanel === "host" ? "panel-open" : ""
            }`}
            onClick={() =>
              setActiveSidePanel(activeSidePanel === "host" ? null : "host")
            }
          >
            <div className="vm-badge-wrap">
              <SecurityIcon />
              {waitingList.length > 0 && (
                <span className="vm-unread-badge">{waitingList.length}</span>
              )}
            </div>
            <span>Host Controls</span>
          </button>
        )}

        <button
          type="button"
          className="vm-dock-btn leave-btn"
          onClick={handleEndCall}
        >
          <CallEndIcon />
          <span>Leave</span>
        </button>
      </footer>
    </div>
  );
}
