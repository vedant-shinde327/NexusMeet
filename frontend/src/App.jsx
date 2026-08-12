import { Routes, Route } from "react-router-dom";
import './App.css';
import LandingPage from "./pages/LandingPage";
import Authentication from "./pages/Authentication";
import { AuthProvider } from "./contexts/AuthContext";
import VidewoMeet from "./pages/VideoMeet";
import Home from "./pages/Home.jsx";

function App() {
  return (
    <>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Authentication />} />
          <Route path="/home" element={<Home />} />
          <Route path=":url" element={<VidewoMeet  />} />
        </Routes>
      </AuthProvider>
    </>
  );
}

export default App;