import { useNavigate, Navigate } from "react-router-dom";
import { isSessionValid } from "../utils/withAuth";
import Logo1 from "../../public/favicon.svg";
import "../App.css";
import MicNoneOutlinedIcon from "@mui/icons-material/Mic";
import MicOffOutlinedIcon from "@mui/icons-material/MicOff";
import VideocamOutlinedIcon from "@mui/icons-material/Videocam";
import PresentToAllOutlinedIcon from "@mui/icons-material/ScreenShare";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/Chat";
import CallEndOutlinedIcon from "@mui/icons-material/CallEnd";

export default function LandingPage() {
  const navigate = useNavigate();

  if (isSessionValid()) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="landing-page">
      {/* Top Navigation */}
      <header className="landing-navbar">
        <div className="landing-brand" onClick={() => navigate("/")}>
          <div className="landing-logo-wrap">
            <img src={Logo1} alt="NexusMeet Logo" className="landing-logo" />
          </div>
          <span className="landing-brand-name">NexusMeet</span>
        </div>

        <nav className="landing-nav-actions">
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => navigate("/auth", { state: { mode: "register" } })}
          >
            Register
          </button>
          <button
            type="button"
            className="landing-btn-primary landing-btn-sm"
            onClick={() => navigate("/auth", { state: { mode: "login" } })}
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-pill">
            <span className="landing-pill-dot" />
            <span>Next-Gen WebRTC Video Conferencing</span>
          </div>

          <h1 className="landing-title">
            <span className="landing-title-accent">Connect</span> with your team
            & loved ones in real time.
          </h1>

          <p className="landing-subtitle">
            Crystal-clear HD video, low-latency screen sharing, and instant
            in-room chat — engineered for seamless collaboration anywhere.
          </p>

          <div className="landing-cta-group">
            <button
              type="button"
              className="landing-btn-primary landing-btn-lg"
              onClick={() => navigate("/auth", { state: { mode: "login" } })}
            >
              Get Started Free
            </button>
          </div>

          <div className="landing-features-row">
            <div className="landing-feature-item">
              <span className="landing-check">✓</span> HD Peer-to-Peer Video
            </div>
            <div className="landing-feature-item">
              <span className="landing-check">✓</span> Screen Sharing
            </div>
            <div className="landing-feature-item">
              <span className="landing-check">✓</span> No Downloads Required
            </div>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-app-mockup">
            <div className="mockup-top-bar">
              <div className="mockup-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <div className="mockup-url">nexusmeet.app/ux-review</div>
              <div className="mockup-badge-live">22ms · 1080p</div>
            </div>

            <div className="mockup-video-grid">
              <div className="mockup-video-tile active-speaker">
                <div className="mockup-avatar">JS</div>
                <span className="mockup-name-tag">Jessica · Organizer</span>
                <span className="mockup-mic-icon">
                  <MicNoneOutlinedIcon style={{ fontSize: 13 }} />
                </span>
              </div>
              <div className="mockup-video-tile">
                <div className="mockup-avatar">VS</div>
                <span className="mockup-name-tag">Vedant</span>
                <span className="mockup-mic-icon">
                  <MicNoneOutlinedIcon style={{ fontSize: 13 }} />
                </span>
              </div>
              <div className="mockup-video-tile">
                <div className="mockup-avatar">AK</div>
                <span className="mockup-name-tag">Aarav</span>
                <span className="mockup-mic-icon muted">
                  <MicOffOutlinedIcon style={{ fontSize: 13 }} />
                </span>
              </div>
              <div className="mockup-video-tile screen-tile">
                <div className="screen-preview-content">
                  <div className="screen-bar" />
                  <div className="screen-line" />
                  <div className="screen-line l2" />
                </div>
                <span className="mockup-name-tag">Screen Share</span>
              </div>
            </div>

            <div className="mockup-control-bar">
              <span className="mockup-ctrl-btn">
                <MicNoneOutlinedIcon style={{ fontSize: 16 }} />
              </span>
              <span className="mockup-ctrl-btn">
                <VideocamOutlinedIcon style={{ fontSize: 16 }} />
              </span>
              <span className="mockup-ctrl-btn">
                <PresentToAllOutlinedIcon style={{ fontSize: 16 }} />
              </span>
              <span className="mockup-ctrl-btn">
                <ChatBubbleOutlineOutlinedIcon style={{ fontSize: 15 }} />
              </span>
              <span className="mockup-ctrl-btn end">
                <CallEndOutlinedIcon style={{ fontSize: 16 }} />
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
