import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HomeIcon from "@mui/icons-material/Home";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import AuthContext from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import "./Home.css";

function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(Array.isArray(history) ? history : []);
      } catch (e) {
        console.error("Error loading history:", e);
      }
    };
    fetchHistory();
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    if (!dateString) return "Recent";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
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
            onClick={() => navigate("/home")}
          >
            <HomeIcon fontSize="small" />
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              marginBottom: "0.5rem",
              color: "#fff",
            }}
          >
            Meeting History
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Review your past video conference sessions and quickly rejoin rooms.
          </p>
        </div>

        {meetings.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {meetings.map((e, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#ffffff",
                      }}
                    >
                      Room Code:{" "}
                      <code
                        style={{
                          color: "var(--accent-cyan)",
                          background: "rgba(62, 198, 224, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "6px",
                        }}
                      >
                        {e.meetingCode}
                      </code>
                    </span>
                  </div>
                  <p
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    {formatDate(e.date)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="history-action-btn"
                    onClick={() => handleCopy(e.meetingCode)}
                    title="Copy code"
                  >
                    <ContentCopyIcon fontSize="small" />
                    <span>
                      {copiedCode === e.meetingCode ? "Copied!" : "Copy"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="history-rejoin-btn"
                    onClick={() => navigate(`/meeting/${e.meetingCode}`)}
                  >
                    <VideoCallIcon fontSize="large" />
                    <span style={{ color: "red" }}>Rejoin</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "var(--bg-secondary)",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-secondary)",
            }}
          >
            <p
              style={{
                fontSize: "1.1rem",
                marginBottom: "1rem",
                color: "#fff",
              }}
            >
              No meeting history found.
            </p>
            <button
              type="button"
              className="history-rejoin-btn"
              onClick={() => navigate("/home")}
              style={{ margin: "0 auto" }}
            >
              Start Your First Meeting
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const AuthenticatedHistory = withAuth(History);

function HistoryPage() {
  return <AuthenticatedHistory />;
}

export default HistoryPage;
