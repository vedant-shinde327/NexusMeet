import Logo1 from "../../public/favicon.svg";
import heroImg from "../assets/mobile.png";
import { Link, useNavigate } from "react-router-dom"; 

export default function LandingPage() {

  const navigate = useNavigate();

  return (
    <div>
      <div className="landingPageContainer">  
        <nav>
          <div className="navHeader">
            <img src={Logo1} alt="NexusLogo" className="NexusLogo" />
            <h2 className="NexusHeading">NexusMeet</h2>
          </div>

          <div className="navList">
            <p onClick={() => {
              navigate("/dfasdv")
            }}>Join as Guest</p>

            <p onClick={() => {
              navigate("/auth")
            }}>Register</p>

            <div onClick={() => {
              navigate("/auth")
            }} className="loginBtn" role="button">
              Login
            </div>
          </div>
        </nav>

        <div className="landingMainContainer">
          <div>
            <h1>
              <span style={{ color: "#FF9839" }}>Connect</span> with your Loved
              ones
            </h1>
            <p>Meet Anyone. Anywhere. Instantly.</p>
            <div role="button">
              <Link to={"/auth"}>Get Started</Link>
            </div>
          </div>

          <div>
            <img src={heroImg} alt="heroImg" />
          </div>
        </div>
      </div>
    </div>
  );
}
