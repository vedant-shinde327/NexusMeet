import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import MicIcon from "@mui/icons-material/Mic";
import MicoffIcon from "@mui/icons-material/Micoff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import { Badge, Button, IconButton, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import server from "../environment";
import "../styles/videoComponent.css";
import './lobby.css';

const server_url = server;

const peerConfigConnections = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

function VideoMeet() {

  let routeTo = useNavigate();

  const { meetingCode } = useParams();

  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const videoRef = useRef([]);

  const connections = useRef({});

  const [micReady, setMicReady] = useState(false);
  const [camReady, setCamReady] = useState(false);

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);

  const [video, setVideo] = useState(undefined);
  const [audio, setAudio] = useState(undefined);

  const [screenAvailable, setScreenAvailable] = useState(false);
  const [screen, setScreen] = useState();

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  const [showModal, setModal] = useState(true);

  const [videos, setVideos] = useState([]);

  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");

  // Silence audio track

  const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();

    return Object.assign(dst.stream.getAudioTracks()[0], {
      enabled: false,
    });
  };

  // Black video track

  const blackScreen = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, width, height);

    const stream = canvas.captureStream();

    return Object.assign(stream.getVideoTracks()[0], {
      enabled: false,
    });
  };

  // Black video + silent audio

  const blackSilence = () => {
    return new MediaStream([blackScreen(), silence()]);
  };

  // Permissions

  const getPermissions = async () => {
    let videoPermission = false;
    let audioPermission = false;

    try {
      const videoStream = await navigator.mediaDevices
        .getUserMedia({ video: true })
        .catch(() => null);

      if (videoStream) {
        videoPermission = true;
        videoStream.getTracks().forEach((track) => track.stop());
      }

      setVideoAvailable(videoPermission);

      const audioStream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch(() => null);

      if (audioStream) {
        audioPermission = true;
        audioStream.getTracks().forEach((track) => track.stop());
      }

      setAudioAvailable(audioPermission);

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      }

      if (videoPermission || audioPermission) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoPermission,
          audio: audioPermission,
        });

        window.localStream = userMediaStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userMediaStream;
        }
        setMicReady(audioPermission);
        setCamReady(videoPermission);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  // Get new media stream

  const getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Replace stream in existing connections
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

      if (pc.signalingState === "stable") {
        pc.createOffer()
          .then((description) => pc.setLocalDescription(description))
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({
                sdp: pc.localDescription,
              }),
            );
          })
          .catch((e) => console.log(e));
      }
    }

    // If media track ends
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);

        try {
          if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }
        } catch (e) {
          console.log(e);
        }

        window.localStream = blackSilence();

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = window.localStream;
        }

        for (const id in connections.current) {
          const pc = connections.current[id];

          const senders = pc.getSenders();

          window.localStream.getTracks().forEach((track) => {
            const sender = senders.find(
              (s) => s.track && s.track.kind === track.kind,
            );

            if (sender) {
              sender.replaceTrack(track);
            } else {
              pc.addTrack(track, window.localStream);
            }
          });

          if (pc.signalingState === "stable") {
            pc.createOffer()
              .then((description) => pc.setLocalDescription(description))
              .then(() => {
                socketRef.current.emit(
                  "signal",
                  id,
                  JSON.stringify({
                    sdp: pc.localDescription,
                  }),
                );
              })
              .catch((e) => console.log(e));
          }
        }
      };
    });
  };

  // Get user media

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable,
        })
        .then(getUserMediaSuccess)
        .catch((e) => console.log(e));
    } else {
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }

      window.localStream = blackSilence();

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = window.localStream;
      }
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  // Receive WebRTC signal

  const gotMessageFromServer = async (fromId, message) => {
    try {
      const signal = JSON.parse(message);

      if (fromId === socketIdRef.current) {
        return;
      }

      const pc = connections.current[fromId];

      if (!pc) {
        return;
      }

      // ---------------- SDP ----------------

      if (signal.sdp) {
        const remoteDescription = new RTCSessionDescription(signal.sdp);

        // Offer
        if (signal.sdp.type === "offer") {
          if (pc.signalingState !== "stable") {
            return;
          }

          await pc.setRemoteDescription(remoteDescription);

          const answer = await pc.createAnswer();

          await pc.setLocalDescription(answer);

          socketRef.current.emit(
            "signal",
            fromId,
            JSON.stringify({
              sdp: pc.localDescription,
            }),
          );
        }

        // Answer
        if (signal.sdp.type === "answer") {
          if (pc.signalingState !== "have-local-offer") {
            return;
          }

          await pc.setRemoteDescription(remoteDescription);
        }
      }

      // ---------------- ICE ----------------

      if (signal.ice) {
        if (!pc.remoteDescription) {
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
      }
    } catch (e) {
      console.log("Signal error:", e);
    }
  };

  // Create peer connection

  const createPeerConnection = (socketListId) => {
    // Don't create duplicate peer connections
    if (connections.current[socketListId]) {
      return connections.current[socketListId];
    }

    const pc = new RTCPeerConnection(peerConfigConnections);

    connections.current[socketListId] = pc;

    // ICE candidate

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit(
          "signal",
          socketListId,
          JSON.stringify({
            ice: event.candidate,
          }),
        );
      }
    };

    // Remote video/audio

    pc.ontrack = (event) => {
      const stream = event.streams[0];

      if (!stream) return;

      setVideos((prevVideos) => {
        const existingVideo = prevVideos.find(
          (video) => video.socketId === socketListId,
        );

        // Update existing participant
        if (existingVideo) {
          const updatedVideos = prevVideos.map((video) =>
            video.socketId === socketListId
              ? {
                  ...video,
                  stream: stream,
                }
              : video,
          );

          videoRef.current = updatedVideos;

          return updatedVideos;
        }

        // Add participant only once
        const newVideo = {
          socketId: socketListId,
          stream: stream,
        };

        const updatedVideos = [...prevVideos, newVideo];

        videoRef.current = updatedVideos;

        return updatedVideos;
      });
    };

    // Add local stream

    const localStream = window.localStream || blackSilence();

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    return pc;
  };

  // add new message

  let addMessage = (data, sender, socketId) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);

    if (socketId !== socketIdRef.current) {
      setNewMessages((prevMessages) => prevMessages + 1);
    }
  };

  // Socket.IO

  const connectToSocketServer = () => {
    socketRef.current = io(server_url, {
      transports: ["websocket"],
    });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;

      const roomId =
        new URLSearchParams(window.location.search).get("room") ||
        "default-room";

      socketRef.current.emit("join-call", roomId);

      // Chat
      socketRef.current.on("chat-message", addMessage);

      setNewMessages((prev) => prev + 1);
    });

    // User left
    socketRef.current.on("user-left", (id) => {
      setVideos((prev) => prev.filter((video) => video.socketId !== id));

      videoRef.current = videoRef.current.filter(
        (video) => video.socketId !== id,
      );

      if (connections.current[id]) {
        connections.current[id].close();
        delete connections.current[id];
      }
    });

    // User joined
    socketRef.current.on("user-joined", (id, clients) => {
      clients.forEach((socketListId) => {
        if (socketListId === socketIdRef.current) {
          return;
        }

        createPeerConnection(socketListId);
      });

      // Only the newly joined user creates offers
      if (id === socketIdRef.current) {
        for (const id2 in connections.current) {
          if (id2 === socketIdRef.current) {
            continue;
          }

          const pc = connections.current[id2];

          if (pc.signalingState !== "stable") {
            continue;
          }
          pc.createOffer()
            .then((description) => {
              return pc.setLocalDescription(description);
            })
            .then(() => {
              socketRef.current.emit(
                "signal",
                id2,
                JSON.stringify({
                  sdp: pc.localDescription,
                }),
              );
            })

            .catch((error) => {
              console.error("Offer error:", error);
            });
        }
      }
    });
  };

  const toggleMic = () => {
    if (window.localStream) {
      const track = window.localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setMicReady(track.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (window.localStream) {
      const track = window.localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setCamReady(track.enabled);
      }
    }
  };

  const getMedia = () => {
    setAskForUsername(false);

    setAudio(audioAvailable);
    setVideo(videoAvailable);

    connectToSocketServer();
  };

  const remoteVideoRef = (socketId) => (element) => {
    if (!element) {
      return;
    }

    const found = videoRef.current.find((video) => video.socketId === socketId);

    if (found?.stream) {
      element.srcObject = found.stream;
    }
  };

  // --------------------------------------------------
  // Cleanup
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      Object.values(connections.current).forEach((pc) => {
        pc.close();
      });

      connections.current = {};

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  let handleVideo = () => {
    setVideo(!video);
  };

  let handleAudio = () => {
    setAudio(!audio);
  };

  const getDisplayMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

  
    for (let id in connections.current) {
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

      if (pc.signalingState === "stable") {
        pc.createOffer()
          .then((description) => {
            return pc.setLocalDescription(description);
          })
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({
                sdp: pc.localDescription,
              }),
            );
          })
          .catch((e) => console.log("Screen share offer error:", e));
      }
    }

    // Detect when user clicks "Stop sharing"
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        setScreen(false);

        try {
          if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }
        } catch (e) {
          console.log(e);
        }

        // Restore camera + microphone
        getUserMedia();
      };
    });
  };

  const getDisplayMedia = async () => {
    if (!screen) {
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      console.log("Screen sharing is not supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      getDisplayMediaSuccess(stream);
    } catch (e) {
      
      console.log("Screen sharing cancelled:", e);

      setScreen(false);
    }
  };

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  const handleScreen = () => {
    if (!screenAvailable) {
      return;
    }

    setScreen((prev) => !prev);
  };

  let handleChat = () => {
    setModal(!showModal);
  };

  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

const handleEndCall = () => {
  try {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());

      localVideoRef.current.srcObject = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setMessage("0");

    routeTo("/home");
  } catch (e) {
    console.log(e);
    routeTo("/home");
  }
};

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      {askForUsername ? (
        <div className="lobby-container">
          <div className="lobby-inner">
            <div className="lobby-meta">
              <p className="lobby-label">Ready to join?</p>
              <h2 className="lobby-heading">Check your setup</h2>
            </div>

            <div className="lobbyVideo">
              <video ref={localVideoRef} autoPlay muted playsInline />
              <div className="lobby-video-controls">
                <button className="lobby-icon-btn" onClick={toggleMic}>
                  <MicIcon size={14} />
                </button>
                <button className="lobby-icon-btn" onClick={toggleCamera}>
                  <VideocamIcon size={14} />
                </button>
              </div>
              <span className="lobby-video-label">You</span>
            </div>

            <div className="lobby-field">
              <label>Display name</label>
              <TextField
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                variant="outlined"
                size="small"
                fullWidth
              />
            </div>

            <div className="lobby-status-row">
              <div
                className={`lobby-status-chip ${micReady ? "ready" : "error"}`}
              >
                <MicIcon size={13} /> {micReady ? "Mic ready" : "No mic"}
              </div>
              <div
                className={`lobby-status-chip ${camReady ? "ready" : "error"}`}
              >
                <VideocamIcon size={13} />{" "}
                {camReady ? "Camera ready" : "No camera"}
              </div>
            </div>

            <Button
              className="connect-btn"
              variant="contained"
              onClick={getMedia}
              disabled={!username.trim()}
            >
              Join meeting
            </Button>

            <p className="lobby-hint">
              Others in the room will see your name and video
            </p>
          </div>
        </div>
      ) : (
        <div className={`meetRoom ${showModal ? "chat-open" : ""}`}>
          {showModal ? (
            <div className="chat-room">
              <div className="chatContainer">
                <h1>Chat</h1>

                <div className="chattingDisplay">
                  {messages.length > 0 ? (
                    messages.map((item, index) => {
                      return (
                        <div style={{ marginBottom: "8px" }} key={index}>
                          <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                          <p>{item.data}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p>No messages Yet</p>
                  )}
                </div>

                <div className="chattingArea">
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    multiline
                    minRows={1}
                    maxRows={4}
                    fullWidth
                    id="outlined"
                    label="Enter your message"
                    variant="outlined"
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          <div className="buttonContainer">
            <IconButton onClick={handleVideo} className="VedioIcon">
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}{" "}
            </IconButton>

            <IconButton onClick={handleEndCall} className="CallEndIcon">
              <CallEndIcon />
            </IconButton>

            <IconButton onClick={handleAudio} className="MicIcons">
              {audio === true ? <MicIcon /> : <MicoffIcon />}
            </IconButton>

            {screenAvailable && (
              <IconButton onClick={handleScreen} className="shareScreen">
                {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
              </IconButton>
            )}

            <Badge badgeContent={newMessages} max={999} color="secondary">
              <IconButton onClick={handleChat} className="chatIcon">
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          <div className="mainVideoWrapper">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="mainVideo"
            />
            <span className="nameTag">You ({username})</span>
          </div>

          {videos.length > 0 && (
            <div className="remoteStrip">
              {videos.map((v) => (
                <div key={v.socketId} className="remoteCard">
                  <video
                    ref={remoteVideoRef(v.socketId)}
                    autoPlay
                    playsInline
                    className="remoteVideo"
                  />
                  <span className="nameTag">Participant</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default VideoMeet;
