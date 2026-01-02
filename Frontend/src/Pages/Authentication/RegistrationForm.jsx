import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import apiClient from "../../Axios";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import "./RegistrationForm.css";

function RegistrationForm() {
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isEmployeeDataFetched, setIsEmployeeDataFetched] = useState(false);

  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [termsAgreedInPopup, setTermsAgreedInPopup] = useState(false);
  const [termsDialogWasOpened, setTermsDialogWasOpened] = useState(false);
  const [showTermsReminderDialog, setShowTermsReminderDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const navigate = useNavigate();

  const designationOptions = [
    "Project Engineer",
    "Project Associate",
    "Scientist G",
    "Scientist E",
    "Scientist F",
  ];

  const fetchEmployeeData = async (employeeId) => {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get(`/employee-details/`, {
        params: { employee_id: employeeId },
      });

      const data = response.data;

      if (data) {
        setFullName(data.name);
        setOrganization(data.group);
        setEmail(data.email);
        setIsEmployeeDataFetched(true);
      } else {
        throw new Error("Employee not found");
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      setError("Employee not found or invalid ID.");
      setIsEmployeeDataFetched(false);
      setFullName("");
      setOrganization("");
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeIdChange = (e) => {
    const employeeId = e.target.value;
    setEmployeeId(employeeId);

    const employeeIdPattern = /^[0-9]{6}$/;
    if (employeeIdPattern.test(employeeId)) {
      fetchEmployeeData(employeeId);
    } else {
      setIsEmployeeDataFetched(false);
      if (employeeId.length > 0) {
        setError("Employee ID must be exactly 6 digits.");
      } else {
        setError("");
      }
      setFullName("");
      setOrganization("");
      setEmail("");
    }
  };

  const validateForm = () => {
    setError("");
    let valid = true;

    if (
      !fullName ||
      !organization ||
      !designation ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword ||
      !employeeId
    ) {
      setError("All fields are required.");
      valid = false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      valid = false;
    }

    return valid;
  };

  const validateEmail = () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required." }));
    } else if (!emailPattern.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Invalid email address." }));
    } else {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  const validatePhone = () => {
    const phonePattern = /^[6-9][0-9]{9}$/;
    if (!phone.trim()) {
      setErrors((prev) => ({ ...prev, phone: "Phone number is required." }));
    } else if (!phonePattern.test(phone)) {
      setErrors((prev) => ({ ...prev, phone: "Invalid Indian phone number." }));
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const validatePassword = () => {
    const passwordPattern =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{9,}$/;
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Password is required." }));
    } else if (!passwordPattern.test(password)) {
      setErrors((prev) => ({
        ...prev,
        password: "Must be 9+ chars, include uppercase, number & special char.",
      }));
    } else {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  const validateConfirmPassword = () => {
    if (confirmPassword !== password) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match.",
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    if (!termsDialogWasOpened) {
      setShowTermsReminderDialog(true);
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.post(
        `/employee/register/${employeeId}/`,
        {
          phone_number: phone,
          designation: designation, 
          password: password,
          confirm_password: confirmPassword,
        }
      );

      if (response.status === 200 || response.status === 201) {
        setShowSuccessDialog(true);
        setError("");
      }
    } catch (error) {
      console.error("Error during registration:", error);

      const backendError =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Registration failed. Please try again.";

      setError(backendError);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTermsDialog = () => {
    setTermsDialogWasOpened(true);
    setTermsDialogOpen(true);
  };

  const handleCloseTermsDialog = () => {
    setTermsDialogOpen(false);
  };

  const handleTermsAgreedChange = (event) => {
    setTermsAgreedInPopup(event.target.checked);
  };

  return (
    <div className="registration-page">
      <div className="registration-container">
        <div className="text-side">
          <h1>
            Register for
            <br />
            <span style={{ color: "hsl(218, 81%, 75%)" }}>
              {" "}
              Meghdoot Cloud{" "}
            </span>
          </h1>
          <p>Please fill in the following details to create your account.</p>
        </div>
        <div className="form-side">
          <div id="radius-shape-1"></div>
          <div id="radius-shape-2"></div>
          <div className="form-card bg-glass">
            {error && <p className="error-text">{error}</p>}
            <form onSubmit={handleRegistration}>
              {/* EMPLOYEE ID */}
              <div className="form-row">
                <TextField
                  type="text"
                  label="Employee ID"
                  value={employeeId}
                  onChange={handleEmployeeIdChange}
                  variant="outlined"
                  fullWidth
                />
              </div>

              {/* ORG + DESIGNATION */}
              <div className="form-row">
                <TextField
                  type="text"
                  label="Organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  variant="outlined"
                  disabled={isEmployeeDataFetched}
                  fullWidth
                />
                <FormControl variant="outlined" fullWidth>
                  <InputLabel id="designation-label">Designation</InputLabel>
                  <Select
                    labelId="designation-label"
                    id="designation-select"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    label="Designation"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {designationOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              {/* PHONE */}
              <div className="form-row">
                <TextField
                  type="tel"
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={validatePhone}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone}
                  fullWidth
                />
              </div>

              {/* FULL NAME + EMAIL */}
              <div className="form-row">
                <TextField
                  type="text"
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  fullWidth
                />
                <TextField
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={validateEmail}
                  error={Boolean(errors.email)}
                  helperText={errors.email}
                  fullWidth
                />
              </div>

              {/* PASSWORD + CONFIRM */}
              <div className="form-row">
                <TextField
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={validatePassword}
                  error={Boolean(errors.password)}
                  helperText={errors.password}
                  fullWidth
                />
                <TextField
                  type="password"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={validateConfirmPassword}
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword}
                  fullWidth
                />
              </div>

              {/* TERMS SECTION */}
              <div className="terms-and-conditions">
                <Button onClick={handleOpenTermsDialog} size="small">
                  View Terms and Conditions
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAgreedInPopup}
                      onChange={handleTermsAgreedChange}
                    />
                  }
                  label="I agree to the Terms and Conditions"
                />
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                className="registration-button"
                disabled={loading}
              >
                {loading ? "Loading..." : "Register"}
              </button>

              {/* LOGIN LINK */}
              <div className="signup-link">
                Already have an account? <Link to="/">Login</Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Dialog */}
      <Dialog open={termsDialogOpen} onClose={handleCloseTermsDialog}>
        <DialogTitle>Terms and Conditions</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            These terms and conditions ("Terms") govern your use of Meghdoot
            Cloud.
          </Typography>
          <Typography paragraph>
            1. **Account:** You are responsible for maintaining the security of
            your account credentials.
          </Typography>
          <Typography paragraph>
            2. **Use:** You agree to use our services for lawful purposes only
            and not to engage in any prohibited activities.
          </Typography>
          <Typography paragraph>
            3. **Data:** You retain ownership of your data. By using our
            services, you grant us a limited license to process your data solely
            for the purpose of providing the service.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTermsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog
        open={showTermsReminderDialog}
        onClose={() => setShowTermsReminderDialog(false)}
      >
        <DialogTitle>Action Required</DialogTitle>
        <DialogContent>
          <Typography>
            Please click "View Terms and Conditions" and agree before
            registering.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTermsReminderDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigate("/");
        }}
      >
        <DialogTitle>Registration Successful</DialogTitle>
        <DialogContent>
          <Typography>
            Your account has been registered successfully. You can now log in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowSuccessDialog(false);
              navigate("/");
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default RegistrationForm;
