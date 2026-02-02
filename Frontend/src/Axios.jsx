import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Important: allows refresh token cookie
});

const getCookie = (name) => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
};

apiClient.interceptors.request.use((config) => {
  const csrf = getCookie("csrftoken");
  if (csrf && ["post", "put", "patch", "delete"].includes(config.method)) {
    config.headers["X-CSRFToken"] = csrf;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error = null) => {
  refreshQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve();
  });
  refreshQueue = [];
};

// Interceptor for handling expired access tokens (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't refresh on login
    if (originalRequest?.url?.includes("/v2/login/")) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // 🔁 Queue the request
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: () => resolve(apiClient(originalRequest)),
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/token/refresh/`,
          {},
          {
            withCredentials: true,
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
            },
          }
        );

        processQueue();
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.location.href = "/";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
