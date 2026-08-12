import axios, { HttpStatusCode } from "axios";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserHistory } from "../../../backend/src/controllers/user.controller";

const AuthContext = createContext({});

const client = axios.create({
  baseURL: "http://localhost:8000/api/auth",
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);

  const navigate = useNavigate();

  const handleRegister = async (name, username, password) => {
    const request = await client.post("/register", {
      name,
      username,
      password,
    });

    if (request.status === HttpStatusCode.Created) {
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
        navigate("/home");
      }
      return request.data;
    } catch (error) {
      console.log(error);
    }
  };

 const getHi

  const data = {
    userData,
    setUserData,
    handleRegister,
    handleLogin,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};

export default AuthContext;
