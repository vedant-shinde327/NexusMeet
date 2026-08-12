import { useNavigate } from "react-router-dom";
import { useState } from "react";
import withAuth from "../utils/withAuth";

function Home() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    let handleJoinVideoCall = async() => {
        navigate(`/${meetingCode}`);
    }
    return ( 
        <h1>home</h1>
     );
}

export default withAuth(Home);