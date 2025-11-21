import React, { useState} from "react";
// import { useNavigate } from "react-router-dom";
import LoginIcon from "../../assets/login-icon.png"; 
import CDACLogo from "../../assets/logo.png";
import LoginPage from "./LoginForm";
import RegistrationForm from "./RegistrationForm";
import ForgotPassword from "./ForgotPassword";
import "./First.css"; 


const First = () => {
  // const navigate = useNavigate();  
 const [currentForm, setCurrentForm] = useState('login'); // 'login', 'register', 'forgotPassword'

  // Handle the login icon click to both scroll and navigate
  const handleLoginIconClick = () => {
    // Scroll to the login section
    const targetSection = document.getElementById("login-section");
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
    setCurrentForm("login");
  };

  const handleFormChange = (form) => {
    setCurrentForm(form);
  };

  return (
    <div>
      {/* Login Icon */}
      <div className="first" style={{ position: "absolute", top: "10px", right: "120px" }}>
        <button
          onClick={handleLoginIconClick}  // Update the onClick handler to both navigate and scroll
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <img
            src={LoginIcon}
            alt="Login Icon"
            style={{
              width: "70px",
              height: "70px",
              filter: "invert(100%)",
              cursor: "pointer",
            }}
          />
        </button>
      </div>

      <div style={{ position: "absolute", top: "-5px", right: "10px" }}>
        <img
          src={CDACLogo}
          alt="CDAC Logo"
          style={{
            position: "absolute",
            top: "10px", 
            right: "10px", 
            width: "100px", 
            height: "auto",
          }}
        />
      </div>

      {/* Parallax Section */}
      <div className="parallax">
        <div className="parallax-content">
          <h1>Meghdoot Managed Cloud Platform</h1>
          <p>A Secure, Scalable, and Indigenous Cloud Ecosystem</p>
        </div>
      </div>

      {/* About Section */}
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>About Our Cloud</h2>
        <p>
        Our Cloud is designed to provide businesses with scalable, reliable, and secure solutions, empowering them to innovate, grow, and succeed in the digital era.
        </p>
      </div>

      {/* Scrollable Section */}
      <div
        id="login-section"
        style={{
          height: "800px",
          backgroundColor: "#e8e8e8",
          position: "relative",
        }}
      >
        <div className="login-animate-container">
        <div className="login-section">
        {currentForm === 'login' && <LoginPage onFormChange={handleFormChange} />}
        {currentForm === 'register' && <RegistrationForm onFormChange={handleFormChange} />}
        {currentForm === 'forgotPassword' && <ForgotPassword onFormChange={handleFormChange} />}
      </div>
        </div>
      </div>
      
    </div>
    
  );
};

export default First;
