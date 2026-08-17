import { useContext, useState } from "react";
import AuthContext from "../contexts/AuthContext.jsx";
import "./Login.css";
import NexusLogo from "../../public/favicon.svg";

export default function Authentication() {
  const [show, setShow] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState();
  const [error, setError] = useState();
  const [messages, setMessages] = useState();

  const [formState, setFormState] = useState(0);
  const [open, setOpen] = useState();

  const { handleRegister, handleLogin } = useContext(AuthContext);

  let handleAuth = async () => {
    try {
      setError("");
      setMessages("");  

      if (formState === 0) {
        let result = await handleLogin(username, password);

        console.log(result);

        setMessages("signed in succefully!");
        setOpen(true);

        setTimeout(() => {
          setOpen(false);
        }, 2500);
        
      }   

      if (formState === 1) {
        let result = await handleRegister(name, username, password);

        console.log(result);

        setUsername("");
        setMessages(result);
        setOpen(true);
        setError("");
        setFormState(0);
        setPassword("");
        setName("");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Something went wrong";

      setError(message);
      setOpen(false);
    }
  };

  return (
    <>
      {open && (
        <div className="success-popup">
          <span>✓</span>
          Signed in successfully!
        </div>
      )}

      <div className="login-page">
        {/* ── Left ── */}
        <div className="login-left">
          <div className="login-logo">
            <div className="login-logo-icon">
              <img
                src={NexusLogo}
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="white"
              />
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
              place.
            </p>
          </div>

          <div className="login-badge">
            <span className="login-badge-dot" />
            <span className="login-badge-text">
              2,481 meetings happening right now
            </span>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="login-right">
          <div className="login-card">
            <h2 className="login-card-title">Welcome back</h2>
            <p className="login-card-sub">Sign in to your account</p>

            {/* Google */}
            <button className="login-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or</span>
              <div className="login-divider-line" />
            </div>

            {/* Fields */}
            <div className="login-fields">
              {formState === 1 ? (
                <input
                  className="login-input"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              ) : (
                <></>
              )}

              <input
                className="login-input"
                type="username"
                placeholder="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <div className="login-input-wrap">
                <input
                  className="login-input login-input-password"
                  type={show ? "text" : "password"}
                  placeholder="Password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  className="login-eye-btn"
                  onClick={() => setShow(!show)}
                >
                  {show ? (
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
            </div>

            {/* ERROR */}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {/* SUCCESS */}
            {messages && <p style={{ color: "green" }}>{messages}</p>}

            <button
              type="button"
              className="login-submit-btn "
              onClick={handleAuth}
            >
              {formState === 0 ? "Sign in" : "Create account"}
            </button>

            <p className="login-signup-text">
              {formState === 0 ? "No account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="login-signup-link"
                onClick={() => {
                  setFormState(formState === 0 ? 1 : 0);
                  setError("");
                  setMessages("");
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
