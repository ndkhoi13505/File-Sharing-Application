"use client";

import { useEffect, useState } from "react";
import apiClient from "@/services/api-client";
import { fileService } from "@/services/file";
import { authService } from "@/services/auth";
import { User, File, UserFilesResponse } from "@/types";
import UploadModal from "@/components/UploadModal";
import UserAvatar from "@/components/UserAvatar";
import FileInfoModal from "@/components/FileInfoModal";
import { copyToClipboard } from "@/utils/copy";
import * as lucideReact from "lucide-react";

function getRemainingTimeBadge(file: File) {
  if (file.status === "expired") {
    return <span className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg text-xs font-semibold">Đã hết hạn</span>;
  }

  if (file.status === "pending") {
    return <span className="text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Chờ hiệu lực</span>;
  }

  if (file.hoursRemaining !== undefined && file.hoursRemaining !== null) {
    if (file.hoursRemaining <= 0) {
      return <span className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg text-xs font-semibold">Đã hết hạn</span>;
    }
    const days = Math.floor(file.hoursRemaining / 24);
    if (days >= 1) {
      return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {days} ngày</span>;
    }
    const hours = Math.floor(file.hoursRemaining);
    if (hours >= 1) {
      return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {hours} giờ</span>;
    }
    return <span className="text-orange-700 bg-orange-50 border border-orange-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Dưới 1 giờ</span>;
  }

  if (!file.availableTo) {
    return <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-medium">Vĩnh viễn</span>;
  }

  const targetDate = new Date(file.availableTo);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return <span className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg text-xs font-semibold">Đã hết hạn</span>;
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {diffDays} ngày</span>;
  }
  return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {diffHours} giờ</span>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fileData, setFileData] = useState<UserFilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "expired">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "fileName">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [isBatchShareOpen, setIsBatchShareOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    initDashboard();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFilesOnly();
    }
  }, [currentPage, statusFilter, sortBy, order]);

  const loadFilesWithDetails = async (params: {
    page: number;
    limit: number;
    status: "all" | "active" | "pending" | "expired";
    sortBy: "createdAt" | "fileName";
    order: "asc" | "desc";
    q?: string;
  }): Promise<UserFilesResponse> => {
    const res = await fileService.getMyFiles(params);

    if (res.files && res.files.length > 0) {
      const detailedFiles = await Promise.all(
        res.files.map(async (f) => {
          try {
            const detail = await fileService.getFileInfo(f.id);
            return detail.file ? { ...f, ...detail.file } : f;
          } catch {
            return f;
          }
        })
      );
      return { ...res, files: detailedFiles };
    }
    return res;
  };

  const initDashboard = async () => {
    try {
      const [userRes, filesRes] = await Promise.all([
        authService.getCurrentUser(),
        loadFilesWithDetails({
          page: 1,
          limit: pageSize,
          status: "all",
          sortBy: "createdAt",
          order: "desc"
        }),
      ]);
      setUser(userRes.user);
      setFileData(filesRes);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu hệ thống");
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesOnly = async (overrideQuery?: string) => {
    try {
      setTableLoading(true);
      const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
      const res = await loadFilesWithDetails({
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        sortBy: sortBy,
        order: order,
        q: q || undefined,
      });
      setFileData(res);
      setSelectedFileIds([]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Đã có lỗi xảy ra khi tải danh sách file");
    } finally {
      setTableLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFilesOnly();
  };

  const handleSort = (column: "createdAt" | "fileName") => {
    if (sortBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setOrder("asc");
    }
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse font-medium">Đang tải dữ liệu từ hệ thống...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-green-50 text-green-700 border border-green-200">Hoạt động</span>;
      case "pending":
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200">Chờ hiệu lực</span>;
      default:
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-red-50 text-red-700 border border-red-200">Hết hạn</span>;
    }
  };

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allFiles = fileData?.files || [];
    if (selectedFileIds.length === allFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(allFiles.map((f) => f.id));
    }
  };

  const handleCopyLink = async (file: File) => {
    const shareUrl = `${window.location.origin}/f/${file.shareToken}`;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownloadSingleFile = async (fileItem: File) => {
    try {
      const response = await apiClient.get(`/files/${fileItem.shareToken}/download`, {
        responseType: "blob",
      });

      let downloadName = fileItem.fileName || `file-${fileItem.shareToken}`;
      const contentDisposition = String(response.headers["content-disposition"] || "");
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch[1]) {
          downloadName = fileNameMatch[1];
        }
      }

      const contentType = String(response.headers["content-type"] || "application/octet-stream");
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Đã xảy ra lỗi khi tải file";
      alert(msg);
    }
  };

  const handleConfirmedDeleteSingleFile = async () => {
    if (!fileToDelete) return;
    const targetId = fileToDelete.id;
    setDeleteModalOpen(false);
    setFileToDelete(null);

    try {
      await fileService.deleteFile(targetId);
      fetchFilesOnly();
    } catch {
      alert("Không thể xóa file này");
    }
  };

  const handleConfirmedBatchDelete = async () => {
    setBatchDeleteModalOpen(false);

    try {
      setBatchActionLoading(true);
      await Promise.all(selectedFileIds.map((id) => fileService.deleteFile(id)));
      setSelectedFileIds([]);
      fetchFilesOnly();
    } catch {
      alert("Đã xảy ra lỗi trong quá trình xóa một số file");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDownload = async () => {
    const filesToDownload = (fileData?.files || []).filter((f) => selectedFileIds.includes(f.id));
    setBatchActionLoading(true);

    for (const f of filesToDownload) {
      await handleDownloadSingleFile(f);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setBatchActionLoading(false);
  };

  const allFiles = fileData?.files || [];
  const pagination = fileData?.pagination;
  const isAllSelected = allFiles.length > 0 && selectedFileIds.length === allFiles.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-24">

      {/* Header & Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            Trang chủ
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tổng quan về thông tin và file của bạn
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 whitespace-nowrap shrink-0 w-full sm:w-auto cursor-pointer"
        >
          <lucideReact.FileUp className="w-4 h-4 shrink-0" />
          <span>Upload File</span>
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user.username}
              avatarUrl={(user as any).avatarUrl}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 capitalize">{user.username}</h2>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <lucideReact.Mail className="w-4 h-4" /> {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm">
            <lucideReact.ShieldAlert className={`w-4 h-4 ${user.totpEnabled ? "text-green-600" : "text-gray-400"}`} />
            <span className="text-gray-600">Xác thực 2 lớp:</span>
            <span className={`font-semibold ${user.totpEnabled ? "text-green-600" : "text-red-500"}`}>
              {user.totpEnabled ? "Đã bật" : "Chưa cài đặt"}
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {fileData?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <lucideReact.Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">File đang hoạt động</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.activeFiles}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <lucideReact.Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">File đang chờ</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.pendingFiles}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <lucideReact.AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">File đã hết hạn</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.expiredFiles}</p>
            </div>
          </div>
        </div>
      )}

      {/* File Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Danh sách file đã upload</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {statusFilter === "pending"
                ? `Tổng cộng ${fileData?.summary?.pendingFiles ?? allFiles.length} file`
                : statusFilter === "active"
                  ? `Tổng cộng ${fileData?.summary?.activeFiles ?? allFiles.length} file`
                  : statusFilter === "expired"
                    ? `Tổng cộng ${fileData?.summary?.expiredFiles ?? allFiles.length} file`
                    : `Tổng cộng ${pagination?.totalFiles ?? allFiles.length} file`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Status */}
            <div className="relative inline-flex items-center">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="pending">Chờ hiệu lực</option>
                <option value="expired">Đã hết hạn</option>
              </select>
              <lucideReact.ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative inline-flex items-center">
              <select
                value={`${sortBy}-${order}`}
                onChange={(e) => {
                  const [newSortBy, newOrder] = e.target.value.split("-") as ["createdAt" | "fileName", "asc" | "desc"];
                  setSortBy(newSortBy);
                  setOrder(newOrder);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="createdAt-desc">Mới nhất trước</option>
                <option value="createdAt-asc">Cũ nhất trước</option>
                <option value="fileName-asc">Tên (A-Z)</option>
                <option value="fileName-desc">Tên (Z-A)</option>
              </select>
              <lucideReact.ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm file theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
              <lucideReact.Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </form>
          </div>
        </div>

        {error && <p className="p-4 text-sm text-red-500 bg-red-50 text-center">{error}</p>}

        <div className="overflow-x-auto relative">
          {tableLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="text-xs text-blue-600 font-medium animate-pulse">Đang tải...</span>
            </div>
          )}

          <table className="w-full min-w-212.5 text-left border-collapse text-sm text-gray-600 whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 font-medium text-xs border-b border-gray-100 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort("fileName")}
                  className="p-4 cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tên file</span>
                    {sortBy === "fileName" ? (
                      order === "asc" ? <lucideReact.ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <lucideReact.ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <lucideReact.ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">Dung lượng</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center">Chế độ chia sẻ</th>
                <th className="p-4 text-center">Thời gian còn lại</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allFiles.length > 0 ? (
                allFiles.map((file: File) => {
                  const isSelected = selectedFileIds.includes(file.id);

                  return (
                    <tr
                      key={file.id}
                      className={`transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-gray-50/70"}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectFile(file.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-4 font-semibold text-gray-950 max-w-xs truncate">
                        {file.fileName}
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          const bytes = Number(file.fileSize) || 0;
                          if (bytes === 0) return <span className="text-gray-400">0 KB</span>;
                          if (bytes < 1024) return `${bytes} B`;
                          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                          return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(file.status)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-1.5 items-center justify-center">
                          <span className={`px-2.5 py-1 text-xs rounded-md font-semibold ${file.isPublic ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"}`}>
                            {file.isPublic ? "Công khai" : "Riêng tư"}
                          </span>
                          {file.hasPassword && (
                            <div className="relative group inline-flex items-center">
                              <span className="p-1 bg-gray-100 text-gray-600 rounded cursor-pointer hover:bg-gray-200 transition-colors">
                                <lucideReact.Lock className="w-3 h-3" />
                              </span>
                              {/* Popup tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
                                <span className="bg-gray-900 text-white text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                                  Được bảo vệ bằng mật khẩu
                                </span>
                                <span className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5" />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center font-medium">
                        {getRemainingTimeBadge(file)}
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedFileId(file.id)}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Xem thông tin chi tiết của file"
                          >
                            <lucideReact.Info className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => window.open(`/f/${file.shareToken}`, "_blank")}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Xem trước file"
                          >
                            <lucideReact.Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadSingleFile(file)}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Tải file"
                          >
                            <lucideReact.Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCopyLink(file)}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-purple-50 text-gray-500 hover:text-purple-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Sao chép link chia sẻ"
                          >
                            {copiedId === file.id ? (
                              <lucideReact.Check className="w-4 h-4 text-green-600 animate-in zoom-in" />
                            ) : (
                              <lucideReact.Link2 className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFileToDelete({ id: file.id, name: file.fileName });
                              setDeleteModalOpen(true);
                            }}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Xóa file"
                          >
                            <lucideReact.Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Không có file nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {allFiles.length > 0 && pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Trang <span className="font-semibold text-gray-800">{pagination.currentPage}</span> / <span className="font-semibold text-gray-800">{pagination.totalPages}</span> (Tổng {pagination.totalFiles} file)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.currentPage <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Trang trước"
              >
                <lucideReact.ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - pagination.currentPage) <= 2 || p === 1 || p === pagination.totalPages)
                .map((pageNum, idx, arr) => {
                  const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
                  return (
                    <span key={pageNum} className="flex items-center">
                      {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium cursor-pointer transition-colors ${currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    </span>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Trang sau"
              >
                <lucideReact.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-gray-200 text-gray-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">

          {/* Số lượng file đã chọn */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Đã chọn</span>
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedFileIds.length}
            </span>
          </div>

          {/* Nút Tải về */}
          <button
            type="button"
            onClick={handleBatchDownload}
            disabled={batchActionLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <lucideReact.Download className="w-4 h-4 text-emerald-600" />
            <span>{batchActionLoading ? "Đang tải xuống..." : "Tải xuống file đã chọn"}</span>
          </button>

          {/* Nút Xóa đã chọn */}
          <button
            type="button"
            onClick={() => setBatchDeleteModalOpen(true)}
            disabled={batchActionLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <lucideReact.Trash2 className="w-4 h-4 text-red-600" />
            <span>Xóa file đã chọn</span>
          </button>

          {/* Nút Đóng / Hủy chọn */}
          <button
            type="button"
            onClick={() => setSelectedFileIds([])}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer ml-1"
            title="Bỏ chọn tất cả"
          >
            <lucideReact.X className="w-4 h-4" />
          </button>
        </div>
      )}

      {deleteModalOpen && fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <lucideReact.Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Xóa file</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Đóng"
              >
                <lucideReact.X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa file <span className="font-bold text-gray-900">"{fileToDelete.name}"</span>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmedDeleteSingleFile}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-600/20 transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {batchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <lucideReact.AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Xóa nhiều file</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBatchDeleteModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Đóng"
              >
                <lucideReact.X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa <span className="font-bold text-red-600">{selectedFileIds.length} file đã chọn</span>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBatchDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmedBatchDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-600/20 transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          fetchFilesOnly();
        }}
      />

      {selectedFileId && (
        <FileInfoModal
          fileId={selectedFileId}
          onClose={() => setSelectedFileId(null)}
        />
      )}
    </div>
  );
}