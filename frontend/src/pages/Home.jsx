import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import RestoreIcon from "@mui/icons-material/Restore";
import { Button, TextField } from "@mui/material";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import AuthContext from "../contexts/AuthContext";
import server from "../environment";
import withAuth from "../utils/withAuth";
import "./Home.css";

function 
Home() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const { userData, setUserData, addToUserHistory, getUserProfile } =
    useContext(AuthContext);

  // Fetch profile/user data on mount if not already in context
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!userData) {
          const profile = await getUserProfile();
          if (profile && profile.name) {
            localStorage.setItem("userName", profile.name);
            setUserData(profile);
          }
        }
      } catch (e) {
        console.error("Failed to load user data:", e);
      }
    };
    fetchUserData();
  }, [userData, setUserData, getUserProfile]);

  const createNewMeeting = async () => {
    try {
      const response = await axios.post(`${server}/api/meeting/create`);
      const meetingCode = response.data.meetingCode;

      navigate(`/meeting/${meetingCode}`, {
        state: { isNewMeeting: true },
      });
    } catch (e) {
      console.log(e);
    }
  };

  let handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setUserData(null);
    navigate("/auth");
  };

  let handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) return;
    await addToUserHistory(meetingCode.trim());
    navigate(`/meeting/${meetingCode.trim()}`);
  };

  // Get user initials for avatar badge (e.g. "Vedant Shinde" -> "VS")
  const displayName =
    userData?.name || localStorage.getItem("userName") || "Meeting Host";

  const getUserInitials = (name) => {
    if (!name || name === "Meeting Host") return "VM";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getUserInitials(displayName);

  return (
    <div className="home-container">
      <header className="home-nav">
        <div className="navHeader" onClick={() => navigate("/home")}>
          <img src={Logo1} alt="NexusLogo" className="NexusLogo" />
          <h2 className="NexusHeading">NexusMeet</h2>
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="nav-btn"
            onClick={() => navigate("/profile")}
          >
            <PersonIcon fontSize="small" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            className="nav-btn"
            onClick={() => navigate("/history")}
          >
            <RestoreIcon fontSize="small" />
            <span>History</span>
          </button>

          <button
            type="button"
            className="nav-btn logout-btn"
            onClick={handleLogout}
          >
            <LogoutIcon fontSize="small" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="meetContainer">
        <div className="leftPanel">
          <div className="dashboard-card">
            <div className="dashboard-badge">
              <span>● Instant HD Video Rooms</span>
            </div>

            <h1 className="dashboard-title">
              Providing Quality Video Call Just Like Quality Education
            </h1>

            <p className="subTitle">
              Enter a meeting code to join an existing room or launch a new
              instant meeting in one click.
            </p>

            <div className="dashboard-actions-group">
              <div className="action-row">
                <TextField
                  className="dashboard-input"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  id="outlined-basic"
                  label="Meeting Code"
                  variant="outlined"
                  size="small"
                />
                <Button
                  className="dash-btn-primary"
                  onClick={handleJoinVideoCall}
                  variant="contained"
                  disabled={!meetingCode.trim()}
                >
                  Join Meeting
                </Button>
              </div>

              <div className="dashboard-divider">or</div>

              <Button
                className="dash-btn-secondary"
                variant="contained"
                onClick={createNewMeeting}
              >
                + New Meeting
              </Button>
            </div>
          </div>
        </div>

        <div className="rightPanel">
          <div className="home-spotlight-mockup">
            {/* Top Status Bar */}
            <div className="spotlight-top-bar">
              <div className="spotlight-badge-secure">
                <span className="secure-lock">🔒</span> End-to-End Encrypted
              </div>
              <div className="spotlight-latency">
                <span className="latency-dot" /> 18ms • HD 1080p
              </div>
            </div>

            {/* Main Spotlight Video Stage */}
            <div className="spotlight-main-stage">
              <div className="spotlight-avatar-wrap">
                <div className="spotlight-ring" />
                <div className="spotlight-avatar-initials">{initials}</div>
              </div>
              <div className="spotlight-speaker-info">
                <span className="spotlight-name">{displayName}</span>
                <span className="spotlight-role">Meeting Host</span>
              </div>

              {/* Live Audio Waveform Animation */}
              <div className="spotlight-waveform">
                <span className="wave-bar bar-1" />
                <span className="wave-bar bar-2" />
                <span className="wave-bar bar-3" />
                <span className="wave-bar bar-4" />
                <span className="wave-bar bar-5" />
              </div>

              {/* Floating Participant Thumbnail */}
              <div className="spotlight-thumb-tile">
                <div className="thumb-avatar">JS</div>
                <span className="thumb-name">Jessica</span>
                <span className="thumb-mic">🎙️</span>
              </div>
            </div>

            {/* Bottom Floating Control Deck */}
            <div className="spotlight-control-deck">
              <button
                type="button"
                className="spotlight-btn active"
                title="Mute/Unmute"
              >
                🎙️
              </button>
              <button
                type="button"
                className="spotlight-btn active"
                title="Camera On/Off"
              >
                📹
              </button>
              <button
                type="button"
                className="spotlight-btn screen"
                title="Share Screen"
              >
                💻 Share
              </button>
              <button type="button" className="spotlight-btn chat" title="Chat">
                💬 <span className="chat-badge">3</span>
              </button>
              <button
                type="button"
                className="spotlight-btn leave"
                title="Leave Room"
              >
                📞
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const AuthenticatedHome = withAuth(Home);

function HomePage() {
  return <AuthenticatedHome />;
}

export default HomePage;
