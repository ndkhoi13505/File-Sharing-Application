"use client";

import { useState } from "react";
import { fileService } from "@/services/file";
import { X, UploadCloud, Lock, Eye, Calendar, Loader2, Globe, ShieldAlert } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [validityDays, setValidityDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Vui lòng chọn 1 tập tin!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("isPublic", String(isPublic));
      formData.append("is_public", String(isPublic));
      formData.append("validityDays", String(validityDays));
      
      // Chỉ gửi password khi ở chế độ Private (bỏ tích public)
      if (!isPublic && password.trim()) {
        formData.append("password", password);
      }

      await fileService.uploadFile(formData);
      setSelectedFile(null);
      setPassword("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Tải file lên thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Tải lên tập tin mới</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Drag/Drop Box */}
          <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-blue-50/30 relative">
            <input 
              type="file" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="font-semibold text-gray-900 text-sm max-w-[250px] truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Kéo thả file vào đây hoặc <span className="text-blue-600">chọn từ máy tính</span></p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ các định dạng tài liệu, hình ảnh, archive...</p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 text-sm">
            
            {/* Chế độ công khai / Riêng tư */}
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-gray-800 font-semibold cursor-pointer">
                  {isPublic ? <Globe className="w-4 h-4 text-blue-600" /> : <ShieldAlert className="w-4 h-4 text-purple-600" />}
                  <span>{isPublic ? "Chế độ Công Khai (Public)" : "Chế độ Riêng Tư (Private)"}</span>
                </label>
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={(e) => {
                    setIsPublic(e.target.checked);
                    if (e.target.checked) setPassword(""); // Xóa pass nếu bật public
                  }}
                  className="w-5 h-5 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-500">
                {isPublic 
                  ? "Mọi người có link hoặc vào trang Shared đều có thể xem tập tin này." 
                  : "Chỉ người có mật khẩu hoặc người được bạn chia sẻ mới có quyền truy cập."}
              </p>
            </div>

            {/* Mật khẩu bảo vệ (Chỉ hiển thị khi KHÔNG TÍCH PUBLIC) */}
            {!isPublic && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="flex items-center gap-2 text-gray-700 font-medium">
                  <Lock className="w-4 h-4 text-purple-600" />
                  Mật khẩu truy cập file <span className="text-red-500">*</span>
                </label>
                <input 
                  type="password"
                  placeholder="Nhập mật khẩu để mở khóa file..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-purple-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-purple-50/30"
                  required={!isPublic}
                />
              </div>
            )}

            {/* Thời gian hiệu lực */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <Calendar className="w-4 h-4 text-gray-500" />
                Thời hạn lưu trữ (Ngày)
              </label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value={0}>Vĩnh viễn (Mặc định)</option>
                <option value={1}>1 Ngày</option>
                <option value={3}>3 Ngày</option>
                <option value={7}>7 Ngày </option>
                <option value={30}>30 Ngày</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tải lên ngay"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}