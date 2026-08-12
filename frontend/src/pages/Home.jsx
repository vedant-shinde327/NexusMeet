import { useNavigate } from "react-router-dom";
import { useState } from "react";
import withAuth from "../utils/withAuth";
import Logo1 from "../../public/favicon.svg";
import { Button, IconButton, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import logo3 from "../assets/logo3.png";
import "./Home.css";

function Home() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  let handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  }

  let handleJoinVideoCall = async () => {
    navigate(`/${meetingCode}`);
  };
  return (
    <>
      <div className="navBar">
        <nav>
          <div className="navHeader">
            <img src={Logo1} alt="NexusLogo" className="NexusLogo" />
            <h2 className="NexusHeading">NexusMeet</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <IconButton>
              <RestoreIcon />
            </IconButton>
            <p>History</p>

            <Button onClick={handleLogout}>Logout</Button>
          </div>
        </nav>
      </div>

      <div className="meetContainer">
        <div className="leftPanel">
            <div>
                <h2 className="subTitle">Providing Quality Video Call Just Like Quality Education</h2>
                <div style={{display: 'flex', gap:'10px'}}>
                    <TextField onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" label="Meeting Code" variant="outlined" />
                    <Button onClick={handleJoinVideoCall} variant="contained">Join Meeting</Button>
                </div>
            </div>
        </div>
        <div className="rightPanel">
            <img src={logo3} />
        </div>
      </div>
    </>
  );
}

export default withAuth(Home);
