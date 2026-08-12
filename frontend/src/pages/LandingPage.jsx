import Logo1 from "../../public/favicon.svg";
import heroImg from "../assets/mobile.png";
import { Link } from "react-router-dom"; 

export default function LandingPage() {
  return (
    <div>
      <div className="landingPageContainer">  
        <nav>
          <div className="navHeader">
            <img src={Logo1} alt="NexusLogo" className="NexusLogo" />
            <h2 className="NexusHeading">NexusMeet</h2>
          </div>

          <div className="navList">
            <p>Join as Guest</p>
            <p>Register</p>
            <div className="loginBtn" role="button">
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
