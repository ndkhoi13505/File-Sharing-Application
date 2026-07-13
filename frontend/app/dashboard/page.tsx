"use client";

import { useEffect, useState } from "react";
//import { fileService } from "@/services/file";
import { authService } from "@/services/auth";
import { User, File, UserFilesResponse } from "@/types";
import { 
  Folder, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  User as UserIcon, 
  Mail, 
  ShieldAlert,
  Download,
  Trash2,
  Lock
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fileData, setFileData] = useState<UserFilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 🌟 BỔ SUNG: Biến trạng thái để kiểm tra xem user có hợp lệ hay không
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      window.location.href = "/login";
      return; 
    }

    const fetchDashboardData = async () => {
      try {
        // 🌟 SỬA TẠI ĐÂY: Chỉ gọi API User, tạm thời bỏ fileService đi
        const userRes = await authService.getCurrentUser();

        setUser(userRes.user); 
        
        // Giả lập một chút dữ liệu trống để giao diện không bị lỗi render bảng
        setFileData({
          files: [],
          pagination: { currentPage: 1, totalPages: 1, totalFiles: 0, limit: 10 },
          summary: { activeFiles: 0, pendingFiles: 0, expiredFiles: 0, deletedFiles: 0 }
        });
        
        setIsAuthenticated(true); 
      } catch (err: any) {
        setError(err.response?.data?.message || "Không thể tải dữ liệu hệ thống.");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 1. Trong lúc đang load API thì hiện màn hình chờ
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse font-medium">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // 2. 🌟 QUAN TRỌNG: Nếu chưa được xác thực (isAuthenticated = false), trả về null 
  // Trình duyệt sẽ hiển thị màn hình trống chứ tuyệt đối không lộ một chữ nào của Dashboard ra ngoài!
  if (!isAuthenticated) {
    return null;
  }

  // Hàm render màu sắc cho trạng thái file
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      
      {/* THÔNG TIN NGƯỜI DÙNG */}
      {user && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-main/10 text-brand-main rounded-full border-1 border-brand-main flex items-center justify-center">
                <UserIcon className="w-8 h-8" />
            </div>
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

      {/* 2. THỐNG KÊ FILE */}
      {fileData?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 text-brand-main rounded-xl flex items-center justify-center">
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

      {/* 3. BẢNG DỮ LIỆU FILE */}
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
                <th className="p-4">Tên tập tin</th>
                <th className="p-4">Dung lượng</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Chế độ bảo mật</th>
                <th className="p-4">Thời gian còn lại</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fileData?.files && fileData.files.length > 0 ? (
                fileData.files.map((file: File) => (
                  <tr key={file.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-semibold text-gray-950 max-w-xs truncate">
                      {file.fileName}
                    </td>
                    <td className="p-4">
                      {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
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
                    <td className="p-4 font-medium text-gray-700">
                      {file.hoursRemaining !== undefined && file.hoursRemaining > 0 ? (
                        `${file.hoursRemaining} giờ`
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <a 
                        href={file.shareLink}
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex p-1.5 bg-gray-50 hover:bg-brand-main/10 text-gray-500 hover:text-brand-main rounded-md border border-gray-200 transition-colors"
                        title="Tải file / Xem link"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Bạn chưa tải lên tập tin nào hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
