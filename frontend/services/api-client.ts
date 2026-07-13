import axios from "axios";
import { getApiBaseUrl } from "@/config/config";

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default apiClient;
