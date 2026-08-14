import apiClient from "./api-client";
import { UserFilesResponse, AvailableFilesResponse, FileUploadResponse } from "@/types";

export const fileService = {
  // Lấy danh sách file do chính User upload
  getMyFiles: async (): Promise<UserFilesResponse> => {
    const response = await apiClient.get<UserFilesResponse>("/files/my");
    return response.data;
  },

  // Lấy danh sách file công khai/được chia sẻ
  getAvailableFiles: async (): Promise<AvailableFilesResponse> => {
    const response = await apiClient.get<AvailableFilesResponse>("/files/available");
    return response.data;
  },

  // Hàm Upload File sử dụng FormData
  uploadFile: async (formData: FormData): Promise<FileUploadResponse> => {
    const response = await apiClient.post<FileUploadResponse>("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  deleteFile: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/files/info/${id}`);
    return response.data;
  },
};