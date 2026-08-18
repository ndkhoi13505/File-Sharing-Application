import apiClient from "./api-client";
import { LoginRequest, LoginResponse, RegisterRequest, RegisterSuccessResponse, UserResponse } from "@/types";

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", credentials);
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
  }
};
