// src/Pages/Authentication/authContext.jsx
import { createContext, useState, useEffect, useRef } from "react";
import apiClient from "../../Axios";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutes

  // --- Helper: read user_data cookie ---
  const getUserFromCookie = () => {
    const match = document.cookie.match(/(^| )UD=([^;]+)/);
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[2]));
    } catch {
      return null;
    }
  };

  // --- On first load ---
  useEffect(() => {
    const userInfo = getUserFromCookie();
    if (userInfo) setUser(userInfo);
    setLoading(false);
  }, []);

  const clearInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
  };

  // --- Logout ---
  const logout = async () => {
    try {
      await apiClient.post("/logout/", {}, { withCredentials: true });
    } catch (err) {
    console.error("Logout request failed", err);
  }

  // 2. Clear Storage
    localStorage.clear();
    sessionStorage.clear();

    // 3. Clear memory state
    clearInactivityTimer();
    setUser(null);

   // 4. Force a hard reload to the login page to wipe any remaining JS state
  window.location.replace("/");
  };

  // --- Auto logout after inactivity ---
  const resetInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    if (!user) return;

    const events = ["mousemove", "keydown", "click", "scroll"];
    const reset = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, reset));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearInactivityTimer();
    };
  }, [user]);

  // --- Auto logout if cookie disappears ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!getUserFromCookie() && user) logout();
    }, 30_000);

    return () => clearInterval(interval);
  }, [user]);

  // --- Login ---
  const login = async (username, password, otp = null, resend_otp = false) => {
    const encode = (s) =>
      typeof s === "string" ? btoa(unescape(encodeURIComponent(s))) : s;

    const payload = {
      username: encode(username),
      password: encode(password),
      ...(otp && { otp }),
      ...(resend_otp && { resend_otp: true }),
    };

    const response = await apiClient.post("/v2/login/", payload, {
      withCredentials: true,
    });

    await new Promise((r) => setTimeout(r, 500));
    const userInfo = getUserFromCookie();
    if (userInfo) setUser(userInfo);

    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};







// // src/Pages/Authentication/authContext.js
// import { createContext, useContext, useState, useEffect, useRef } from "react";
// import apiClient from "../../Axios";


// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const inactivityTimer = useRef(null);

//   const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutes in ms

//   // --- Helper: read user_data cookie ---
//   const getUserFromCookie = () => {
//     const match = document.cookie.match(/(^| )UD=([^;]+)/);
//     if (!match) return null;
//     try {
//       const decoded = decodeURIComponent(match[2]);
//       return JSON.parse(decoded);
//     } catch (err) {
//       console.error("Failed to parse user_data cookie", err);
//       return null;
//     }
//   };

//   // --- On first load, rehydrate user from cookie ---
//   useEffect(() => {
//     const userInfo = getUserFromCookie();
//     if (userInfo) setUser(userInfo);
//     setLoading(false);
//   }, []);

//   // --- Logout function ---
//   const logout = async () => {
//     try {
//       await apiClient.post("/logout/", {}, { withCredentials: true });
//     } catch {
//       console.warn("Logout request failed (maybe already logged out)");
//     }
//     // CLEAR LOCAL STORAGE ON LOGOUT
//     try {
//       localStorage.clear();
//       sessionStorage.clear();
//     } catch (err) {
//       console.error("Failed to clear storage:", err);
//     }

//     clearInactivityTimer();
//     setUser(null);
//     window.location.href = "/"; // redirect to login
//   };

//   // --- Auto logout after inactivity ---
//   const resetInactivityTimer = () => {
//     clearInactivityTimer();
//     inactivityTimer.current = setTimeout(() => {
//       console.warn("⚠️ Auto-logging out due to inactivity");
//       localStorage.clear();
//       sessionStorage.clear();
//       logout();
//     }, INACTIVITY_LIMIT);
//   };

//   const clearInactivityTimer = () => {
//     if (inactivityTimer.current) {
//       clearTimeout(inactivityTimer.current);
//     }
//   };

//   useEffect(() => {
//     if (!user) return;

//     const activityEvents = ["mousemove", "keydown", "click", "scroll"];
//     const resetTimer = () => resetInactivityTimer();

//     activityEvents.forEach((event) =>
//       window.addEventListener(event, resetTimer)
//     );

//     resetInactivityTimer(); // start when user logs in

//     return () => {
//       activityEvents.forEach((event) =>
//         window.removeEventListener(event, resetTimer)
//       );
//       clearInactivityTimer();
//     };
//     // eslint-disable-next-line
//   }, [user]);

//   // --- Login ---
//   const login = async (username, password, otp = null, resend_otp = false) => {
//     try {
//       // encode safely (handles unicode)
//       const encode = (s) =>
//         typeof s === "string" ? btoa(unescape(encodeURIComponent(s))) : s;

//       const payload = {
//         username: encode(username),
//         password: encode(password),
//       };
//       if (otp) payload.otp = otp;
//       if (resend_otp) payload.resend_otp = true;

//       const response = await apiClient.post("/v2/login/", payload, {
//         withCredentials: true,
//       });

//       // Wait for cookies to be set
//       await new Promise((resolve) => setTimeout(resolve, 500));

//       const userInfo = getUserFromCookie();
//       if (userInfo) setUser(userInfo);

//       return response.data;
//     } catch (err) {
//     const msg =
//       err.response?.data?.error ||
//       err.response?.data?.detail ||
//       "Invalid username or password";
//     throw new Error(msg);
//   }
// };

//   // --- Auto logout if cookie is removed (manual session expiry) ---
//   useEffect(() => {
//     const interval = setInterval(() => {
//       const userInfo = getUserFromCookie();
//       if (!userInfo && user) {
//         console.warn(
//           "Session expired — user_data cookie missing. Logging out."
//         );

//         localStorage.clear();
//         sessionStorage.clear();

//         logout();
//       }
//     }, 30 * 1000); // check every 30 seconds

//     return () => clearInterval(interval);
//     // eslint-disable-next-line
//   }, [user]);

//   const value = { user, setUser, login, logout, loading };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

// export const useAuth = () => useContext(AuthContext);
