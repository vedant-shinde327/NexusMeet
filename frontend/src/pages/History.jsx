import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import AuthContext from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import "./Home.css";

function HistoryContent() {
  const { getHistoryOfUser, addToUserHistory, setUserData } =
    useContext(AuthContext);

  const [meetings, setMeetings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const history = await getHistoryOfUser();
        if (Array.isArray(history)) {
          const sorted = [...history].sort(
            (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
          );
          setMeetings(sorted);
        } else {
          setMeetings([]);
        }
      } catch (err) {
        console.error("Failed to fetch meeting history:", err);
        setError("Unable to load session history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [getHistoryOfUser]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    if (setUserData) setUserData(null);
    navigate("/auth");
  };

  const getRoomCode = (entry) => {
    return entry?.meetingCode || entry?.meeting_code || "unknown";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleCopyCode = (code, rowId) => {
    navigator.clipboard.writeText(code);
    setCopiedId(rowId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === rowId ? null : prev));
    }, 1800);
  };

  const handleRejoin = async (code) => {
    if (!code || code === "unknown") return;
    try {
      await addToUserHistory(code);
    } catch {
      // Proceed to room even if history log fails
    }
    navigate(`/meeting/${code}`);
  };

  const filteredMeetings = meetings.filter((item) =>
    getRoomCode(item).toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

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
            onClick={() => navigate("/home")}
          >
            <HomeIcon style={{ fontSize: 18 }} />
            <span>Dashboard</span>
          </button>

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
            className="nav-btn logout-btn"
            onClick={handleLogout}
          >
            <LogoutIcon style={{ fontSize: 18 }} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="history-stage">
        <div className="history-header-bar">
          <div className="history-title-group">
            <div className="history-title-row">
              <h1 className="history-heading">Session log</h1>
              <span className="history-count-pill">
                {meetings.length} {meetings.length === 1 ? "record" : "records"}
              </span>
            </div>
            <p className="history-subtitle">
              Chronological ledger of rooms you have joined or hosted.
            </p>
          </div>

          {meetings.length > 0 && (
            <div className="history-search-wrap">
              <svg
                className="history-search-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="history-search-input"
                placeholder="Filter by room code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <div className="profile-feedback error">{error}</div>}

        {loading ? (
          <div className="history-empty-card">
            <span className="history-loading-text">
              Loading session records...
            </span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="history-empty-card">
            <p className="history-empty-title">No sessions recorded yet</p>
            <p className="history-empty-desc">
              Rooms you join or start from the dashboard will appear here with
              their room serial code and timestamp.
            </p>
            <button
              type="button"
              className="dash-btn-primary"
              onClick={() => navigate("/home")}
            >
              <VideocamIcon style={{ fontSize: 18, marginRight: 6 }} />
              Go to dashboard
            </button>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="history-empty-card">
            <p className="history-empty-title">No matching room codes</p>
            <p className="history-empty-desc">
              No session matches "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="history-ledger">
            <div className="history-ledger-head">
              <span>Room code</span>
              <span>Date</span>
              <span>Time</span>
              <span className="ledger-col-right">Actions</span>
            </div>

            <div className="history-ledger-body">
              {filteredMeetings.map((entry, idx) => {
                const code = getRoomCode(entry);
                const rowId = entry._id || `${code}-${idx}`;
                const isCopied = copiedId === rowId;

                return (
                  <div key={rowId} className="history-row">
                    <div className="history-cell-code">
                      <span className="history-room-dot" />
                      <span className="history-code-text">{code}</span>
                    </div>

                    <div className="history-cell-meta">
                      {formatDate(entry.date)}
                    </div>

                    <div className="history-cell-meta muted">
                      {formatTime(entry.date) || "—"}
                    </div>

                    <div className="history-cell-actions">
                      <button
                        type="button"
                        className="history-action-btn"
                        onClick={() => handleCopyCode(code, rowId)}
                        title="Copy room code"
                      >
                        {isCopied ? (
                          <>
                            <CheckIcon
                              style={{ fontSize: 14, color: "#10b981" }}
                            />
                            <span className="copied-text">Copied</span>
                          </>
                        ) : (
                          <>
                            <ContentCopyIcon style={{ fontSize: 14 }} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="history-rejoin-btn"
                        onClick={() => handleRejoin(code)}
                      >
                        <span>Rejoin</span>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const AuthenticatedHistory = withAuth(HistoryContent);

export default function History() {
  return <AuthenticatedHistory />;
}
