"use client";

import axios from 'axios';
import { useEffect, useState } from "react";
import { fileService } from "@/services/file";
import { authService } from "@/services/auth";
import { User, File, UserFilesResponse } from "@/types";
import UploadModal from "@/components/UploadModal";
import ShareModal from "@/components/ShareModal";
import UserAvatar from "@/components/UserAvatar";
import BatchShareModal from "@/components/BatchShareModal";
import { 
  Folder, 
  Clock, 
  AlertTriangle, 
  Mail, 
  ShieldAlert,
  Download,
  Trash2,
  Lock,
  FileUp, 
  Eye,
  Link2, 
  Check,
  Share2,
  CheckSquare,
  Square,
  X,
  Copy
} from "lucide-react";

// Hàm tính Badge thời gian còn lại
function getRemainingTimeBadge(availableToStr?: string) {
  if (!availableToStr) {
    return <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-medium">Vĩnh viễn</span>;
  }

  const targetDate = new Date(availableToStr);
  const now = new Date();

  if (isNaN(targetDate.getTime()) || targetDate.getFullYear() > 2090) {
    return <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-medium">Vĩnh viễn</span>;
  }

  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return <span className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg text-xs font-semibold">Đã hết hạn</span>;
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {diffDays} ngày</span>;
  }
  if (diffHours >= 1) {
    return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {diffHours} giờ</span>;
  }

  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return <span className="text-orange-700 bg-orange-50 border border-orange-200/60 px-2.5 py-1 rounded-lg text-xs font-medium">Còn {diffMinutes} phút</span>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fileData, setFileData] = useState<UserFilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  //STATE QUẢN LÝ CHỌN NHIỀU FILE
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [isBatchShareOpen, setIsBatchShareOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return; 
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [userRes, filesRes] = await Promise.all([
        authService.getCurrentUser(),
        fileService.getMyFiles(),
      ]);
      setUser(userRes.user); 
      setFileData(filesRes);
      setIsAuthenticated(true); 
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu hệ thống.");
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse font-medium">Đang tải dữ liệu từ server...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200">Hoạt động</span>;
      case "pending":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">Chờ duyệt</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 border border-red-200">Hết hạn</span>;
    }
  };

  // Logic chọn checkbox đơn
  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Logic chọn tất cả / bỏ chọn tất cả
  const toggleSelectAll = () => {
    const allFiles = fileData?.files || [];
    if (selectedFileIds.length === allFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(allFiles.map((f: any) => f.id));
    }
  };

  const handleCopyLink = (file: File) => {
    const shareUrl = `${window.location.origin}/preview/${file.shareToken || (file as any).sharetoken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSingleFile = async (fileItem: any) => {
    try {
      const token = localStorage.getItem("token") || "";
      const targetToken = fileItem.shareToken || fileItem.sharetoken || fileItem.id;

      const response = await axios.get(
        `http://localhost:8080/files/${targetToken}/download`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          responseType: "blob",
        }
      );

      let downloadName = fileItem.fileName || fileItem.name || `file-${targetToken}`;
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
    } catch (error) {
      console.error("Lỗi tải file:", error);
    }
  };

  // 🌟 HÀNH ĐỘNG HÀNG LOẠT 1: XÓA NHIỀU FILE CÙNG LÚC
  const handleBatchDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedFileIds.length} tập tin đã chọn?`)) return;

    try {
      setBatchActionLoading(true);
      await Promise.all(selectedFileIds.map((id) => fileService.deleteFile(id)));
      setSelectedFileIds([]);
      const res = await fileService.getMyFiles();
      setFileData(res);
    } catch (err) {
      alert("Xảy ra lỗi trong quá trình xóa một số tập tin.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // 🌟 HÀNH ĐỘNG HÀNG LOẠT 2: TẢI NHIỀU FILE CÙNG LÚC
  const handleBatchDownload = async () => {
    const filesToDownload = (fileData?.files || []).filter((f: any) => selectedFileIds.includes(f.id));
    setBatchActionLoading(true);

    for (const f of filesToDownload) {
      await handleDownloadSingleFile(f);
      // Nghỉ 400ms giữa các lần tải để trình duyệt không chặn popup tải file
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setBatchActionLoading(false);
  };

  // 🌟 HÀNH ĐỘNG HÀNG LOẠT 3: SAO CHÉP TẤT CẢ LINK CHIA SẺ ĐÃ CHỌN
  const handleBatchCopyLinks = () => {
    const selectedFiles = (fileData?.files || []).filter((f: any) => selectedFileIds.includes(f.id));
    const links = selectedFiles
      .map((f: any) => `${window.location.origin}/preview/${f.shareToken || f.sharetoken || f.id}`)
      .join("\n");

    navigator.clipboard.writeText(links);
    alert(`Đã sao chép ${selectedFiles.length} liên kết chia sẻ vào bộ nhớ tạm!`);
  };

  const handleOpenPreview = (fileItem: any) => {
    const rawUser = localStorage.getItem("user");
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const currentUserID = localStorage.getItem("userID") || parsedUser?.id || parsedUser?.user_id;
    const fileOwnerID = fileItem.ownerId || fileItem.owner_id || fileItem.user_id || fileItem.owner?.id;
    const shareToken = fileItem.shareToken || fileItem.sharetoken || fileItem.id;

    if ((currentUserID && fileOwnerID && String(currentUserID) === String(fileOwnerID)) || fileItem.isPublic || fileItem.is_public) {
      const token = localStorage.getItem("token") || "";
      window.open(`http://localhost:8080/files/${shareToken}/preview?token=${token}`, "_blank");
    } else {
      window.open(`/preview/${shareToken}`, "_blank");
    }
  };

  const allFiles = fileData?.files || [];
  const isAllSelected = allFiles.length > 0 && selectedFileIds.length === allFiles.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-24">

      {/* Header & Upload Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Tổng quan tài nguyên và hoạt động lưu trữ của bạn.</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <FileUp className="w-4 h-4" />
          Upload File
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
                <Mail className="w-4 h-4" /> {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm">
            <ShieldAlert className={`w-4 h-4 ${user.totpEnabled ? "text-green-600" : "text-gray-400"}`} />
            <span className="text-gray-600">Xác thực 2 lớp:</span>
            <span className={`font-semibold ${user.totpEnabled ? "text-green-600" : "text-red-500"}`}>
              {user.totpEnabled ? "Đã bật" : "Chưa cài đặt"}
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {fileData?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Tổng file hoạt động</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.activeFiles}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">File đang chờ duyệt</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.pendingFiles}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">File đã quá hạn</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.expiredFiles}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">File đã xóa</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fileData.summary.deletedFiles}</p>
            </div>
          </div>
        </div>
      )}

      {/* File Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Danh sách tài liệu đã upload</h3>
          <p className="text-xs text-gray-500 mt-1">Quản lý link tải, trạng thái và thời gian hiệu lực của file.</p>
        </div>

        {error && <p className="p-4 text-sm text-red-500 bg-red-50 text-center">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium text-xs border-b border-gray-100 uppercase tracking-wider">
              <tr>
                {/* 🌟 CHECKBOX CHỌN TẤT CẢ */}
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Tên tập tin</th>
                <th className="p-4">Dung lượng</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Chế độ bảo mật</th>
                <th className="p-4">Thời gian còn lại</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allFiles.length > 0 ? (
                allFiles.map((file: File) => {
                  const f = file as any;
                  const isSelected = selectedFileIds.includes(file.id);

                  return (
                    <tr 
                      key={file.id} 
                      className={`transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-gray-50/70"}`}
                    >
                      {/* 🌟 CHECKBOX CHỌN TỪNG FILE */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectFile(file.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-4 font-semibold text-gray-950 max-w-xs truncate">
                        {file.fileName || f.fileName || f.filename}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const rawSize = f.fileSize ?? f.file_size ?? f.size ?? f.fileSizeMB ?? 0;
                          const bytes = Number(rawSize) || 0;

                          if (bytes === 0) return <span className="text-gray-400">0 KB</span>;
                          if (bytes < 1024) return `${bytes} B`;
                          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                          return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                        })()}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(file.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 items-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${file.isPublic ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"}`}>
                            {file.isPublic ? "Public" : "Private"}
                          </span>
                          {file.hasPassword && (
                            <span className="p-1 bg-gray-100 text-gray-600 rounded" title="Có mật khẩu bảo vệ">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-medium">
                        {getRemainingTimeBadge(f.availableTo || f.available_to)}
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button 
                          type="button"
                          onClick={() => handleOpenPreview(file)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors"
                          title="Xem trước file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button 
                          type="button"
                          onClick={() => setSelectedFileId(file.id)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Chia sẻ file với người dùng khác"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleDownloadSingleFile(file)}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-md border border-gray-200 transition-colors"
                          title="Tải file"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
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

                        <button
                          onClick={async () => {
                            if (confirm(`Bạn có chắc muốn xóa file "${file.fileName}"?`)) {
                              try {
                                await fileService.deleteFile(file.id);
                                const res = await fileService.getMyFiles();
                                setFileData(res);
                              } catch (err) {
                                alert("Không thể xóa file này.");
                              }
                            }
                          }}
                          className="inline-flex p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-md border border-gray-200 transition-colors cursor-pointer"
                          title="Xóa file"
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
                    Bạn chưa tải lên tập tin nào hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 THANH CÔNG CỤ NỔI (FLOATING BATCH ACTION BAR) */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-gray-800 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2 text-sm font-semibold border-r border-gray-700 pr-4">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs flex items-center justify-center font-bold">
              {selectedFileIds.length}
            </span>
            <span>Đã chọn</span>
          </div>

          <div className="flex items-center gap-3 text-sm font-medium">
            <button
              onClick={handleBatchDownload}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-green-400" /> Tải về
            </button>

            <button
              onClick={() => setIsBatchShareOpen(true)}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-blue-400" /> Chia sẻ
            </button>

            <button
              onClick={handleBatchDelete}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Xóa đã chọn
            </button>
          </div>

          <button
            onClick={() => setSelectedFileIds([])}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors border-l border-gray-700 pl-4 cursor-pointer"
            title="Bỏ chọn tất cả"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={() => {
          fileService.getMyFiles().then((res) => setFileData(res));
        }} 
      />

      {/* Share Modal */}
      {selectedFileId && (
        <ShareModal 
          fileId={selectedFileId} 
          onClose={() => setSelectedFileId(null)} 
        />
      )}
      {/*share nhiều file cùng lúc*/}
      <BatchShareModal
        fileIds={selectedFileIds}
        isOpen={isBatchShareOpen}
        onClose={() => setIsBatchShareOpen(false)}
        onSuccess={() => {
          setSelectedFileIds([]);
          fileService.getMyFiles().then((res) => setFileData(res));
        }}
      />
    </div>
  );
}