import React, { useState } from "react";
import { TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import apiClient from "../../Axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) return setMessage("Please enter your email");

    setLoading(true);
    setMessage("");

    try {
      const response = await apiClient.post("/forgot-password/", {
        email,
      }); 

      setMessage(response.data.message || "OTP sent successfully!");

      // Redirect user to OTP screen after 1s
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 1000);
    } catch (err) {
      setMessage(
        err.response?.data?.error || "Failed to send OTP. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 400, mx: "auto", mt: 10 }}>
      <Typography variant="h5" mb={2}>
        Forgot Password
      </Typography>

      <TextField
        label="Enter registered email"
        type="email"
        fullWidth
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        fullWidth
        disabled={loading}
        onClick={handleForgotPassword}
      >
        {loading ? "Sending OTP..." : "Send OTP"}
      </Button>

      {message && (
        <Typography sx={{ mt: 2 }} color="primary">
          {message}
        </Typography>
      )}
    </Paper>
  );
};

export default ForgotPassword;
