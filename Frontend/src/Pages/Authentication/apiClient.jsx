// apiClient.js
import axios from 'axios';
// import { useAuth } from './authContext';

// A factory to create an axios instance bound to the current access token state
export const createApiClient = (getAccessToken, setAccessToken) => {
  const api = axios.create({
    baseURL: process.VITE_API_BASE_URL || '',
    withCredentials: true, // important so refresh endpoint receives cookie
  });

  // request interceptor to add Authorization header
  api.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // response interceptor to handle 401 and try refresh once
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) prom.reject(error);
      else prom.resolve(token);
    });
    failedQueue = [];
  };

  api.interceptors.response.use(
    r => r,
    async (err) => {
      const originalRequest = err.config;
      if (err.response && err.response.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // queue request until refresh completes
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axios(originalRequest);
          }).catch(e => Promise.reject(e));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const resp = await axios.post('/api/token/refresh/', {}, { withCredentials: true });
          const newAccess = resp.data.access;
          setAccessToken(newAccess); // update in-memory token
          processQueue(null, newAccess);
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;
          isRefreshing = false;
          return axios(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          // optional: force logout if refresh fails
          setAccessToken(null);
          return Promise.reject(refreshErr);
        }
      }
      return Promise.reject(err);
    }
  );

  return api;
};
