import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("civicpulse_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized, except on initial auth routes
      const path = window.location.pathname;
      if (!path.includes("/login") && !path.includes("/register") && path !== "/") {
        localStorage.removeItem("civicpulse_token");
        localStorage.removeItem("civicpulse_user");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
