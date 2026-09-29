import axios from 'axios';

// The user's API key lives in the remote proxy; the browser only keeps an opaque token that identifies it
const TOKEN_KEY = "vc_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Create an instance of axios with the base URL
const api = axios.create({
  baseURL: "http://localhost:8000"
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers["X-User-Token"] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/") {
      clearToken();
      window.location.assign("/");
    }
    return Promise.reject(error);
  }
);

// Export the Axios instance
export default api;