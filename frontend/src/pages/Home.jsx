import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import LogoutIcon from "@mui/icons-material/Logout";
import MicIcon from "@mui/icons-material/Mic";
import PersonIcon from "@mui/icons-material/Person";
import RestoreIcon from "@mui/icons-material/Restore";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import VideocamIcon from "@mui/icons-material/Videocam";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import AuthContext from "../contexts/AuthContext";
import server from "../environment";
import withAuth from "../utils/withAuth";
import "./Home.css";

const getScheduleStorageKey = () => {
  const token = localStorage.getItem("token");
  return token ? `nexus_scheduled_${token}` : null;
};

const getLocalTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultFutureTime = () => {
  const future = new Date(Date.now() + 30 * 60 * 1000);
  const hrs = String(future.getHours()).padStart(2, "0");
  const mins = String(future.getMinutes()).padStart(2, "0");
  return `${hrs}:${mins}`;
};

function Home() {
  const navigate = useNavigate();
  const [meetingInput, setMeetingInput] = useState("");
  const { userData, setUserData, addToUserHistory, getUserProfile } =
    useContext(AuthContext);

  const [scheduledMeetings, setScheduledMeetings] = useState(() => {
    try {
      localStorage.removeItem("nexus_scheduled_meetings"); // Clear legacy global key
      const storageKey = getScheduleStorageKey();
      if (!storageKey) return [];
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore cache error
    }
    return [];
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [createdMeetingModal, setCreatedMeetingModal] = useState(null);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDate, setScheduleDate] = useState(getLocalTodayDate);
  const [scheduleTime, setScheduleTime] = useState(getDefaultFutureTime);
  const [scheduleWaitingRoom, setScheduleWaitingRoom] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);

  const displayName =
    userData?.name || localStorage.getItem("userName") || "Organizer";
  const currentUsername =
    userData?.username || localStorage.getItem("userName") || "";

  // Authoritatively replaces state and per-user cache with active upcoming meetings only
  const syncMeetingsState = (list) => {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    const map = new Map();

    list.forEach((item) => {
      if (
        !item ||
        !item.meetingCode ||
        !item.isScheduled ||
        item.status === "completed" ||
        item.status === "history"
      ) {
        return;
      }
      const timeMs = new Date(
        item.scheduledAt || item.createdAt || Date.now(),
      ).getTime();
      if (timeMs >= cutoff) {
        map.set(item.meetingCode, item);
      }
    });

    const sorted = Array.from(map.values()).sort(
      (a, b) =>
        new Date(a.scheduledAt || 0).getTime() -
        new Date(b.scheduledAt || 0).getTime(),
    );

    setScheduledMeetings(sorted);
    try {
      const storageKey = getScheduleStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(sorted));
      }
    } catch {
      // Ignore quota errors
    }
  };

  const loadScheduledMeetings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setScheduledMeetings([]);
        return;
      }
      const res = await axios.get(`${server}/api/meeting/scheduled`, {
        params: { token, _t: Date.now() },
      });
      if (Array.isArray(res.data)) {
        // Use backend list as authoritative source of truth (do not re-merge old cache)
        syncMeetingsState(res.data);
      }
    } catch (e) {
      console.error("Failed to load scheduled meetings:", e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initDashboard = async () => {
      let uname = userData?.username || "";
      try {
        if (!userData) {
          const profile = await getUserProfile();
          if (profile && isMounted) {
            setUserData(profile);
            uname = profile.username || "";
            if (profile.name) {
              localStorage.setItem("userName", profile.name);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load user data:", e);
      }
      if (isMounted) {
        loadScheduledMeetings(uname);
      }
    };

    initDashboard();

    // Keep relative countdown badges current without reading the clock during render.
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const extractRoomCode = (rawInput) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return "";
    try {
      if (trimmed.includes("/meeting/")) {
        const after = trimmed.split("/meeting/")[1];
        return after.split(/[?#/\s]/)[0];
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        const segments = url.pathname.split("/").filter(Boolean);
        return segments[segments.length - 1] || "";
      }
    } catch {
      // Fallback to raw string
    }
    return trimmed;
  };

  const buildFullMeetingLink = (code) => {
    return `${window.location.origin}/meeting/${code}`;
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // 1. Create Instant Meeting & Immediately Add to Upcoming List
  const createInstantMeeting = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${server}/api/meeting/create`, {
        token,
        username: currentUsername,
        organizerName: displayName,
        title: `${displayName}'s Instant Room`,
        isScheduled: false,
        waitingRoomEnabled: true,
      });

      const createdItem = {
        meetingCode: response.data.meetingCode,
        title: response.data.title || `${displayName}'s Instant Room`,
        scheduledAt: response.data.scheduledAt || new Date().toISOString(),
        isScheduled: false,
      };

      setCreatedMeetingModal({
        ...createdItem,
        fullLink: buildFullMeetingLink(createdItem.meetingCode),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  // 2. Schedule Meeting for Later & Immediately Show in Upcoming List
  const handleCreateScheduledMeeting = async (e) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleTime) return;

    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const [year, month, day] = scheduleDate.split("-").map(Number);
      const [hours, minutes] = scheduleTime.split(":").map(Number);
      const combinedDate = new Date(year, month - 1, day, hours, minutes, 0);

      const cleanTitle =
        scheduleTitle.trim() || `${displayName}'s Scheduled Meeting`;

      const response = await axios.post(`${server}/api/meeting/create`, {
        token,
        username: currentUsername,
        organizerName: displayName,
        title: cleanTitle,
        scheduledAt: combinedDate.toISOString(),
        isScheduled: true,
        waitingRoomEnabled: scheduleWaitingRoom,
      });

      const createdItem = {
        meetingCode: response.data.meetingCode,
        title: response.data.title || cleanTitle,
        scheduledAt: response.data.scheduledAt || combinedDate.toISOString(),
        isScheduled: true,
      };

      // Update state & localStorage immediately so it shows right now
      syncMeetingsState([...scheduledMeetings, createdItem]);

      setShowScheduleModal(false);
      setScheduleTitle("");

      setCreatedMeetingModal({
        ...createdItem,
        fullLink: buildFullMeetingLink(createdItem.meetingCode),
      });
    } catch (err) {
      console.error("Error scheduling meeting:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteScheduled = async (code) => {
    const remaining = scheduledMeetings.filter((m) => m.meetingCode !== code);
    syncMeetingsState(remaining);

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${server}/api/meeting/${code}`, {
        params: { token, username: currentUsername },
      });
    } catch (e) {
      console.error("Failed to remove scheduled meeting:", e);
    }
  };

  const handleLogout = () => {
    const storageKey = getScheduleStorageKey();
    if (storageKey) localStorage.removeItem(storageKey);
    localStorage.removeItem("nexus_scheduled_meetings");
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setUserData(null);
    navigate("/auth");
  };

  const handleJoinVideoCall = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = extractRoomCode(meetingInput);
    if (!cleanCode) return;
    try {
      await addToUserHistory(cleanCode);
    } catch {
      // Proceed to meeting even if history logging fails
    }
    navigate(`/meeting/${cleanCode}`);
  };

  const getUserInitials = (name) => {
    if (!name || name === "Organizer") return "NM";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatScheduleTimestamp = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getRelativeStatus = (isoString) => {
    if (!isoString) return { label: "Ready", isReady: true };
    if (currentTime === null) return { label: "Checking...", isReady: false };
    const diffMs = new Date(isoString).getTime() - currentTime;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins <= 5) {
      return { label: "Ready to start", isReady: true };
    }
    if (diffMins < 60) {
      return { label: `In ${diffMins}m`, isReady: false };
    }
    const hrs = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    return {
      label: remMins > 0 ? `In ${hrs}h ${remMins}m` : `In ${hrs}h`,
      isReady: false,
    };
  };

  const initials = getUserInitials(displayName);

  return (
    <div className="home-container">
      <header className="home-nav">
        <div className="navHeader" onClick={() => navigate("/home")}>
          <div className="nav-logo-box">
            <img src={Logo1} alt="NexusMeet" className="NexusLogo" />
          </div>
          <h2 className="NexusHeading">NexusMeet</h2>
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="nav-btn"
            onClick={() => navigate("/profile")}
          >
            <PersonIcon style={{ fontSize: 18 }} />
            <span>Profile</span>
          </button>

          <button
            type="button"
            className="nav-btn"
            onClick={() => navigate("/history")}
          >
            <RestoreIcon style={{ fontSize: 18 }} />
            <span>History</span>
          </button>

          <button
            type="button"
            className="nav-btn logout-btn"
            onClick={handleLogout}
          >
            <LogoutIcon style={{ fontSize: 18 }} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="meetContainer">
        <div className="leftPanel">
          <div className="dashboard-card">
            <div className="dashboard-badge">
              <span className="badge-dot" />
              <span>WebRTC Studio · Instant & Scheduled Links</span>
            </div>

            <h1 className="dashboard-title">
              Low-latency video rooms with shareable meeting links.
            </h1>

            <p className="subTitle">
              Start an instant room, schedule a session for a specific time, or
              paste a meeting link or code to join.
            </p>

            <div className="dashboard-actions-group">
              <form className="action-row" onSubmit={handleJoinVideoCall}>
                <input
                  type="text"
                  className="dashboard-native-input"
                  placeholder="Paste meeting link or code (e.g. nxm-4f9a-k2p)"
                  value={meetingInput}
                  onChange={(e) => setMeetingInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="dash-btn-primary"
                  disabled={!meetingInput.trim()}
                >
                  Join room
                </button>
              </form>

              <div className="dashboard-divider">
                <span>or create a meeting link</span>
              </div>

              <div className="dashboard-create-grid">
                <button
                  type="button"
                  className="dash-btn-primary"
                  onClick={createInstantMeeting}
                  disabled={creating}
                >
                  <VideocamIcon style={{ fontSize: 18 }} />
                  <span>New instant meeting</span>
                </button>

                <button
                  type="button"
                  className="dash-btn-secondary"
                  onClick={() => {
                    setScheduleDate(getLocalTodayDate());
                    setScheduleTime(getDefaultFutureTime());
                    setShowScheduleModal(true);
                  }}
                >
                  <RestoreIcon style={{ fontSize: 18 }} />
                  <span>Schedule for later</span>
                </button>
              </div>
            </div>

            {/* Always-Visible Upcoming Scheduled Meetings Ledger */}
            <div className="scheduled-list-section">
              <div className="scheduled-list-header">
                <span>Upcoming & active rooms</span>
                <span className="scheduled-count">
                  {scheduledMeetings.length}
                </span>
              </div>

              {scheduledMeetings.length === 0 ? (
                <div className="scheduled-empty-box">
                  No upcoming meetings scheduled. Click{" "}
                  <strong>Schedule for later</strong> above to create a
                  time-locked room link.
                </div>
              ) : (
                <div className="scheduled-items">
                  {scheduledMeetings.map((item) => {
                    const fullLink = buildFullMeetingLink(item.meetingCode);
                    const isCopied = copiedKey === item.meetingCode;
                    const status = getRelativeStatus(item.scheduledAt);

                    return (
                      <div key={item.meetingCode} className="scheduled-row">
                        <div className="scheduled-row-info">
                          <div className="scheduled-title-line">
                            <span className="scheduled-row-title">
                              {item.title}
                            </span>
                            <span
                              className={`scheduled-status-pill ${
                                status.isReady ? "ready" : "upcoming"
                              }`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <span className="scheduled-row-meta">
                            {formatScheduleTimestamp(item.scheduledAt)} ·{" "}
                            {item.meetingCode}
                          </span>
                        </div>

                        <div className="scheduled-row-actions">
                          <button
                            type="button"
                            className="history-action-btn"
                            onClick={() =>
                              handleCopyText(fullLink, item.meetingCode)
                            }
                            title="Copy full meeting link"
                          >
                            {isCopied ? (
                              <>
                                <CheckIcon
                                  style={{ fontSize: 13, color: "#10b981" }}
                                />
                                <span className="copied-text">Copied</span>
                              </>
                            ) : (
                              <>
                                <ContentCopyIcon style={{ fontSize: 13 }} />
                                <span>Copy link</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="history-rejoin-btn"
                            onClick={async () => {
                              try {
                                await addToUserHistory(item.meetingCode);
                              } catch {
                                // Ignore history log errors
                              }
                              navigate(`/meeting/${item.meetingCode}`, {
                                state: { isNewMeeting: true },
                              });
                            }}
                          >
                            Start
                          </button>

                          <button
                            type="button"
                            className="scheduled-delete-btn"
                            title="Remove room from list"
                            onClick={() =>
                              handleDeleteScheduled(item.meetingCode)
                            }
                          >
                            <CloseIcon style={{ fontSize: 14 }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rightPanel">
          <div className="home-spotlight-mockup">
            <div className="spotlight-top-bar">
              <div className="spotlight-badge-secure">
                <LockIcon style={{ fontSize: 13 }} />
                <span>E2EE · SRTP</span>
              </div>
              <div className="spotlight-latency">
                <span className="latency-dot" />
                <span>18ms · 1080p60</span>
              </div>
            </div>

            <div className="spotlight-main-stage">
              <div className="spotlight-avatar-wrap">
                <div className="spotlight-avatar-initials">{initials}</div>
              </div>
              <div className="spotlight-speaker-info">
                <span className="spotlight-name">{displayName}</span>
                <span className="spotlight-role">Organizer · Studio Audio</span>
              </div>

              <div className="spotlight-telemetry-pill">
                <MicIcon style={{ fontSize: 13 }} />
                <span>48kHz · -12 dB</span>
              </div>

              <div className="spotlight-thumb-tile">
                <div className="thumb-avatar">JS</div>
                <span className="thumb-name">Jessica</span>
                <span className="thumb-mic">
                  <MicIcon style={{ fontSize: 11 }} />
                </span>
              </div>
            </div>

            <div className="spotlight-control-deck">
              <span className="spotlight-btn">
                <MicIcon style={{ fontSize: 16 }} />
              </span>
              <span className="spotlight-btn">
                <VideocamIcon style={{ fontSize: 16 }} />
              </span>
              <span className="spotlight-btn screen">
                <ScreenShareIcon style={{ fontSize: 16 }} />
                <span>Share</span>
              </span>
              <span className="spotlight-btn chat">
                <ChatIcon style={{ fontSize: 15 }} />
                <span className="chat-badge">3</span>
              </span>
              <span className="spotlight-btn leave">
                <CallEndIcon style={{ fontSize: 16 }} />
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ── MODAL 1: Schedule Meeting for Later ── */}
      {showScheduleModal && (
        <div
          className="landing-modal-overlay"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="landing-modal-card schedule-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="landing-modal-header">
              <h3>Schedule a meeting</h3>
              <button
                type="button"
                className="landing-modal-close"
                onClick={() => setShowScheduleModal(false)}
              >
                ×
              </button>
            </div>
            <p className="landing-modal-desc">
              Create a dedicated link for a specific date and time. Your room
              will appear immediately in your Upcoming list so you can start it
              whenever you are ready.
            </p>

            <form
              className="schedule-form"
              onSubmit={handleCreateScheduledMeeting}
            >
              <div className="profile-field">
                <label className="profile-label">Meeting title</label>
                <input
                  type="text"
                  className="profile-input"
                  placeholder="e.g. Client Architecture Review"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  required
                />
              </div>

              <div className="schedule-datetime-grid">
                <div className="profile-field">
                  <label className="profile-label">Date</label>
                  <input
                    type="date"
                    className="profile-input"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Start time</label>
                  <input
                    type="time"
                    className="profile-input"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <label className="schedule-checkbox-row">
                <input
                  type="checkbox"
                  checked={scheduleWaitingRoom}
                  onChange={(e) => setScheduleWaitingRoom(e.target.checked)}
                />
                <span>Enable Waiting Room (Organizer must admit guests)</span>
              </label>

              <div className="schedule-modal-actions">
                <button
                  type="button"
                  className="dash-btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dash-btn-primary"
                  disabled={creating}
                >
                  {creating ? "Generating link..." : "Create meeting link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Shareable Full Meeting Link Popup ── */}
      {createdMeetingModal && (
        <div
          className="landing-modal-overlay"
          onClick={() => setCreatedMeetingModal(null)}
        >
          <div
            className="landing-modal-card schedule-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="landing-modal-header">
              <h3>Your meeting link is ready</h3>
              <button
                type="button"
                className="landing-modal-close"
                onClick={() => setCreatedMeetingModal(null)}
              >
                ×
              </button>
            </div>

            <p className="landing-modal-desc">
              This room is now saved to your{" "}
              <strong>Upcoming & active rooms</strong> list on the dashboard.
              Share the link below and click <strong>Start</strong> whenever you
              are ready.
            </p>

            <div className="share-link-box">
              <div className="share-meta-row">
                <span className="share-meta-title">
                  {createdMeetingModal.title}
                </span>
                <span className="share-meta-time">
                  {createdMeetingModal.isScheduled
                    ? "Scheduled: "
                    : "Created: "}
                  {formatScheduleTimestamp(createdMeetingModal.scheduledAt)}
                </span>
              </div>

              <div className="share-url-row">
                <input
                  type="text"
                  readOnly
                  className="share-url-input"
                  value={createdMeetingModal.fullLink}
                />
                <button
                  type="button"
                  className="dash-btn-primary"
                  onClick={() =>
                    handleCopyText(createdMeetingModal.fullLink, "modal-link")
                  }
                >
                  {copiedKey === "modal-link" ? "Copied!" : "Copy link"}
                </button>
              </div>

              <button
                type="button"
                className="share-invite-btn"
                onClick={() => {
                  const inviteText = `${displayName} is inviting you to a NexusMeet session: "${
                    createdMeetingModal.title
                  }"\nTime: ${formatScheduleTimestamp(
                    createdMeetingModal.scheduledAt,
                  )}\nJoin Link: ${
                    createdMeetingModal.fullLink
                  }\nMeeting Code: ${createdMeetingModal.meetingCode}`;
                  handleCopyText(inviteText, "modal-invite");
                }}
              >
                <ContentCopyIcon style={{ fontSize: 14 }} />
                <span>
                  {copiedKey === "modal-invite"
                    ? "Full invitation copied!"
                    : "Copy full meeting invitation"}
                </span>
              </button>
            </div>

            <div className="schedule-modal-actions">
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => setCreatedMeetingModal(null)}
              >
                Done (Start later)
              </button>
              <button
                type="button"
                className="dash-btn-primary"
                onClick={async () => {
                  const code = createdMeetingModal.meetingCode;
                  setCreatedMeetingModal(null);
                  try {
                    await addToUserHistory(code);
                  } catch {
                    // Ignore history errors
                  }
                  navigate(`/meeting/${code}`, {
                    state: { isNewMeeting: true },
                  });
                }}
              >
                Start room now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const AuthenticatedHome = withAuth(Home);

function HomePage() {
  return <AuthenticatedHome />;
}

export default HomePage;
