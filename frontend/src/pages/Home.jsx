import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import Logo1 from "../../public/favicon.svg";
import { Button, IconButton, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import logo3 from "../assets/logo3.png";
import "./Home.css";
import AuthContext from "../contexts/AuthContext";
import axios from "axios";
import server from "../environment";

function Home() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  const createNewMeeting = async() => {
    try {
     const response = await axios.post(
       `${server}/api/meeting/create`,
     );
      const meetingCode = response.data.meetingCode;

      navigate(`/meeting/${meetingCode}`);
    }catch(e) {
      console.log(e);
    }
  }

  let handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  }

  const {addToUserHistory} = useContext(AuthContext);
  let handleJoinVideoCall = async () => {
    await addToUserHistory(meetingCode);
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
            <IconButton
              onClick={() => {
                navigate("/history");
              }}
            >
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
            <h2 className="subTitle">
              Providing Quality Video Call Just Like Quality Education
            </h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <TextField
                onChange={(e) => setMeetingCode(e.target.value)}
                id="outlined-basic"
                label="Meeting Code"
                variant="outlined"
              />
              <Button onClick={handleJoinVideoCall} variant="contained">
                Join Meeting
              </Button>

              <Button variant="contained" onClick={createNewMeeting}>
                New Meeting
              </Button>
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
