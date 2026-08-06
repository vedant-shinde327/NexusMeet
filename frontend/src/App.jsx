import { Routes, Route } from "react-router-dom";
import './App.css';
import LandingPage from "./pages/LandingPage";
import Authentication from "./pages/Authentication";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Authentication />} />
      </Routes>
    </>
  );
}

export default App;
