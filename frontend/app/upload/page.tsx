"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import * as lucideReact from "lucide-react";
import { fileService } from "@/services/file";
import { FileUploadResponse, SystemPolicy } from "@/types";
import { formatFileSize } from "@/utils/format";

export default function UploadPage() {
  const [policy, setPolicy] = useState<SystemPolicy | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [availableFrom, setAvailableFrom] = useState<string>("");
  const [availableTo, setAvailableTo] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileUploadResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const minDateTime = getCurrentLocalDateTime();

  useEffect(() => {
    fileService.getSystemPolicy()
      .then((data) => setPolicy(data))
      .catch((err) => console.error("Can't get system policy: ", err));
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handlePreSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn file cần tải lên");
      return;
    }
    setError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmedUpload = async () => {
    setShowConfirmModal(false);
    setError(null);
    setLoading(true);

    try {
      const response = await fileService.uploadFile({
        file: file!,
        isPublic: true,
        password: password || undefined,
        availableFrom: availableFrom || undefined,
        availableTo: availableTo || undefined,
      });
      setResult(response);
    } catch (err: any) {
      const apiError = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(typeof apiError === "object" ? JSON.stringify(apiError) : apiError || "Tải lên không thành công");
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    if (!result?.file) return "";
    const token = result.file.shareToken;
    if (token) {
      return `${typeof window !== "undefined" ? window.location.origin : ""}/f/${token}`;
    }
    return result.file.shareLink || "";
  };

  const copyShareLink = () => {
    const link = getShareUrl();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <lucideReact.ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại trang chủ
        </Link>

        {/* System Policy */}
        {policy && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 text-blue-900 font-semibold text-sm">
              <lucideReact.Info className="w-4 h-4 text-blue-600" />
              <span>Quy định hiện tại của hệ thống</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-blue-100/50 flex flex-col justify-between">
                <div className="flex items-center text-gray-500 mb-1 gap-1.5">
                  <lucideReact.HardDrive className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Dung lượng file tối đa</span>
                </div>
                <div className="text-base font-bold text-gray-900">{policy.MaxFileSizeMB} MB</div>
              </div>

              <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-blue-100/50 flex flex-col justify-between">
                <div className="flex items-center text-gray-500 mb-1 gap-1.5">
                  <lucideReact.Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Thời gian lưu mặc định</span>
                </div>
                <div className="text-base font-bold text-gray-900">{policy.DefaultValidityDays} ngày</div>
              </div>

              <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-blue-100/50 flex flex-col justify-between">
                <div className="flex items-center text-gray-500 mb-1 gap-1.5">
                  <lucideReact.Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Thời gian lưu tối thiểu</span>
                </div>
                <div className="text-base font-bold text-gray-900">{policy.MinValidityHours} tiếng</div>
              </div>

              <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-blue-100/50 flex flex-col justify-between">
                <div className="flex items-center text-gray-500 mb-1 gap-1.5">
                  <lucideReact.Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Thời gian lưu tối đa</span>
                </div>
                <div className="text-base font-bold text-gray-900">{policy.MaxValidityDays} ngày</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Upload File Nhanh</h1>
            <p className="text-sm text-gray-500 mt-1">
              Chia sẻ tập tin công khai.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <lucideReact.AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="text-center py-6">
              <lucideReact.CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upload File Thành Công!</h2>
              <p className="text-gray-500 text-sm mb-6">
                File <b>{result.file.fileName}</b> đã sẵn sàng để chia sẻ.
              </p>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-left">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Link Chia Sẻ
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl()}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
                  />
                  <button
                    onClick={copyShareLink}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <lucideReact.Copy className="w-4 h-4 mr-1.5" />
                    {copied ? "Đã copy" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    setPassword("");
                    setAvailableFrom("");
                    setAvailableTo("");
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Upload file khác
                </button>
                {result.file.shareToken && (
                  <Link
                    href={`/f/${result.file.shareToken}`}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
                  >
                    Xem trang tải file
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handlePreSubmit} className="space-y-6">
              {/* Chọn Tập tin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn file</label>
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer relative bg-gray-50/50 transition-colors">
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <lucideReact.UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-blue-600 font-medium text-sm">
                      <lucideReact.FileText className="w-4 h-4" />
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Kéo thả file vào đây hoặc bấm để chọn file</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Dung lượng file tối đa: {policy ? `${policy.MaxFileSizeMB} MB` : "50 MB"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông báo quyền truy cập công khai mặc định */}
              <div className="flex items-center gap-3 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                <lucideReact.Globe className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Quyền truy cập: Công khai</h4>
                  <p className="text-xs text-gray-500">
                    Chế độ tải lên ẩn danh luôn tạo link chia sẻ công khai.
                  </p>
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <lucideReact.Lock className="w-4 h-4 text-gray-400" />
                    Mật khẩu bảo vệ (Tùy chọn)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={`Tối thiểu ${policy?.RequirePasswordMinLength || 8} ký tự`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <lucideReact.EyeOff className="w-4 h-4" />
                    ) : (
                      <lucideReact.Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Thời gian hiệu lực */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <lucideReact.Clock className="w-4 h-4 text-gray-400" />
                      Hiệu lực từ (Mặc định: Hiện tại)
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    min={minDateTime}
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <lucideReact.Clock className="w-4 h-4 text-gray-400" />
                      Hết hạn vào (Mặc định: + {policy?.DefaultValidityDays || 7} ngày)
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    min={availableFrom || minDateTime}
                    value={availableTo}
                    onChange={(e) => setAvailableTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm flex justify-center items-center gap-2 cursor-pointer"
              >
                {loading ? "Đang xử lý..." : "Tiếp tục"}
              </button>
            </form>
          )}

          {/* Bảng tóm tắt */}
          {showConfirmModal && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-amber-600 pb-2 border-b border-gray-100">
                  <lucideReact.AlertTriangle className="w-6 h-6" />
                  <h4 className="text-lg font-bold text-gray-900">Xác nhận thông tin tải lên</h4>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <lucideReact.AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Lưu ý quan trọng:
                  </p>
                  <p>
                    Các cài đặt cho file sau khi tải lên sẽ <b className="underline">không thể chỉnh sửa</b>. Vui lòng kiểm tra kỹ thông tin trước khi upload!
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <lucideReact.FileText className="w-4 h-4 text-gray-400" /> Tên file:
                    </span>
                    <span className="font-semibold text-gray-900 truncate max-w-[240px]">{file?.name}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Dung lượng file:</span>
                    <span className="font-semibold text-gray-900">{formatFileSize(file?.size)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Quyền truy cập:</span>
                    <span className="font-semibold text-blue-600 flex items-center gap-1">
                      Công khai
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Mật khẩu bảo vệ:</span>
                    <span className="font-semibold text-gray-900">
                      {password ? <span className="text-green-600 flex items-center gap-1"><lucideReact.Lock className="w-3.5 h-3.5" /> Đã cài đặt</span> : "Không có"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Hiệu lực từ:</span>
                    <span className="font-semibold text-gray-900">
                      {availableFrom ? new Date(availableFrom).toLocaleString("vi-VN") : "Ngay khi tải lên"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500">Hết hạn vào:</span>
                    <span className="font-semibold text-gray-900">
                      {availableTo ? new Date(availableTo).toLocaleString("vi-VN") : `Mặc định (${policy?.DefaultValidityDays || 7} ngày)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                >
                  Quay lại chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedUpload}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 cursor-pointer transition-colors"
                >
                  Xác nhận & Tải lên
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}