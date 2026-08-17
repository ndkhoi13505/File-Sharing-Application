import apiClient from "./api-client";
import {
  UserFilesResponse,
  AvailableFilesResponse,
  FileUploadResponse,
  FileInfoResponse,
  SystemPolicy
} from "@/types";

export interface UploadFileParams {
  file: File;
  isPublic?: boolean;
  password?: string;
  availableFrom?: string;
  availableTo?: string;
  sharedWith?: string[];
}

export interface GetMyFilesParams {
  page?: number;
  limit?: number;
  status?: "active" | "expired" | "pending" | "all";
  sortBy?: "createdAt" | "fileName";
  order?: "asc" | "desc";
  q?: string;
}

export const fileService = {
  // Lấy cấu hình hệ thống (Public endpoint)
  getSystemPolicy: async (): Promise<SystemPolicy> => {
    const response = await apiClient.get<SystemPolicy>("/admin/policy");
    return response.data;
  },

  // Lấy danh sách file của user với đầy đủ tham số paging & filter
  getMyFiles: async (params?: GetMyFilesParams): Promise<UserFilesResponse> => {
    const response = await apiClient.get<UserFilesResponse>("/files/my", { params });
    return response.data;
  },

  // Lấy danh sách file được chia sẻ (Available files)
  getAvailableFiles: async (params?: { page?: number; limit?: number; q?: string }): Promise<AvailableFilesResponse> => {
    const response = await apiClient.get<AvailableFilesResponse>("/files/available", { params });
    return response.data;
  },

  // Lấy chi tiết thông tin file theo ID (Dành cho owner/admin)
  getFileInfo: async (id: string): Promise<FileInfoResponse> => {
    const response = await apiClient.get<FileInfoResponse>(`/files/info/${id}`);
    return response.data;
  },

  // Tải file lên hệ thống
  uploadFile: async (payload: UploadFileParams): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", payload.file);

    if (payload.isPublic !== undefined) {
      formData.append("isPublic", String(payload.isPublic));
    }
    if (payload.password) {
      formData.append("password", payload.password);
    }
    if (payload.availableFrom) {
      formData.append("availableFrom", new Date(payload.availableFrom).toISOString());
    }
    if (payload.availableTo) {
      formData.append("availableTo", new Date(payload.availableTo).toISOString());
    }
    if (payload.sharedWith && payload.sharedWith.length > 0) {
      payload.sharedWith.forEach((email) => {
        formData.append("sharedWith", email);
      });
    }

    const response = await apiClient.post<FileUploadResponse>("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Xóa file theo ID
  deleteFile: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/files/info/${id}`);
    return response.data;
  },

  // Tải file về máy (hỗ trợ password qua header X-File-Password theo API Spec)
  downloadFile: async (shareToken: string, password?: string): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (password) {
      headers["X-File-Password"] = password;
    }
    const response = await apiClient.get(`/files/${shareToken}/download`, {
      headers,
      responseType: "blob",
    });
    return response.data;
  },

  getFileStats: async (id: string) => {
    const response = await apiClient.get(`/files/stats/${id}`);
    return response.data;
  },

  getFileDownloadHistory: async (id: string, params?: { page?: number; limit?: number }) => {
    const queryParams = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
    };
    const response = await apiClient.get(`/files/download-history/${id}`, { params: queryParams });
    return response.data;
  },
};