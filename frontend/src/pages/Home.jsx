import LogoutIcon from "@mui/icons-material/Logout";
import RestoreIcon from "@mui/icons-material/Restore";
import { Button, TextField } from "@mui/material";
import axios from "axios";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import logo3 from "../assets/logo3.png";
import AuthContext from "../contexts/AuthContext";
import server from "../environment";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const { addToUserHistory } = useContext(AuthContext);

  const createNewMeeting = async () => {
    try {
      const response = await axios.post(`${server}/api/meeting/create`);
      const code = response.data.meetingCode;
      navigate(`/meeting/${code}`, {
        state: { isNewMeeting: true },
      });
    } catch (e) {
      console.log("Failed to create meeting:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  const handleJoinVideoCall = async () => {
    const trimmedCode = meetingCode.trim();
    if (!trimmedCode) {
      alert("Please enter a valid meeting code");
      return;
    }
    await addToUserHistory(trimmedCode);
    navigate(`/meeting/${trimmedCode}`);
  };

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
            <h1 className="dashboard-title">Instant HD Video Meetings</h1>
            <p className="subTitle">
              Connect effortlessly with secure, low-latency video conferencing
              built for modern collaboration.
            </p>

            <div className="dashboard-actions-group">
              <div className="action-row">
                <TextField
                  className="dashboard-input"
                  onChange={(e) => setMeetingCode(e.target.value)}
                  value={meetingCode}
                  id="meeting-code-input"
                  label="Enter meeting code"
                  variant="outlined"
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoinVideoCall();
                  }}
                />
                <Button
                  className="dash-btn-primary"
                  variant="contained"
                  onClick={handleJoinVideoCall}
                  disabled={!meetingCode.trim()}
                >
                  Join
                </Button>
              </div>

              <div
                style={{
                  textAlign: "center",
                  margin: "0.25rem 0",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                or
              </div>

              <Button
                className="dash-btn-secondary"
                variant="contained"
                onClick={createNewMeeting}
              >
                + Start a New Meeting
              </Button>
            </div>
          </div>
        </div>

        <div className="rightPanel">
          <img src={logo3} alt="Collaboration dashboard preview" />
        </div>
      </main>
    </div>
  );
}

export default Home;
