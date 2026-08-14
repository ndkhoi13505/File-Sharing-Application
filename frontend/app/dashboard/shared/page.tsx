"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Eye, Trash2, FileText, User } from "lucide-react";

export default function SharedWithMePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSharedFiles();
  }, []);

  const fetchSharedFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8080/files/available", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData = res.data.files || res.data.data || res.data || [];
      
      // 🌟 1. ĐỌC DANH SÁCH FILE ĐÃ XÓA TỪ LOCALSTORAGE VÀ LỌC ẨN
      const hiddenIds = JSON.parse(localStorage.getItem("hidden_shared_files") || "[]");
      const visibleFiles = (Array.isArray(rawData) ? rawData : []).filter(
        (item: any) => !hiddenIds.includes(item.fileid || item.id)
      );

      setFiles(visibleFiles);
    } catch (err) {
      console.error("Lỗi lấy danh sách Shared With Me:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Xử lý mở Preview Xem Trước An Toàn
  const handleOpenPreview = (file: any) => {
    const shareToken = file.sharetoken || file.shareToken || file.share_token || file.fileid || file.id;
    window.open(`/preview/${shareToken}`, "_blank");
  };

  // 🌟 2. XỬ LÝ NÚT XÓA TẠI CLIENT: Không gọi API backend chưa tồn tại để tránh lỗi 404
  const handleRemoveSharedFile = (file: any) => {
    const fileId = file.fileid || file.id;
    const fileName = file.filename || file.fileName || "Tập tin này";

    if (!confirm(`Bạn có chắc muốn xóa "${fileName}" khỏi danh sách được chia sẻ?`)) {
      return;
    }

    // A. Cập nhật UI xóa dòng ngay lập tức
    setFiles((prev) => prev.filter((item) => (item.fileid || item.id) !== fileId));

    // B. Lưu ID file đã xóa vào LocalStorage để khi F5 trang không bị hiện lại
    const hiddenIds = JSON.parse(localStorage.getItem("hidden_shared_files") || "[]");
    if (!hiddenIds.includes(fileId)) {
      hiddenIds.push(fileId);
      localStorage.setItem("hidden_shared_files", JSON.stringify(hiddenIds));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Được chia sẻ với tôi</h1>
        <p className="text-sm text-gray-500">Danh sách các tài liệu được người dùng khác chia sẻ với bạn.</p>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Đang tải danh sách...</p>
      ) : files.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          Chưa có tập tin nào được chia sẻ với bạn.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm text-gray-600">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 font-semibold uppercase">
                <th className="p-4">Tên Tập Tin</th>
                <th className="p-4">Người Chia Sẻ</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((file, index) => {
                const fileName = file.filename || file.fileName || "Tập tin không tên";
                const ownerInfo = file.owner || "Thắng (Owner)";
                const uniqueKey = file.fileid || file.id || file.sharetoken || `key-${index}`;

                return (
                  <tr key={uniqueKey} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{fileName}</td>
                    
                    <td className="p-4 text-gray-600">
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        {ownerInfo}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      {/* NÚT 1: XEM TRƯỚC (PREVIEW) */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(file)}
                        className="inline-flex p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md border border-gray-200 transition-colors"
                        title="Xem trước file an toàn"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* NÚT 2: XÓA KHỎI DANH SÁCH CHIA SẺ */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSharedFile(file)}
                        className="inline-flex p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-md border border-gray-200 transition-colors"
                        title="Gỡ khỏi danh sách của tôi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}