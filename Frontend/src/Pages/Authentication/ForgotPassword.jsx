import React from "react";
import "./ForgotPassword.css";
import forgetPasswordImage from "../../assets/forgetpassword.png"; // Replace this with the image path you want to use

function ForgotPassword() {
  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {/* Left Section with Image */}
        <div className="forgot-password-image-section">
          <img
            src={forgetPasswordImage}
            alt="Forgot Password Illustration"
            className="forgot-password-image"
          />
        </div>

        {/* Right Section with Form */}
        <div className="forgot-password-form-section">
          <h1>Forgot Your Password?</h1>
          <form className="forgot-password-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your Email Id"
                className="forgot-password-input"
              />
            </div>
            <button type="submit" className="forgot-password-btn">
              Reset Password
            </button>
            <p className="back-to-signin">
              <a href="/">Back to Sign In</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
