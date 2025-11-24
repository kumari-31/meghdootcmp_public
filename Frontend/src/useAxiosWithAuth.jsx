import { useEffect } from "react";
import apiClient from "./axios";
import { useAuth } from "../context/AuthContext";

export const useAxiosWithAuth = () => {
  const { accessToken, logout, setAccessToken } = useAuth();

  useEffect(() => {
    // Request interceptor
    const reqInterceptor = apiClient.interceptors.request.use(
      (config) => {
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    const resInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            // Try refreshing token using HTTP-only cookie
            const refreshResponse = await apiClient.post("/token/refresh/", {}, { withCredentials: true });
            const newAccessToken = refreshResponse.data.access;
            if (newAccessToken) {
              setAccessToken(newAccessToken);
              error.config.headers.Authorization = `Bearer ${newAccessToken}`;
              return apiClient(error.config);
            }
          } catch (err) {
            console.error("Token refresh failed:", err);
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.request.eject(reqInterceptor);
      apiClient.interceptors.response.eject(resInterceptor);
    };
  }, [accessToken, logout, setAccessToken]);

  return apiClient;
};
