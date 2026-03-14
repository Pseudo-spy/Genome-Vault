import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 60000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("gv-auth");
      if (raw) {
        const { state } = JSON.parse(raw);
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("gv-auth");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;
