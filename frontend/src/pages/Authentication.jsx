import { useContext, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NexusLogo from "../../public/favicon.svg";
import AuthContext from "../contexts/AuthContext.jsx";
import "./Login.css";

export default function Authentication() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // formState: 0 = Sign In, 1 = Sign Up
  const [formState, setFormState] = useState(
    location.state?.mode === "register" ? 1 : 0,
  );

  const { handleRegister, handleLogin, handleGoogleLogin } =
    useContext(AuthContext);

  const googleLoginHandlerRef = useRef(handleGoogleLogin);
  useEffect(() => {
    googleLoginHandlerRef.current = handleGoogleLogin;
  }, [handleGoogleLogin]);

  // Step 3: Guarded Google Identity Services Initialization & Button Render
  useEffect(() => {
    const googleClientId =
      "807864576822-9gdormbgc60pkprc3ft8jvbok6qmudsq.apps.googleusercontent.com";

    const initAndRenderGoogleButton = () => {
      if (!window.google?.accounts?.id) return;

      // 1. Initialize strictly once per browser tab to eliminate GSI_LOGGER multi-initialize errors
      if (!window.__nexusGsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: "popup",
          use_fedcm_for_prompt: false,
          callback: async (response) => {
            try {
              setError("");
              setSuccessMessage("");
              setLoading(true);
              if (googleLoginHandlerRef.current) {
                await googleLoginHandlerRef.current(response.credential);
                setSuccessMessage("Signed in with Google successfully!");
              } else {
                alert("Google login function is not defined in AuthContext.");
              }
            } catch (err) {
              setError(
                err.response?.data?.message ||
                  err.message ||
                  "Google sign-in failed",
              );
            } finally {
              setLoading(false);
            }
          },
        });
        window.__nexusGsiInitialized = true;
      }

      // 2. Clear stale auto-select prompts left over from logout
      window.google.accounts.id.disableAutoSelect();

      // 3. Render the Google button cleanly into #google-button-div
      const btnContainer = document.getElementById("google-button-div");
      if (btnContainer) {
        btnContainer.innerHTML = "";
        window.google.accounts.id.renderButton(btnContainer, {
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          logo_alignment: "left",
          width: 320,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initAndRenderGoogleButton();
      return;
    }

    let script = document.getElementById("google-client-script");
    if (!script) {
      script = document.createElement("script");
      script.id = "google-client-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initAndRenderGoogleButton;
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", initAndRenderGoogleButton);
      return () =>
        script.removeEventListener("load", initAndRenderGoogleButton);
    }
  }, [formState]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (formState === 0) {
        await handleLogin(username.trim(), password);
        setSuccessMessage("Signed in successfully!");
      } else {
        if (!name.trim()) {
          throw new Error("Full name is required");
        }
        const result = await handleRegister(
          name.trim(),
          username.trim(),
          password,
        );
        setSuccessMessage(
          result || "Account created successfully! Please sign in.",
        );
        setTimeout(() => {
          setFormState(0);
          setPassword("");
        }, 1500);
      }
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {successMessage && (
        <div className="success-popup">
          <span>✓</span>
          {successMessage}
        </div>
      )}

      <div className="login-page">
        {/* ── Left Promotional Panel ── */}
        <div className="login-left">
          <div className="login-logo" onClick={() => navigate("/")}>
            <div className="login-logo-icon">
              <img src={NexusLogo} alt="NexusMeet" width="22" height="22" />
            </div>
            <span className="login-logo-text">NexusMeet</span>
          </div>

          <div className="login-hero">
            <p className="login-eyebrow">Online Meeting Platform</p>
            <h1 className="login-heading">
              Meet Anyone.
              <br />
              Anywhere.
            </h1>
            <p className="login-subtext">
              HD video, screen sharing, and real-time collaboration — all in one
              secure space.
            </p>
          </div>

          <div className="login-badge">
            <span className="login-badge-dot" />
            <span className="login-badge-text">
              Secure WebRTC video rooms active globally
            </span>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="login-right">
          <div className="login-card">
            <h2 className="login-card-title">
              {formState === 0 ? "Welcome back" : "Create account"}
            </h2>
            <p className="login-card-sub">
              {formState === 0
                ? "Sign in to access your meetings"
                : "Get started with NexusMeet for free"}
            </p>

            {/* Google OAuth Button Container */}
            <div
              id="google-button-div"
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            />

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or with username</span>
              <div className="login-divider-line" />
            </div>

            {/* Form Fields */}
            <form className="login-fields" onSubmit={handleAuth}>
              {formState === 1 && (
                <input
                  className="login-input"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}

              <input
                className="login-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <div className="login-input-wrap">
                <input
                  className="login-input login-input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {error && <p className="login-error-text">{error}</p>}

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : formState === 0
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <p className="login-signup-text">
              {formState === 0
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                className="login-signup-link"
                onClick={() => {
                  setFormState(formState === 0 ? 1 : 0);
                  setError("");
                  setSuccessMessage("");
                }}
              >
                {formState === 0 ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
