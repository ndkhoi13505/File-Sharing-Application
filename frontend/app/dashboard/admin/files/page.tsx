"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/services/api-client";
import { authService } from "@/services/auth";
import { adminService, AdminAllFilesResponse } from "@/services/admin";
import { fileService } from "@/services/file";
import FileInfoModal from "@/components/FileInfoModal";
import * as lucideReact from "lucide-react";

export default function AdminAllFilesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminAllFilesResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "expired">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "fileName" | "fileSize">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cleaning, setCleaning] = useState(false);

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedFileIdForModal, setSelectedFileIdForModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [fileToDownload, setFileToDownload] = useState<any>(null);
  const [downloadPassword, setDownloadPassword] = useState("");
  const [showDownloadPassword, setShowDownloadPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState("");

  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deletedFiles: number } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  const passwordResolverRef = useRef<((password: string | null) => void) | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, [currentPage, statusFilter, sortBy, order]);

  const checkAdminAndFetch = async () => {
    try {
      const userRes = await authService.getCurrentUser();
      if (userRes.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      fetchFiles();
    } catch {
      router.push("/login");
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAllFiles({
        page: currentPage,
        limit: 10,
        status: statusFilter,
        sortBy,
        order,
        q: searchQuery || undefined,
      });
      setData(res);
      setSelectedFileIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmedCleanup = async () => {
    setCleanupModalOpen(false);
    try {
      setCleaning(true);
      const res = await adminService.cleanupExpiredFiles();
      setCleanupResult({ deletedFiles: res.deletedFiles ?? 0 });
      fetchFiles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Đã có lỗi xảy ra khi dọn dẹp file hết hạn");
    } finally {
      setCleaning(false);
    }
  };

  const handleConfirmedDeleteFile = async () => {
    if (!fileToDelete) return;
    const targetId = fileToDelete.id;
    setDeleteModalOpen(false);
    setFileToDelete(null);

    try {
      await fileService.deleteFile(targetId);
      fetchFiles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể xóa file này");
    }
  };

  const handleSort = (column: "createdAt" | "fileName" | "fileSize") => {
    if (sortBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setOrder("asc");
    }
    setCurrentPage(1);
  };

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allFiles = data?.files || [];
    if (selectedFileIds.length === allFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(allFiles.map((f) => f.id));
    }
  };

  const handleCopyLink = (file: any) => {
    const shareUrl = `${window.location.origin}/f/${file.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const promptPasswordViaModal = (fileItem: any, isRetry = false): Promise<string | null> => {
    return new Promise((resolve) => {
      setFileToDownload(fileItem);
      setDownloadPassword("");
      setShowDownloadPassword(false);
      setPasswordModalError(isRetry ? "Mật khẩu không chính xác. Vui lòng thử lại" : "");
      setPasswordModalOpen(true);
      passwordResolverRef.current = resolve;
    });
  };

  const downloadFileWithAuth = async (fileItem: any, initialPwd?: string): Promise<boolean> => {
    let currentPwd = initialPwd;

    while (true) {
      try {
        const headers: Record<string, string> = {};
        if (currentPwd) {
          headers["X-File-Password"] = currentPwd;
        }

        const response = await apiClient.get(`/files/${fileItem.shareToken}/download`, {
          headers,
          responseType: "blob",
        });

        setPasswordModalOpen(false);
        setFileToDownload(null);
        setDownloadPassword("");
        setPasswordModalError("");

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

        return true;
      } catch (error: any) {
        let data = error.response?.data;
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            data = JSON.parse(text);
          } catch { }
        }

        const status = error.response?.status;
        const msg = data?.message || data?.error || "Đã có lỗi xảy ra khi tải file";

        if (status === 403) {
          const userEnteredPassword = await promptPasswordViaModal(fileItem, Boolean(currentPwd));
          if (userEnteredPassword === null) {
            return false;
          }
          currentPwd = userEnteredPassword;
          continue;
        }

        alert(`Lỗi khi tải file "${fileItem.fileName}": ${msg}`);
        return false;
      }
    }
  };

  const handleDownloadSingleFile = async (fileItem: any) => {
    await downloadFileWithAuth(fileItem);
  };

  const handleBatchDownload = async () => {
    const filesToDownload = (data?.files || []).filter((f) => selectedFileIds.includes(f.id));
    setBatchActionLoading(true);

    for (const f of filesToDownload) {
      await downloadFileWithAuth(f);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setBatchActionLoading(false);
  };

  const handleConfirmedBatchDelete = async () => {
    setBatchDeleteModalOpen(false);
    try {
      setBatchActionLoading(true);
      await Promise.all(selectedFileIds.map((id) => fileService.deleteFile(id)));
      setSelectedFileIds([]);
      fetchFiles();
    } catch (err) {
      alert("Đã xảy ra lỗi trong quá trình xóa một số file");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const allFiles = data?.files || [];
  const pagination = data?.pagination;
  const isAllSelected = allFiles.length > 0 && selectedFileIds.length === allFiles.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md shrink-0">
              Admin
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight truncate">
              Quản lý toàn bộ file
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Quản lý toàn bộ file có trong hệ thống
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCleanupModalOpen(true)}
          disabled={cleaning}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-red-600/20 whitespace-nowrap shrink-0 w-full sm:w-auto cursor-pointer"
        >
          <lucideReact.Trash2 className="w-4 h-4 shrink-0" />
          <span>{cleaning ? "Đang dọn dẹp..." : "Dọn dẹp file hết hạn"}</span>
        </button>
      </div>

      {/* Thanh công cụ */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tìm Kiếm */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            fetchFiles();
          }}
          className="relative flex-1"
        >
          <input
            type="text"
            placeholder="Tìm kiếm file theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <lucideReact.Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        {/* Bộ Lọc */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
          {/* Trạng thái */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Chờ hiệu lực</option>
              <option value="expired">Đã hết hạn</option>
            </select>
            <lucideReact.ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sắp xếp */}
          <div className="relative">
            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [newSort, newOrder] = e.target.value.split("-") as any;
                setSortBy(newSort);
                setOrder(newOrder);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="createdAt-desc">Mới nhất</option>
              <option value="createdAt-asc">Cũ nhất</option>
              <option value="fileSize-desc">Dung lượng lớn nhất</option>
              <option value="fileSize-asc">Dung lượng nhỏ nhất</option>
              <option value="fileName-asc">Tên (A-Z)</option>
              <option value="fileName-desc">Tên (Z-A)</option>
            </select>
            <lucideReact.ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Danh sách file */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-left border-collapse text-sm text-gray-600 whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold border-b border-gray-100">
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
                <th
                  onClick={() => handleSort("fileSize")}
                  className="p-4 text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Dung lượng</span>
                    {sortBy === "fileSize" ? (
                      order === "asc" ? <lucideReact.ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <lucideReact.ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <lucideReact.ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">Chế độ chia sẻ</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="p-4 text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Ngày tạo</span>
                    {sortBy === "createdAt" ? (
                      order === "asc" ? <lucideReact.ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <lucideReact.ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <lucideReact.ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 animate-pulse">
                    Đang tải danh sách các file có trong hệ thống...
                  </td>
                </tr>
              ) : allFiles.length > 0 ? (
                allFiles.map((file) => {
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

                      <td className="p-4 font-semibold text-gray-900 max-w-xs truncate">
                        {file.fileName}
                        <span className="block text-[11px] text-gray-400 font-normal font-mono">{file.id}</span>
                      </td>

                      <td className="p-4 text-center font-medium">
                        {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-xs rounded-md font-semibold ${file.isPublic ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"}`}>
                          {file.isPublic ? "Công khai" : "Riêng tư"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-xs rounded-md font-semibold ${file.status === "active" ? "bg-green-50 text-green-700 border border-green-200" :
                          file.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                          {file.status === "active" ? "Hoạt động" : file.status === "pending" ? "Chờ hiệu lực" : "Hết hạn"}
                        </span>
                      </td>

                      <td className="p-4 text-center text-gray-500 text-xs">
                        {new Date(file.createdAt).toLocaleString("vi-VN")}
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* Nút Xem thông tin chi tiết */}
                          <button
                            type="button"
                            onClick={() => setSelectedFileIdForModal(file.id)}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Xem thông tin chi tiết của file"
                          >
                            <lucideReact.Info className="w-4 h-4" />
                          </button>

                          {/* Nút Xem trước */}
                          <button
                            type="button"
                            onClick={() => window.open(`/f/${file.shareToken}`, "_blank")}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Xem trước file"
                          >
                            <lucideReact.Eye className="w-4 h-4" />
                          </button>

                          {/* Nút Tải file */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleFile(file)}
                            className="inline-flex p-1.5 bg-gray-50 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                            title="Tải file"
                          >
                            <lucideReact.Download className="w-4 h-4" />
                          </button>

                          {/* Nút Sao chép link */}
                          <button
                            type="button"
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

                          {/* Nút Xóa file */}
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
                    Không tìm thấy file nào trong hệ thống
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Đã chọn</span>
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedFileIds.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleBatchDownload}
            disabled={batchActionLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <lucideReact.Download className="w-4 h-4 text-emerald-600" />
            <span>{batchActionLoading ? "Đang tải xuống..." : "Tải về các file đã chọn"}</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchDeleteModalOpen(true)}
            disabled={batchActionLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <lucideReact.Trash2 className="w-4 h-4 text-red-600" />
            <span>Xóa các file đã chọn</span>
          </button>

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

      {passwordModalOpen && fileToDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-blue-600">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                  <lucideReact.Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-none">Yêu cầu mật khẩu</h3>
                  <p className="text-xs text-gray-500 mt-1">File được bảo vệ mật khẩu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPasswordModalOpen(false);
                  setFileToDownload(null);
                  setDownloadPassword("");
                  setPasswordModalError("");
                  if (passwordResolverRef.current) passwordResolverRef.current(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer -mr-1"
              >
                <lucideReact.X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              File <span className="font-bold text-gray-900">"{fileToDownload.fileName}"</span> yêu cầu mật khẩu để tải xuống
            </p>

            {passwordModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                <lucideReact.AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordModalError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordResolverRef.current) {
                  passwordResolverRef.current(downloadPassword);
                }
              }}
              className="space-y-4"
            >
              <div className="relative">
                <input
                  type={showDownloadPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu của file"
                  value={downloadPassword}
                  onChange={(e) => setDownloadPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-11 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowDownloadPassword(!showDownloadPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  title={showDownloadPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showDownloadPassword ? (
                    <lucideReact.EyeOff className="w-4 h-4" />
                  ) : (
                    <lucideReact.Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setFileToDownload(null);
                    setDownloadPassword("");
                    setPasswordModalError("");
                    if (passwordResolverRef.current) {
                      passwordResolverRef.current(null);
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cleanupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <lucideReact.AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-none">Dọn dẹp hệ thống</h3>
              </div>
              <button
                type="button"
                onClick={() => setCleanupModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer -mr-1"
              >
                <lucideReact.X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn <span className="font-bold text-red-600">xóa tất cả file đã hết hạn</span> trong hệ thống? Hành động này không thể hoàn tác
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCleanupModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmedCleanup}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-600/20 transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <lucideReact.Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-none">Xóa file</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer -mr-1"
              >
                <lucideReact.X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa file <span className="font-bold text-gray-900">"{fileToDelete.name}"</span> khỏi hệ thống? Hành động này không thể hoàn tác
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
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmedDeleteFile}
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
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <lucideReact.AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-none">Xóa nhiều file</h3>
              </div>
              <button
                type="button"
                onClick={() => setBatchDeleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer -mr-1"
              >
                <lucideReact.X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa <span className="font-bold text-red-600">{selectedFileIds.length} file đã chọn</span> khỏi hệ thống? Hành động này không thể hoàn tác
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBatchDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Hủy
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

      {selectedFileIdForModal && (
        <FileInfoModal
          fileId={selectedFileIdForModal}
          onClose={() => setSelectedFileIdForModal(null)}
        />
      )}

      {cleanupResult !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-gray-100 p-6 text-center space-y-4 animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => setCleanupResult(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <lucideReact.X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shrink-0">
              <lucideReact.CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Dọn dẹp hoàn tất</h3>
              <p className="text-sm text-gray-600 mt-1">
                {cleanupResult.deletedFiles > 0 ? (
                  <>
                    Đã xóa thành công <span className="font-bold text-emerald-600">{cleanupResult.deletedFiles}</span> file hết hạn khỏi hệ thống
                  </>
                ) : (
                  "Hiện tại không có file hết hạn để dọn dẹp"
                )}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCleanupResult(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}