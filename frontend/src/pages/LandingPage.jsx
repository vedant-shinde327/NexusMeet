import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import heroImg from "../assets/mobile.png";
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
          <img
            src={heroImg}
            alt="NexusMeet mobile and desktop preview"
            className="landing-hero-img"
          />
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
