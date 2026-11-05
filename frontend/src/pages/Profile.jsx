import HomeIcon from "@mui/icons-material/Home";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import RestoreIcon from "@mui/icons-material/Restore";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo1 from "../../public/favicon.svg";
import AuthContext from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import "./Home.css";

// eslint-disable-next-line react-refresh/only-export-components
function Profile() {
  const {
    userData,
    setUserData,
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
    getHistoryOfUser,
  } = useContext(AuthContext);

  // Profile Details State
  const [name, setName] = useState(
    userData?.name || localStorage.getItem("userName") || "",
  );
  const [username, setUsername] = useState(userData?.username || "");
  const [totalMeetings, setTotalMeetings] = useState(0);
  const [lastMeetingCode, setLastMeetingCode] = useState("None");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const loadProfileAndStats = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setName(profile.name || "");
          setUsername(profile.username || "");
          setUserData(profile);
          if (profile.name) {
            localStorage.setItem("userName", profile.name);
          }
        }

        const history = await getHistoryOfUser();
        if (Array.isArray(history)) {
          setTotalMeetings(history.length);
          if (history.length > 0) {
            const latest = history[history.length - 1];
            setLastMeetingCode(latest.meetingCode || "None");
          }
        }
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    };

    loadProfileAndStats();
  }, []);

  const getUserInitials = (fullName) => {
    if (!fullName || !fullName.trim()) return "NM";
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.trim().substring(0, 2).toUpperCase();
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");

    if (!name.trim() || !username.trim()) {
      setProfileError("Name and username cannot be empty.");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await updateUserProfile({
        name: name.trim(),
        username: username.trim(),
      });

      const updatedUser = res.user || {
        name: name.trim(),
        username: username.trim(),
      };

      setUserData(updatedUser);
      localStorage.setItem("userName", updatedUser.name);
      setProfileMessage(res.message || "Profile updated successfully!");
    } catch (err) {
      setProfileError(
        err.response?.data?.message || "Failed to update profile.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdMessage("");

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPwdError("New password must be different from your current password.");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await changeUserPassword(currentPassword, newPassword);
      setPwdMessage(res.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setUserData(null);
    navigate("/auth");
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

      <main className="profile-stage">
        <div className="dashboard-card profile-card">
          {/* Header & Avatar */}
          <div className="profile-header">
            <div className="profile-avatar-large">{getUserInitials(name)}</div>
            <div className="profile-header-info">
              <div className="profile-title-row">
                <h1 className="profile-name-heading">
                  {name || "NexusMeet User"}
                </h1>
                <span className="profile-account-badge">Active Member</span>
              </div>
              <p className="profile-subtext">
                {username || "Manage your personal details and security"}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="profile-stat-value">{totalMeetings}</span>
              <span className="profile-stat-label">Meetings Joined</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-value code-val">
                {lastMeetingCode}
              </span>
              <span className="profile-stat-label">Last Active Room</span>
            </div>
          </div>

          {/* Edit Profile Details Form */}
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <h2 className="profile-section-title">Account Details</h2>

            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-name">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                className="profile-input"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-username">
                Username / Email
              </label>
              <input
                id="profile-username"
                type="text"
                className="profile-input"
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {profileError && (
              <p className="profile-feedback error">{profileError}</p>
            )}
            {profileMessage && (
              <p className="profile-feedback success">{profileMessage}</p>
            )}

            <button
              type="submit"
              className="profile-save-btn"
              disabled={profileLoading}
            >
              {profileLoading ? "Saving Changes..." : "Save Profile"}
            </button>
          </form>

          <div className="profile-section-divider" />

          {/* Change Password Form */}
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <LockOutlinedIcon
                  fontSize="small"
                  style={{ color: "#3ec6e0" }}
                />
                <h2 className="profile-section-title">Change Password</h2>
              </div>
              <button
                type="button"
                className="profile-toggle-pwd"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <>
                    <VisibilityOffOutlinedIcon fontSize="inherit" /> Hide
                  </>
                ) : (
                  <>
                    <VisibilityOutlinedIcon fontSize="inherit" /> Show
                  </>
                )}
              </button>
            </div>

            <div className="profile-field">
              <label className="profile-label" htmlFor="current-password">
                Current Password
              </label>
              <input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                className="profile-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="profile-pwd-grid">
              <div className="profile-field">
                <label className="profile-label" htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  className="profile-input"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="profile-field">
                <label className="profile-label" htmlFor="confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  className="profile-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {pwdError && <p className="profile-feedback error">{pwdError}</p>}
            {pwdMessage && (
              <p className="profile-feedback success">{pwdMessage}</p>
            )}

            <button
              type="submit"
              className="profile-secondary-btn"
              disabled={pwdLoading}
            >
              {pwdLoading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Profile);
