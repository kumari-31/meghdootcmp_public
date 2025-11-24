import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import { saveTokens, getAccessToken } from "./auth";
import { useAuth } from "./authContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import "./LoginForm.css";
import logo from "../../assets/cclogo.png";


const MeghdootLogin = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpUsername, setOtpUsername] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const navigate = useNavigate();
  const { user, login, setUser } = useAuth();

  

  // Check if user is already authenticated and redirect accordingly
useEffect(() => {
    if (!user) return;
    console.log("Redirecting based on user:", user);

    if (user.role === "ADMIN") navigate("/app/dashboard", { replace: true });
    else if (user.role === "EMPLOYEE")
      navigate("/app/kubernetes/deploypods", { replace: true });
    else if (user.role === "FLA")
      navigate("/app/openstack/fla/approvals", { replace: true });
    else navigate("/unauthorized", { replace: true });
  }, [user, navigate]);

const maskEmail = (email) => {
    const [user, domain] = email.split("@");
    if (!user || !domain) return email;
    const visible = user.length <= 2 ? 1 : 2;
    const maskedUser =
      user.slice(0, visible) + "*".repeat(user.length - visible);
    return `${maskedUser}@${domain}`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getUserFromCookie = () => {
    const match = document.cookie.match(/(^| )UD=([^;]+)/);
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[2]));
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

  
    try {
      const data = await login(formData.username, formData.password);

      if (data.require_otp) {
        setSuccess(data.message || "OTP sent successfully.");
        setOtpUsername(data.username || formData.username);
        setShowOtpModal(true);
      } else if (data.detail === "Login successful") {
        setSuccess("Login successful!");
        const parsedUser = getUserFromCookie();
        if (parsedUser) setUser(parsedUser);
      }
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  };
const handleOtpSubmit = async () => {
  setOtpError("");
  try {
    const response = await login(otpUsername, formData.password, otp);
    if (response.detail === "Login successful") {
      setShowOtpModal(false);
      setSuccess("OTP verified successfully!");

      // ⏳ Wait a bit for cookies to be stored before reading user_data
      setTimeout(() => {
        const parsedUser = getUserFromCookie();
        if (parsedUser) {
          setUser(parsedUser);
        } else {
          console.warn("No user_data cookie found after OTP login");
        }
      }, 500);
    } else {
      setOtpError("Invalid OTP. Please try again.");
    }
  } catch (err) {
    setOtpError(err.message || "OTP verification failed.");
  }
};


  const handleResendOtp = async () => {
    try {
      const response = await login(otpUsername, formData.password, null, true);
      setSuccess(response.message || "OTP resent successfully.");
      setOtpError("");
    } catch (err) {
      setOtpError("Failed to resend OTP. Please try again.");
    }
  };

  return (
   <div className="login-page">
      <div className="logo-container">
        <div className="login-header">
          <img src={logo} alt="CDAC Meghdoot Logo" className="logo-img" />
          <span className="logo-text">CLOUD MANAGEMENT PLATFORM</span>
        </div>

        <div className="login-form">
          <h2>Sign in to your Account</h2>
          <form onSubmit={handleSubmit}>
            <input 
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button type="submit">Login</button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
          <div className="signup-link">
            Don't have an account? <Link to="/registration">Sign Up</Link>
          </div>
          <div className="copyright">
            Copyright © 2024–25 C-DAC. All rights reserved
          </div>
        </div>
      </div>

      <Dialog open={showOtpModal} onClose={() => setShowOtpModal(false)}>
        <DialogTitle>Enter OTP</DialogTitle>
        <DialogContent>
          <Typography>
            Email sent to this email: <strong>{maskEmail(otpUsername)}</strong>
          </Typography>
          <TextField
            margin="dense"
            label="OTP"
            type="text"
            fullWidth
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ""))
            }
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Didn’t get the code?{" "}
            <span
              style={{
                color: "#1976d2",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={handleResendOtp}
            >
              Resend OTP
            </span>
          </Typography>
          {otpError && <Typography color="error">{otpError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOtpModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleOtpSubmit}>
            Verify OTP
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MeghdootLogin;

// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// // import { login } from "./api";
// // import { saveTokens, getAccessToken } from "./auth";
// import { useAuth } from "./authContext";
// import {
//   saveDecodedDataToIndexedDB,
//   getUserRoleFromIndexedDB,
// } from "../../tokenstorage";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   TextField,
//   Typography,
// } from "@mui/material";
// import { Link } from "react-router-dom";
// import "./LoginForm.css";

// const MeghdootLogin = () => {
//   const [formData, setFormData] = useState({ username: "", password: "" });
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [otp, setOtp] = useState("");
//   const [otpError, setOtpError] = useState("");
//   const [otpUsername, setOtpUsername] = useState("");
//   const [showOtpModal, setShowOtpModal] = useState(false);
//   const navigate = useNavigate();
//   const { accessToken, setAccessToken } = useAuth();

//   const maskEmail = (email) => {
//     const [user, domain] = email.split("@");
//     if (!user || !domain) return email;
//     const visible = user.length <= 2 ? 1 : 2;
//     const maskedUser = user.slice(0, visible) + "*".repeat(user.length - visible);
//     return `${maskedUser}@${domain}`;
//   };

//   // Check if user is already authenticated and redirect accordingly
//   useEffect(() => {
//     const checkUserAuthentication = async () => {
//       const token = getAccessToken();
//       if (token) {
//         const userRole = await getUserRoleFromIndexedDB();
//         if (userRole === "ADMIN") {
//           navigate("/app/dashboard", { replace: true });
//         } else if (userRole === "FLA") {
//           navigate("/app/openstack/fla/approvals", { replace: true });
//         } else if (userRole === "EMPLOYEE") {
//           navigate("/app/kubernetes/deploypods", { replace: true });
//         }
//       }
//     };
//     checkUserAuthentication();
//   }, [navigate]);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setSuccess("");

//     try {
//       const data = await login(formData.username, formData.password);

//       if (data.require_otp) {
//         setSuccess(data.message || "OTP generated successfully.");
//         setOtpUsername(data.username || formData.username);
//         setShowOtpModal(true);
//         console.log("OTP:", data.test_otp);
//       } else if (data.access && data.refresh) {
//         saveTokens(data.access, data.refresh);
//         await saveDecodedDataToIndexedDB(data.access);
//         const userRole = await getUserRoleFromIndexedDB();
//         if (userRole === "ADMIN") navigate("/app/dashboard");
//         else if (userRole === "EMPLOYEE") navigate("/app/kubernetes/deploypods");
//         else if (userRole === "FLA")
//           navigate("/app/openstack/fla/approvals", { replace: true });
//         else navigate("/unauthorized");
//       } else {
//         setError("Login failed. Please try again.");
//       }
//     } catch (err) {
//       setError(err.message || "Login failed.");
//     }
//   };

//   const handleOtpSubmit = async () => {
//     try {
//       const response = await login(otpUsername, formData.password, otp);
//       if (response.access && response.refresh) {
//         saveTokens(response.access, response.refresh);
//         await saveDecodedDataToIndexedDB(response.access);
//         const userRole = await getUserRoleFromIndexedDB();

//         setShowOtpModal(false);
//         setSuccess("OTP verified successfully!");

//         if (userRole === "ADMIN") navigate("/app/dashboard");
//         else if (userRole === "EMPLOYEE") navigate("/app/kubernetes/deploypods");
//         else if (userRole === "FLA")
//           navigate("/app/openstack/fla/approvals", { replace: true });
//         else navigate("/unauthorized");
//       } else {
//         setOtpError("Invalid OTP. Please try again.");
//       }
//     } catch (err) {
//       setOtpError(err.message || "OTP verification failed.");
//     }
//   };

//   const handleResendOtp = async () => {
//     try {
//       const response = await login(otpUsername, formData.password, null, true);
//       if (response.message) {
//         setSuccess(response.message); // Optional: show in UI
//         console.log("Resent OTP:", response.test_otp);
//       } else {
//         setSuccess("OTP resent successfully.");

//       }
//       setOtpError(""); // Clear previous OTP errors
//     } catch (err) {
//       setOtpError("Failed to resend OTP. Please try again.");
//     }
//   };

//   return (
//     <div className="login-page">
//       <div className="logo-container">
//         <div className="login-header">
//           <img src="cclogo.png" alt="CDAC Meghdoot Logo" className="logo-img" />
//           <span className="logo-text">CLOUD MANAGEMENT PLATFORM</span>
//         </div>

//         <div className="login-form">
//           <h2>Sign in to your Account</h2>
//           <form onSubmit={handleSubmit}>
//             <input
//               type="text"
//               name="username"
//               placeholder="Username"
//               value={formData.username}
//               onChange={handleChange}
//             />
//             <input
//               type="password"
//               name="password"
//               placeholder="Password"
//               value={formData.password}
//               onChange={handleChange}
//             />
//             <button type="submit">Login</button>
//             {error && <p className="error">{error}</p>}
//             {success && <p className="success">{success}</p>}
//           </form>
//           <div className="signup-link">
//             Don't have an account? <Link to="/registration">Sign Up</Link>
//           </div>
//           <div className="copyright">
//             Copyright © 2024–25 C-DAC. All rights reserved
//           </div>
//         </div>
//       </div>
//       <Dialog open={showOtpModal} onClose={() => setShowOtpModal(false)}>
//         <DialogTitle>Enter OTP</DialogTitle>
//         <DialogContent>
//           <Typography>
//           Email sent to this email: <strong>{maskEmail(otpUsername)}</strong>
//           </Typography>
//           <TextField
//             margin="dense"
//             label="OTP"
//             type="text" // ✅ keep it text to avoid spinner arrows
//             fullWidth
//             value={otp}
//             onChange={(e) => {
//                 // Allow only digits
//                 const val = e.target.value.replace(/\D/g, "");
//                 setOtp(val);
//             }}
//             inputProps={{
//                 inputMode: "numeric", // ✅ triggers mobile numeric keypad
//                 pattern: "[0-9]*",    // ✅ helps browsers know it's numeric
//             }}
//             />

//           <Typography variant="body2" sx={{ mt: 1 }}>
//             Didn't get the code?{" "}
//             <span
//               style={{
//                 color: "#1976d2",
//                 cursor: "pointer",
//                 textDecoration: "underline",
//               }}
//               onClick={handleResendOtp}
//             >
//               Resend OTP
//             </span>
//           </Typography>
//            {otpError && <Typography color="error">{otpError}</Typography>}
//           {/* {success && <Typography color="green">{success}</Typography>}  */}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setShowOtpModal(false)}>Cancel</Button>
//           <Button variant="contained" onClick={handleOtpSubmit}>
//             Verify OTP
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </div>
//   );
// };

// export default MeghdootLogin;
