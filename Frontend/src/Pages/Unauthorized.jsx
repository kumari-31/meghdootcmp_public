import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    // Clear any stale session data if necessary
    localStorage.clear();
    window.location.href = "/"; 
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e53e3e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        
        <h1 style={styles.heading}>Access Denied</h1>
        <p style={styles.message}>
          Oops! It looks like you don't have the necessary permissions to view this page. 
          This could be because your session expired or your account role is restricted.
        </p>

        <div style={styles.buttonGroup}>
          <button 
            onClick={() => navigate(-1)} 
            style={styles.secondaryButton}
          >
            Go Back
          </button>
          <button 
            onClick={handleLoginRedirect} 
            style={styles.primaryButton}
          >
            Return to Login
          </button>
        </div>
        
        <p style={styles.footer}>
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7fafc",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "20px",
  },
  card: {
    maxWidth: "500px",
    width: "100%",
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
    textAlign: "center",
  },
  iconContainer: {
    marginBottom: "20px",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#2d3748",
    marginBottom: "16px",
  },
  message: {
    fontSize: "16px",
    color: "#718096",
    lineHeight: "1.6",
    marginBottom: "30px",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginBottom: "20px",
  },
  primaryButton: {
    padding: "12px 24px",
    backgroundColor: "#3182ce",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  secondaryButton: {
    padding: "12px 24px",
    backgroundColor: "#edf2f7",
    color: "#4a5568",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  footer: {
    fontSize: "13px",
    color: "#a0aec0",
    marginTop: "20px",
    borderTop: "1px solid #edf2f7",
    paddingTop: "20px",
  }
};

export default Unauthorized;