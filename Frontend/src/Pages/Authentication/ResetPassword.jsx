import React, { useState } from "react";
import { TextField, Button, Typography, Paper } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../../Axios";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [message, setMessage] = useState("");

  if (!email) return <Typography>No Email Provided!</Typography>;

const handleReset = async () => {
  setMessage("");
  try {
    const payload = {
      email,
      otp,
      new_password: newPwd,
      confirm_password: confirmPwd,
    };

    const res = await apiClient.post("/reset-password/", payload);

    if (res.status === 200) {
      setMessage("Password reset successful!");
      setTimeout(() => navigate("/"), 1500);
    } else {
      setMessage(res.data.error || "Failed to reset password");
    }
  } catch (error) {
    setMessage(
      error.response?.data?.error || "Failed to reset password. Try again."
    );
  }
};


  return (
    <Paper sx={{ p: 3, maxWidth: 400, mx: "auto", mt: 10 }}>
      <Typography variant="h5" mb={2}>
        Reset Password
      </Typography>

      <Typography variant="body2" mb={1}>
        OTP sent to: <strong>{email}</strong>
      </Typography>

      <TextField
        label="Enter OTP"
        fullWidth
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="New Password"
        type="password"
        fullWidth
        value={newPwd}
        onChange={(e) => setNewPwd(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Confirm Password"
        type="password"
        fullWidth
        value={confirmPwd}
        onChange={(e) => setConfirmPwd(e.target.value)}
      />

      {message && (
        <Typography color="error" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={otp.length < 6 || !newPwd || !confirmPwd}
        onClick={handleReset}
      >
        Reset Password
      </Button>
    </Paper>
  );
};

export default ResetPassword;
