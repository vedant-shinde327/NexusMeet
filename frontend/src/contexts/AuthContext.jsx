import axios, { HttpStatusCode } from "axios";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment.js";

const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/auth`,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // 1. Define getUserProfile FIRST so other functions can call it safely
  const getUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const response = await client.get("/get_user_profile", {
        params: { token },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  };

  const updateUserProfile = async (updatedData) => {
    const token = localStorage.getItem("token");
    const response = await client.put("/update_user_profile", {
      token,
      ...updatedData,
    });
    return response.data;
  };

  const handleRegister = async (name, username, password) => {
    const request = await client.post("/register", {
      name,
      username,
      password,
    });

    if (request.status === HttpStatusCode.Created || request.status === 200) {
      return request.data.message;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const request = await client.post("/login", {
        username,
        password,
      });

      if (request.status === HttpStatusCode.Ok) {
        localStorage.setItem("token", request.data.token);
        // Save name if returned by backend, or fetch profile
        if (request.data.name) {
          localStorage.setItem("userName", request.data.name);
          setUserData({
            name: request.data.name,
            username: request.data.username,
          });
        } else {
          const profile = await getUserProfile();
          if (profile) {
            localStorage.setItem("userName", profile.name);
            setUserData(profile);
          }
        }
        navigate("/home");
      }
      return request.data;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const handleGoogleLogin = async (credential) => {
    try {
      const request = await client.post("/google-login", {
        token: credential,
      });

      if (request.status === HttpStatusCode.Ok && request.data.token) {
        localStorage.setItem("token", request.data.token);
        if (request.data.name) {
          localStorage.setItem("userName", request.data.name);
          setUserData({
            name: request.data.name,
            username: request.data.username,
          });
        } else {
          const profile = await getUserProfile();
          if (profile) {
            localStorage.setItem("userName", profile.name);
            setUserData(profile);
          }
        }
        navigate("/home");
      }
      return request.data;
    } catch (error) {
      console.error("Google login backend error:", error);
      throw error;
    }
  };

  const getHistoryOfUser = async () => {
    let request = await client.get("/get_all_activity", {
      params: {
        token: localStorage.getItem("token"),
      },
    });
    return request.data;
  };

  const addToUserHistory = async (meetingCode) => {
    const request = await client.post("/add_to_activity", {
      token: localStorage.getItem("token"),
      meeting_code: meetingCode,
    });
    return request.data;
  };

  const data = {
    userData,
    setUserData,
    getHistoryOfUser,
    addToUserHistory,
    handleRegister,
    handleLogin,
    handleGoogleLogin,
    getUserProfile,
    updateUserProfile,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};

export default AuthContext;
