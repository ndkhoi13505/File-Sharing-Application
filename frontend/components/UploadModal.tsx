"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import * as lucideReact from "lucide-react";
import { fileService } from "@/services/file";
import { SystemPolicy, FileUploadResponse } from "@/types";
import { formatFileSize } from "@/utils/format";
import { copyToClipboard } from "@/utils/copy";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [policy, setPolicy] = useState<SystemPolicy | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [availableFrom, setAvailableFrom] = useState<string>("");
  const [availableTo, setAvailableTo] = useState<string>("");
  const [sharedEmailInput, setSharedEmailInput] = useState<string>("");
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const minDateTime = getCurrentLocalDateTime();

  const resetForm = () => {
    setFile(null);
    setIsPublic(true);
    setPassword("");
    setShowPassword(false);
    setAvailableFrom("");
    setAvailableTo("");
    setSharedEmailInput("");
    setSharedWith([]);
    setError(null);
    setLoading(false);
    setUploadResult(null);
    setCopied(false);
    setShowConfirmModal(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fileService.getSystemPolicy()
        .then((data) => setPolicy(data))
        .catch((err) => console.error("Can't get system policy: ", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAddEmail = () => {
    const email = sharedEmailInput.trim();
    if (email && !sharedWith.includes(email)) {
      setSharedWith([...sharedWith, email]);
      setSharedEmailInput("");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setSharedWith(sharedWith.filter((e) => e !== emailToRemove));
  };

  const handlePreSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
        isPublic,
        password: password || undefined,
        availableFrom: availableFrom || undefined,
        availableTo: availableTo || undefined,
        sharedWith: !isPublic && sharedWith.length > 0 ? sharedWith : undefined,
      });

      setUploadResult(response);
      onSuccess();
    } catch (err: any) {
      const apiError = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(typeof apiError === "object" ? JSON.stringify(apiError) : apiError || "Tải lên không thành công");
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    if (!uploadResult?.file) return "";
    const token = uploadResult.file.shareToken;
    if (token) {
      return `${typeof window !== "undefined" ? window.location.origin : ""}/f/${token}`;
    }
    return uploadResult.file.shareLink || "";
  };

  const handleCopyLink = async () => {
    const link = getShareUrl();
    if (!link) return;
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-8 relative">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            {uploadResult ? "Tải lên thành công" : "Upload & Chia sẻ File"}
          </h3>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer transition-colors">
            <lucideReact.X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
          {uploadResult ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <lucideReact.CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-gray-900">Tải lên thành công!</h4>
                <p className="text-sm text-gray-600 mt-1.5">
                  File <b className="text-gray-900">{uploadResult.file.fileName}</b> đã sẵn sàng
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Link chia sẻ
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl()}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    {copied ? <lucideReact.Check className="w-4 h-4" /> : <lucideReact.Copy className="w-4 h-4" />}
                    {copied ? "Đã chép" : "Sao chép"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                >
                  Upload file khác
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 cursor-pointer transition-colors"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* System policy */}
              {policy && (
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                    <lucideReact.Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Quy định hiện tại của hệ thống</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-white/80 backdrop-blur rounded-lg p-2.5 border border-blue-100/60 flex flex-col justify-between">
                      <span className="text-gray-500 flex items-center gap-1 mb-1">
                        <lucideReact.HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Dung lượng file tối đa
                      </span>
                      <span className="font-bold text-gray-900 text-sm">{policy.MaxFileSizeMB} MB</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-lg p-2.5 border border-blue-100/60 flex flex-col justify-between">
                      <span className="text-gray-500 flex items-center gap-1 mb-1">
                        <lucideReact.Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Thời gian lưu mặc định
                      </span>
                      <span className="font-bold text-gray-900 text-sm">{policy.DefaultValidityDays} ngày</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-lg p-2.5 border border-blue-100/60 flex flex-col justify-between">
                      <span className="text-gray-500 flex items-center gap-1 mb-1">
                        <lucideReact.Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Thời gian lưu tối thiểu
                      </span>
                      <span className="font-bold text-gray-900 text-sm">{policy.MinValidityHours} giờ</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-lg p-2.5 border border-blue-100/60 flex flex-col justify-between">
                      <span className="text-gray-500 flex items-center gap-1 mb-1">
                        <lucideReact.Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Thời gian lưu tối đa
                      </span>
                      <span className="font-bold text-gray-900 text-sm">{policy.MaxValidityDays} ngày</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-sm">
                  <lucideReact.AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handlePreSubmit} className="space-y-4">
                {/* File */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chọn file</label>
                  <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer relative bg-gray-50/50 transition-colors">
                    <input
                      type="file"
                      required
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <lucideReact.UploadCloud className="w-9 h-9 text-gray-400 mx-auto mb-2" />
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-sm">
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

                {/* Quyền truy cập */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Quyền truy cập</p>
                    <p className="text-xs text-gray-500 mt-0.5">{isPublic ? "Công khai (Bất kỳ ai có link đều xem được)" : "Riêng tư (Chỉ email trong danh sách người nhận)"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPublic ? "bg-blue-600" : "bg-gray-300"
                      }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
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
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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

                {/* Chia sẻ với người dùng cụ thể */}
                {!isPublic && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chia sẻ với người dùng cụ thể</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={sharedEmailInput}
                        onChange={(e) => setSharedEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl cursor-pointer transition-colors"
                      >
                        Thêm
                      </button>
                    </div>
                    {sharedWith.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {sharedWith.map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
                            {email}
                            <button type="button" onClick={() => handleRemoveEmail(email)} className="font-bold ml-1 hover:text-red-500 cursor-pointer">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 cursor-pointer transition-colors"
                  >
                    {loading ? "Đang xử lý..." : "Tiếp tục"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Xác nhận */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600 pb-2 border-b border-gray-100">
                <lucideReact.AlertTriangle className="w-6 h-6" />
                <h4 className="text-lg font-bold text-gray-900">Xác nhận thông tin tải lên</h4>
              </div>

              {/* Hộp cảnh báo */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <lucideReact.AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Lưu ý quan trọng:
                </p>
                <p>
                  Các cài đặt cho file sau khi tải lên sẽ <b className="underline">không thể chỉnh sửa</b>. Vui lòng kiểm tra kỹ thông tin trước khi upload
                </p>
              </div>

              {/* Bảng tóm tắt */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-sm max-h-[calc(70vh-140px)] overflow-y-auto">
                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    Tên file:
                  </span>
                  <span className="font-semibold text-gray-900 truncate max-w-60">{file?.name}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Dung lượng file:</span>
                  <span className="font-semibold text-gray-900">{formatFileSize(file?.size)}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Quyền truy cập:</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    {isPublic ? (
                      <span className="text-blue-600 flex items-center gap-1">Công khai</span>
                    ) : (
                      <span className="text-purple-600 flex items-center gap-1">Riêng tư</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Mật khẩu bảo vệ:</span>
                  <span className="font-semibold text-gray-900">
                    {password ? <span className="text-green-600 flex items-center gap-1">Đã cài đặt</span> : "Không có"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Hiệu lực từ:</span>
                  <span className="font-semibold text-gray-900">
                    {availableFrom ? new Date(availableFrom).toLocaleString("vi-VN") : "Ngay khi tải lên"}
                  </span>
                </div>

                <div className={`flex justify-between items-center py-1 ${!isPublic ? "border-b border-gray-200/60" : ""}`}>
                  <span className="text-gray-500">Hết hạn vào:</span>
                  <span className="font-semibold text-gray-900">
                    {availableTo ? new Date(availableTo).toLocaleString("vi-VN") : `Mặc định (${policy?.DefaultValidityDays || 7} ngày)`}
                  </span>
                </div>

                {/* Danh sách người nhận */}
                {!isPublic && (
                  <div className="py-2 space-y-1.5">
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <lucideReact.Users className="w-4 h-4 text-gray-400" /> Danh sách người nhận:
                      </span>
                      <span className="font-semibold text-gray-900">
                        {sharedWith.length > 0 ? `${sharedWith.length} email` : "Chưa có"}
                      </span>
                    </div>

                    {sharedWith.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                        {sharedWith.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-medium shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {email}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 italic">
                        Chưa có người nhận nào trong danh sách
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium cursor-pointer transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmedUpload}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 cursor-pointer transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}