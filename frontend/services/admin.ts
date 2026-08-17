import apiClient from "./api-client";
import { SystemPolicy } from "@/types";

export interface SystemPolicyUpdate {
  maxFileSizeMB?: number;
  minValidityHours?: number;
  maxValidityDays?: number;
  defaultValidityDays?: number;
  requirePasswordMinLength?: number;
}

export interface AdminAllFilesParams {
  page?: number;
  limit?: number;
  status?: "active" | "pending" | "expired" | "all";
  sortBy?: "createdAt" | "fileName" | "fileSize";
  order?: "asc" | "desc";
  q?: string;
}

export interface AdminAllFilesResponse {
  files: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    shareToken: string;
    ownerId: string | null;
    isPublic: boolean;
    status: string;
    availableFrom: string;
    availableTo: string;
    createdAt: string;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalFiles: number;
    limit: number;
  };
}

export const adminService = {
  // Lấy toàn bộ file hệ thống
  getAllFiles: async (params?: AdminAllFilesParams): Promise<AdminAllFilesResponse> => {
    const response = await apiClient.get<AdminAllFilesResponse>("/admin/all_files", { params });
    return response.data;
  },

  // Lấy cấu hình hệ thống
  getPolicy: async (): Promise<SystemPolicy> => {
    const response = await apiClient.get<SystemPolicy>("/admin/policy");
    return response.data;
  },

  // Cập nhật cấu hình hệ thống
  updatePolicy: async (data: SystemPolicyUpdate): Promise<{ message: string; policy: SystemPolicy }> => {
    const response = await apiClient.patch<{ message: string; policy: SystemPolicy }>("/admin/policy", data);
    return response.data;
  },

  // Dọn dẹp file hết hạn
  cleanupExpiredFiles: async (): Promise<{ message: string; deletedFiles: number; timestamp: string }> => {
    const response = await apiClient.post<{ message: string; deletedFiles: number; timestamp: string }>("/admin/cleanup");
    return response.data;
  },
};