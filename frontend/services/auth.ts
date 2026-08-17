import apiClient from "./api-client";
import {
  LoginRequest,
  LoginResponse,
  LoginSuccessResponse,
  RegisterRequest,
  RegisterSuccessResponse,
  UserResponse,
} from "@/types";

export const authService = {
  // Login bước 1: Có thể trả về LoginSuccessResponse hoặc TOTPRequiredResponse
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  // Login bước 2: Luôn trả về LoginSuccessResponse (có accessToken)
  verifyLoginTOTP: async (payload: { cid: string; code: string }): Promise<LoginSuccessResponse> => {
    const response = await apiClient.post<LoginSuccessResponse>("/auth/login/totp", payload);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<RegisterSuccessResponse> => {
    const response = await apiClient.post<RegisterSuccessResponse>("/auth/register", data);
    return response.data;
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>("/user");
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },

  setupTOTP: async (): Promise<{ message: string; totpSetup: { secret: string; qrCode: string } }> => {
    const response = await apiClient.post("/auth/totp/setup");
    return response.data;
  },

  verifyTOTP: async (code: string): Promise<{ message: string; totpEnabled: boolean }> => {
    const response = await apiClient.post("/auth/totp/verify", { code });
    return response.data;
  },

  disableTOTP: async (code: string): Promise<{ message: string; totpEnabled: boolean }> => {
    const response = await apiClient.post("/auth/totp/disable", { code });
    return response.data;
  },
};