"use client";

import { useEffect, useState } from "react";
import apiClient from "@/services/api-client";
import { AvailableFile, AvailableFilesResponse } from "@/types";
import * as lucideReact from "lucide-react";

export default function SharedWithMePage() {
  const [files, setFiles] = useState<AvailableFile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalFiles: 0,
    limit: 10,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [fileToDownload, setFileToDownload] = useState<AvailableFile | null>(null);
  const [downloadPassword, setDownloadPassword] = useState("");
  const [showDownloadPassword, setShowDownloadPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState("");

  useEffect(() => {
    fetchSharedFiles(currentPage, searchQuery);
  }, [currentPage]);

  const fetchSharedFiles = async (page: number, q?: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get<AvailableFilesResponse>("/files/available", {
        params: {
          page,
          limit: 10,
          q: q || undefined,
        },
      });

      setFiles(res.data.files || []);
      if (res.data.pagination) {
        setPagination({
          currentPage: res.data.pagination.currentPage,
          totalPages: res.data.pagination.totalPages,
          totalFiles: res.data.pagination.totalFiles,
          limit: res.data.pagination.limit,
        });
      }
    } catch (err) {
      console.error("Đã có lỗi xảy ra khi lấy danh sách Shared With Me: ", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSharedFiles(1, searchQuery);
  };

  const handleOpenPreview = (shareToken: string) => {
    window.open(`/f/${shareToken}`, "_blank");
  };

  const handleDownloadFile = async (fileItem: AvailableFile, pwd?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (pwd) {
        headers["X-File-Password"] = pwd;
      }

      const response = await apiClient.get(`/files/${fileItem.sharetoken}/download`, {
        headers,
        responseType: "blob",
      });

      setPasswordModalOpen(false);
      setFileToDownload(null);
      setDownloadPassword("");
      setPasswordModalError("");

      let downloadName = fileItem.filename || `file-${fileItem.sharetoken}`;
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
      let data = error.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          data = JSON.parse(text);
        } catch { }
      }

      const status = error.response?.status;
      const msg = data?.message || data?.error || "Đã xảy ra lỗi khi tải file.";

      if (status === 403) {
        setFileToDownload(fileItem);
        setPasswordModalOpen(true);
        if (pwd) {
          setPasswordModalError("Mật khẩu không chính xác. Vui lòng thử lại!");
        }
        return;
      }

      alert(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Được chia sẻ với tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách các file còn hạn được người khác chia sẻ với bạn.
          </p>
        </div>

        {/* Thanh tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm file theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 bg-white border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
          <lucideReact.Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Danh sách File */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 font-medium animate-pulse">
          Đang tải danh sách file được chia sẻ...
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 bg-white">
          <lucideReact.Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-semibold text-gray-700">Chưa có file nào</p>
          <p className="text-xs text-gray-400 mt-1">
            Các file còn hạn được chia sẻ với bạn sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4">Tên File</th>
                  <th className="p-4 text-center">Người Chia Sẻ</th>
                  <th className="p-4 text-center">Bảo Mật</th>
                  <th className="p-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file) => (
                  <tr key={file.fileid} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-semibold text-gray-900 flex items-center gap-2.5 max-w-md truncate">
                      <lucideReact.FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </td>

                    <td className="p-4 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                        <lucideReact.User className="w-3.5 h-3.5 text-gray-500" />
                        {file.owner}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      {file.haspassword ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          <lucideReact.Lock className="w-3 h-3" /> Có mật khẩu
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Không</span>
                      )}
                    </td>

                    <td className="p-4 text-center space-x-2 whitespace-nowrap">
                      {/* Nút Xem trước */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(file.sharetoken)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-blue-100"
                        title="Xem trước file trong tab mới"
                      >
                        <lucideReact.Eye className="w-3.5 h-3.5" /> Xem trước file
                      </button>

                      {/* Nút Tải xuống */}
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-green-100"
                        title="Tải trực tiếp tập tin về máy"
                      >
                        <lucideReact.Download className="w-3.5 h-3.5" /> Tải file
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {files.length > 0 && pagination && pagination.totalPages > 1 && (
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
      )}

      {passwordModalOpen && fileToDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150 relative">

            <button
              type="button"
              onClick={() => {
                setPasswordModalOpen(false);
                setFileToDownload(null);
                setDownloadPassword("");
                setPasswordModalError("");
              }}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Đóng"
            >
              <lucideReact.X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-blue-600 pb-2 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                <lucideReact.Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Yêu cầu mật khẩu</h3>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              File <span className="font-bold text-gray-900">"{fileToDownload.filename}"</span> yêu cầu mật khẩu.
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
                setPasswordModalError("");
                handleDownloadFile(fileToDownload, downloadPassword);
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

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setFileToDownload(null);
                    setDownloadPassword("");
                    setPasswordModalError("");
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Hủy bỏ
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
    </div>
  );
}