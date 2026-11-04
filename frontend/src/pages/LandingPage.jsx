import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import "../App.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const [guestCode, setGuestCode] = useState("");
  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleGuestJoin = (e) => {
    e.preventDefault();
    const trimmed = guestCode.trim();
    if (trimmed) {
      navigate(`/meeting/${trimmed}`);
    }
  };

  const handleInstantGuestRoom = () => {
    const randomCode = Math.random().toString(36).substring(2, 10);
    navigate(`/meeting/${randomCode}`, { state: { isNewMeeting: true } });
  };

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
            onClick={() => setShowGuestModal(true)}
          >
            Join as Guest
          </button>
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

            <form className="landing-quick-join" onSubmit={handleGuestJoin}>
              <input
                type="text"
                placeholder="Enter meeting code..."
                value={guestCode}
                onChange={(e) => setGuestCode(e.target.value)}
                className="landing-code-input"
              />
              <button
                type="submit"
                disabled={!guestCode.trim()}
                className="landing-btn-secondary"
              >
                Join
              </button>
            </form>
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
          <div className="landing-glow-backdrop" />

          {/* Simulated Video Call UI Preview Card */}
          <div className="hero-mockup-container">
            <div className="hero-mockup-header">
              <span className="mockup-dot red" />
              <span className="mockup-dot yellow" />
              <span className="mockup-dot green" />
              <span className="mockup-room-title">
                nexusmeet.app/room/ux-sync
              </span>
            </div>

            <div className="hero-mockup-grid">
              {/* Tile 1 */}
              <div className="mockup-tile">
                <div className="mockup-avatar gradient-1">JS</div>
                <span className="mockup-tag">Jessica (Host)</span>
                <div className="mockup-mic active">🎤</div>
              </div>

              {/* Tile 2 */}
              <div className="mockup-tile">
                <div className="mockup-avatar gradient-2">VR</div>
                <span className="mockup-tag">Vedant</span>
                <div className="mockup-mic active">🎤</div>
              </div>

              {/* Tile 3 */}
              <div className="mockup-tile">
                <div className="mockup-avatar gradient-3">AK</div>
                <span className="mockup-tag">Aarav</span>
                <div className="mockup-mic muted">🔇</div>
              </div>

              {/* Tile 4 (Screen share preview simulation) */}
              <div className="mockup-tile screen-share-tile">
                <div className="screen-share-content">
                  <div className="mini-code-line" />
                  <div className="mini-code-line short" />
                  <div className="mini-code-line medium" />
                </div>
                <span className="mockup-tag">Screen Share</span>
              </div>
            </div>

            <div className="hero-mockup-toolbar">
              <span className="mockup-tool-btn active">📹</span>
              <span className="mockup-tool-btn active">🎙️</span>
              <span className="mockup-tool-btn">💻</span>
              <span className="mockup-tool-btn">💬</span>
              <span className="mockup-tool-btn danger">📞</span>
            </div>
          </div>
        </div>
      </main>

      {/* Guest Join Modal */}
      {showGuestModal && (
        <div
          className="landing-modal-overlay"
          onClick={() => setShowGuestModal(false)}
        >
          <div
            className="landing-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="landing-modal-header">
              <h3>Join as Guest</h3>
              <button
                type="button"
                className="landing-modal-close"
                onClick={() => setShowGuestModal(false)}
              >
                ×
              </button>
            </div>
            <p className="landing-modal-desc">
              Enter an existing meeting code or start an instant guest room
              without signing in.
            </p>
            <form onSubmit={handleGuestJoin} className="landing-modal-form">
              <input
                type="text"
                placeholder="e.g. a8f9k2m1x0"
                value={guestCode}
                onChange={(e) => setGuestCode(e.target.value)}
                autoFocus
                className="landing-code-input"
              />
              <button
                type="submit"
                disabled={!guestCode.trim()}
                className="landing-btn-primary"
              >
                Join Room
              </button>
            </form>
            <div className="landing-modal-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="landing-btn-secondary landing-full-width"
              onClick={handleInstantGuestRoom}
            >
              Start Instant Guest Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
