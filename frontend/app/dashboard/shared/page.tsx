"use client";

import { useEffect, useState } from "react";
import apiClient from "@/services/api-client";
import { AvailableFile, AvailableFilesResponse } from "@/types";
import {
  Eye,
  FileText,
  User,
  Search,
  Lock,
  ChevronLeft,
  ChevronRight,
  Share2
} from "lucide-react";

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
      console.error("Lỗi lấy danh sách Shared With Me:", err);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Được chia sẻ với tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách các tập tin còn hạn được người dùng khác chia sẻ trực tiếp với bạn.
          </p>
        </div>

        {/* Thanh tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Tìm theo tên file hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 bg-white border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Bảng Danh sách File */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 font-medium animate-pulse">
          Đang tải danh sách tập tin được chia sẻ...
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 bg-white">
          <Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-semibold text-gray-700">Chưa có tập tin nào</p>
          <p className="text-xs text-gray-400 mt-1">
            Các tập tin còn hiệu lực được chia sẻ đến email của bạn sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4">Tên Tập Tin</th>
                  <th className="p-4 text-center">Người Chia Sẻ</th>
                  <th className="p-4 text-center">Bảo Mật</th>
                  <th className="p-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file) => (
                  <tr key={file.fileid} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-semibold text-gray-900 flex items-center gap-2.5 max-w-md truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </td>

                    <td className="p-4 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        {file.owner}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      {file.haspassword ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          <Lock className="w-3 h-3" /> Cần mật khẩu
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Không</span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(file.sharetoken)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-blue-100"
                        title="Xem trước & Tải về"
                      >
                        <Eye className="w-3.5 h-3.5" /> Truy cập file
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
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
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}