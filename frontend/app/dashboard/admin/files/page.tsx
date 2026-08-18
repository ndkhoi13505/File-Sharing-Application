"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/services/api-client";
import { authService } from "@/services/auth";
import { adminService, AdminAllFilesResponse } from "@/services/admin";
import { fileService } from "@/services/file";
import { File } from "@/types";
import FileInfoModal from "@/components/FileInfoModal";
import {
  Search,
  ChevronDown,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  Info,
  Link2,
  Check,
  X
} from "lucide-react";

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

  // Quản lý chọn file & Modal
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedFileIdForModal, setSelectedFileIdForModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, [currentPage, statusFilter, sortBy, order]);

  const checkAdminAndFetch = async () => {
    try {
      const userRes = await authService.getCurrentUser();
      if (userRes.user.role !== "admin") {
        alert("Bạn không có quyền truy cập trang này.");
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

  const handleCleanup = async () => {
    if (!confirm("Bạn có chắc chắn muốn dọn dẹp tất cả file đã hết hạn trong toàn bộ hệ thống?")) return;
    try {
      setCleaning(true);
      const res = await adminService.cleanupExpiredFiles();
      alert(`Dọn dẹp thành công! Đã xóa ${res.deletedFiles} file hết hạn.`);
      fetchFiles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi dọn dẹp file.");
    } finally {
      setCleaning(false);
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!confirm(`Xóa file "${name}" vĩnh viễn khỏi hệ thống?`)) return;
    try {
      await fileService.deleteFile(id);
      fetchFiles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể xóa file này.");
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

  const handleDownloadSingleFile = async (fileItem: any) => {
    try {
      let headers: Record<string, string> = {};
      if (fileItem.hasPassword) {
        const pass = prompt(`Tập tin "${fileItem.fileName}" có mật khẩu bảo vệ. Vui lòng nhập mật khẩu:`);
        if (pass === null) return;
        headers["X-File-Password"] = pass;
      }

      const response = await apiClient.get(`/files/${fileItem.shareToken}/download`, {
        headers,
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
      const msg = error.response?.data?.message || "Lỗi khi tải tập tin. Vui lòng thử lại.";
      alert(msg);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedFileIds.length} tập tin đã chọn khỏi hệ thống?`)) return;

    try {
      setBatchActionLoading(true);
      await Promise.all(selectedFileIds.map((id) => fileService.deleteFile(id)));
      setSelectedFileIds([]);
      fetchFiles();
    } catch (err) {
      alert("Xảy ra lỗi trong quá trình xóa một số tập tin.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDownload = async () => {
    const filesToDownload = (data?.files || []).filter((f) => selectedFileIds.includes(f.id));
    setBatchActionLoading(true);

    for (const f of filesToDownload) {
      await handleDownloadSingleFile(f);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setBatchActionLoading(false);
  };

  const allFiles = data?.files || [];
  const pagination = data?.pagination;
  const isAllSelected = allFiles.length > 0 && selectedFileIds.length === allFiles.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md">ADMIN ONLY</span>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý toàn bộ File</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Xem, tìm kiếm và dọn dẹp toàn bộ file trong hệ thống</p>
        </div>

        <button
          onClick={handleCleanup}
          disabled={cleaning}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-red-600/20 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {cleaning ? "Đang dọn dẹp..." : "Dọn dẹp file hết hạn"}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            fetchFiles();
          }}
          className="relative"
        >
          <input
            type="text"
            placeholder="Tìm kiếm file hệ thống..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        <div className="flex items-center gap-3">
          {/* Lọc trạng thái */}
          <div className="relative inline-flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl pl-3.5 pr-8 py-2 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Chờ hiệu lực</option>
              <option value="expired">Đã hết hạn</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Sắp xếp */}
          <div className="relative inline-flex items-center">
            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [newSort, newOrder] = e.target.value.split("-") as any;
                setSortBy(newSort);
                setOrder(newOrder);
                setCurrentPage(1);
              }}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl pl-3.5 pr-8 py-2 focus:outline-none cursor-pointer"
            >
              <option value="createdAt-desc">Mới nhất</option>
              <option value="createdAt-asc">Cũ nhất</option>
              <option value="fileSize-desc">Dung lượng lớn nhất</option>
              <option value="fileSize-asc">Dung lượng nhỏ nhất</option>
              <option value="fileName-asc">Tên (A-Z)</option>
              <option value="fileName-desc">Tên (Z-A)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-gray-600">
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
                    <span>Tên tập tin</span>
                    {sortBy === "fileName" ? (
                      order === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
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
                      order === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">Quyền hạn</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="p-4 text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Ngày tạo</span>
                    {sortBy === "createdAt" ? (
                      order === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
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
                    Đang tải danh sách file toàn hệ thống...
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
                        <span className={`px-2 py-0.5 text-xs rounded-md font-semibold ${file.isPublic ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                          {file.isPublic ? "Public" : "Private"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-xs rounded-md font-semibold ${
                          file.status === "active" ? "bg-green-50 text-green-700 border border-green-200" :
                          file.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {file.status === "active" ? "Hoạt động" : file.status === "pending" ? "Chờ hiệu lực" : "Hết hạn"}
                        </span>
                      </td>

                      <td className="p-4 text-center text-gray-500 text-xs">
                        {new Date(file.createdAt).toLocaleString("vi-VN")}
                      </td>

                      <td className="p-4 text-center space-x-2">
                        {/* Nút Xem trước */}
                        <button
                          type="button"
                          onClick={() => window.open(`/f/${file.shareToken}`, "_blank")}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Xem trước file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Nút Xem thông tin chi tiết */}
                        <button
                          type="button"
                          onClick={() => setSelectedFileIdForModal(file.id)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Xem thông tin chi tiết của file"
                        >
                          <Info className="w-4 h-4" />
                        </button>

                        {/* Nút Tải về máy */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleFile(file)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Tải file"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Nút Copy link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(file)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-purple-50 text-gray-500 hover:text-purple-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Sao chép link chia sẻ"
                        >
                          {copiedId === file.id ? (
                            <Check className="w-4 h-4 text-green-600 animate-in zoom-in" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Nút Xóa vĩnh viễn */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.fileName)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Xóa vĩnh viễn (Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Không tìm thấy file nào trong hệ thống.
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
                <ChevronLeft className="w-4 h-4" />
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
                        className={`w-7 h-7 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          currentPage === pageNum
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
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Actions Bar - Giao diện sáng */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-gray-200 text-gray-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Số lượng đã chọn */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedFileIds.length}
            </span>
            <span className="text-sm font-semibold text-gray-700">Đã chọn</span>
          </div>

          {/* Nút Tải về (Tone xanh lá) */}
          <button
            type="button"
            onClick={handleBatchDownload}
            disabled={batchActionLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{batchActionLoading ? "Đang xử lý..." : "Tải về"}</span>
          </button>

          {/* Nút Xóa đã chọn */}
          <button
            type="button"
            onClick={handleBatchDelete}
            disabled={batchActionLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Xóa file đã chọn</span>
          </button>

          {/* Nút Đóng / Hủy chọn */}
          <button
            type="button"
            onClick={() => setSelectedFileIds([])}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer ml-1"
            title="Bỏ chọn tất cả"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Thông tin chi tiết & Thống kê */}
      {selectedFileIdForModal && (
        <FileInfoModal
          fileId={selectedFileIdForModal}
          onClose={() => setSelectedFileIdForModal(null)}
        />
      )}
    </div>
  );
}