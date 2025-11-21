import React,{useState,useEffect } from "react";
import {useNavigate} from "react-router-dom";
import { login } from "./api";
import { saveTokens, getAccessToken } from "./auth";
import { Link } from 'react-router-dom';
import { saveDecodedDataToIndexedDB, getUserRoleFromIndexedDB } from '../../tokenstorage';
import "./LoginForm.css"; // Ensure your CSS file is correctly linked
import TextField from '@mui/material/TextField';

function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserAuthentication = async () => {
            const token = getAccessToken();
            if (token) {
                const userRole = await getUserRoleFromIndexedDB();
                if (userRole === "ADMIN") {
                    navigate("/app/dashboard", { replace: true });
                } else if (userRole === "FLA") {
                    navigate("/app/openstack", { replace: true });
                } else if (userRole === "EMPLOYEE") {
                    navigate("/app/openstack", { replace: true });
                }
            }
        };
        checkUserAuthentication();
    }, [navigate]);

    useEffect(() => {
        const checkAuth = async () => {
            const token = getAccessToken();
            if (!token) {
                navigate("/", { replace: true });
            }
        };
        checkAuth();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const data = await login(username, password);
            if (data.access && data.refresh) {
                saveTokens(data.access, data.refresh);
                await saveDecodedDataToIndexedDB(data.access);
                const userRole = await getUserRoleFromIndexedDB();

                if (userRole === "ADMIN") {
                    navigate("/app/dashboard");
                } else if (userRole === "EMPLOYEE") {
                    navigate("/app/openstack/vmrequest");
                } else if (userRole === "FLA") {
                    navigate("/app/openstack/fla/approvals", { replace: true });
                } else {
                    navigate("/unauthorized");
                }
            } else {
                setError("Login failed. Please try again.");
            }
        } catch (error) {
            setError(error.message || "Login failed. Please try again.");
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="text-side">
                    <h1>
                        Meghdoot Managed<br />
                        <span style={{ color: 'hsl(218, 81%, 75%)' }}>Cloud Platform</span>
                    </h1>
                    <p>
                        Meghdoot is a managed cloud platform offering essential services like virtual machines, storage, and networking. We simplify cloud infrastructure, empowering businesses to focus on growth with our reliable and efficient solutions.
                    </p>
                </div>
                <div className="form-side">
                    <div className="form-card">
                        {error && <p className="error-text">{error}</p>}
                        <form onSubmit={handleLogin}>
                            <div className="form-row">
                                <TextField
                                    type="text"
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline legend span': {
                                            fontWeight: 'bold',
                                            color: 'black'
                                        },
                                        width: '100%',
                                        maxWidth: '400px'
                                    }}
                                />
                                <TextField
                                    type="password"
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline legend span': {
                                            fontWeight: 'bold',
                                        },
                                        width: '100%',
                                        maxWidth: '400px'
                                    }}
                                />
                            </div>
                            <button type="submit" className="login-button">
                                Login
                            </button>
                            <div className="forgot-password">
                                <Link to="/forgot-password">Forgot Password?</Link>
                            </div>
                            <div className="signup-link">
                               i don't  hv account ? <Link to="/registration">Sign Up</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;
