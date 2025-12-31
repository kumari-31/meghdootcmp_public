import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Important: allows refresh token cookie
});

let isRefreshing = false;

// Interceptor for handling expired access tokens (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

      // If request is to login endpoint – don't refresh token
    if (originalRequest?.url?.includes("/v2/login/")) {
      return Promise.reject(error); // just return error to UI
    }

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Try to refresh the access token silently
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}token/refresh/`,
            {},
            { withCredentials: true }
          );
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          isRefreshing = false;
          // Optionally log out user if refresh token expired
          window.location.href = "/";
          return Promise.reject(refreshError);
        }
        isRefreshing = false;
      }

      // Retry the original request after refresh
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// // src/api/axios.js
// import axios from "axios";
// import {
//   getAccessToken,
//   getRefreshToken,
//   saveTokens,
//   clearTokens,
// } from "./Pages/Authentication/auth";

// // Create an Axios instance
// const apiClient = axios.create({
//   // baseURL: "http://10.184.39.33:8002/api/",
//   // baseURL: "http://10.184.40.131:8002/api/",

//   baseURL: "http://10.184.40.158:8002/api/",

//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// /// Attach token to all requests
// apiClient.interceptors.request.use(
//   (config) => {
//     const token = getAccessToken();
//     if (token) {
//       config.headers["Authorization"] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // Handle 401 errors and refresh tokens
// apiClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       try {
//         const refreshToken = getRefreshToken();
//         if (!refreshToken) throw new Error("No refresh token available");

//         const response = await axios.post(
//           // "http://10.184.39.33:8002/api/token/refresh/",
//           "http://10.184.40.158:8002/api/token/refresh/",

//           {
//             refresh: refreshToken,
//           }
//         );

//         const newAccessToken = response.data.access;
//         saveTokens(newAccessToken, refreshToken);

//         apiClient.defaults.headers.common[
//           "Authorization"
//         ] = `Bearer ${newAccessToken}`;
//         originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

//         return apiClient(originalRequest);
//       } catch (err) {
//         console.error("Token refresh failed:", err);
//         clearTokens(); // Clear tokens and redirect to login
//         window.location.href = "/"; // Redirect to login page
//         return Promise.reject(err);
//       }
//     }
//   }
// );

// export default apiClient;
