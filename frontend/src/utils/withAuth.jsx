import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";

// 3 Days in milliseconds (72 hours)
export const SESSION_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export const setAuthSession = (token, userName) => {
  if (!token) return;
  const expiryTime = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem("token", token);
  localStorage.setItem("tokenExpiry", String(expiryTime));
  if (userName) {
    localStorage.setItem("userName", userName);
  }
};

export const clearAuthSession = () => {
  const token = localStorage.getItem("token");
  if (token) {
    localStorage.removeItem(`nexus_scheduled_${token}`);
  }
  localStorage.removeItem("nexus_scheduled_meetings");
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiry");
  localStorage.removeItem("userName");
};

export const isSessionValid = () => {
  const token = localStorage.getItem("token");
  if (!token || !token.trim()) {
    localStorage.removeItem("tokenExpiry");
    return false;
  }

  const rawExpiry = localStorage.getItem("tokenExpiry");

  // If the user is already logged in from before this update, start a 3-day window now
  if (!rawExpiry) {
    localStorage.setItem(
      "tokenExpiry",
      String(Date.now() + SESSION_DURATION_MS),
    );
    return true;
  }

  const expiryMs = Number(rawExpiry);
  if (Number.isNaN(expiryMs) || Date.now() > expiryMs) {
    clearAuthSession();
    return false;
  }

  return true;
};

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const valid = isSessionValid();

    useEffect(() => {
      if (!isSessionValid()) {
        navigate("/auth", { replace: true });
      }
    }, [navigate]);

    if (!valid) {
      return <Navigate to="/auth" replace />;
    }

    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
};

export default withAuth;
