"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/services/api-client";
import { formatMimeType } from "@/utils/format";
import * as lucideReact from "lucide-react";

interface PublicFileInfo {
  id: string;
  fileName: string;
  shareToken: string;
  status: "pending" | "active" | "expired";
  isPublic: boolean;
  hasPassword: boolean;
  fileSize: number;
  mimeType: string;
}

export default function SharedFilePage() {
  const params = useParams();
  const router = useRouter();
  const shareToken = (params?.shareToken || params?.id) as string;

  const [publicMeta, setPublicMeta] = useState<PublicFileInfo | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    availableFrom?: string;
    expiredAt?: string;
    hoursUntilAvailable?: number;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    if (shareToken) {
      initCheckFile();
    }
  }, [shareToken]);

  const initCheckFile = async () => {
    try {
      setLoading(true);
      setErrorStatus(null);
      setErrorDetails(null);

      let currentMeta: PublicFileInfo | null = null;
      try {
        const res = await apiClient.get<{ file: PublicFileInfo }>(`/files/${shareToken}`);
        if (res.data?.file) {
          currentMeta = res.data.file;
          setPublicMeta(res.data.file);
        }
      } catch (metaErr: any) {
        const status = metaErr.response?.status;
        if (status) {
          await handleApiError(metaErr, false, null);
          return;
        }
      }

      await loadPreviewContent(undefined, currentMeta);
    } catch (err: any) {
      await handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreviewContent = async (pwd?: string, metaOverride?: PublicFileInfo | null) => {
    try {
      setLoading(true);
      setPasswordError("");

      const headers: Record<string, string> = {};
      if (pwd) {
        headers["X-File-Password"] = pwd;
      }

      const res = await apiClient.get(`/files/${shareToken}/preview`, {
        headers,
        responseType: "blob",
      });

      setErrorStatus(null);
      setErrorDetails(null);
      setRequiresPassword(false);

      const activeMeta = metaOverride || publicMeta;
      const contentType = String(res.headers["content-type"] || activeMeta?.mimeType || "application/octet-stream");
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      setFileBlobUrl(url);

      let filename = activeMeta?.fileName;
      if (!filename) {
        const disposition = res.headers["content-disposition"];
        if (disposition) {
          const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
          const normalMatch = disposition.match(/filename="?([^";]+)"?/i);
          if (utf8Match && utf8Match[1]) {
            filename = decodeURIComponent(utf8Match[1]);
          } else if (normalMatch && normalMatch[1]) {
            filename = normalMatch[1];
          }
        }
      }

      setPublicMeta((prev) => ({
        id: prev?.id || shareToken,
        fileName: prev?.fileName || filename || `file-${shareToken}`,
        shareToken,
        status: prev?.status || "active",
        isPublic: prev?.isPublic ?? false,
        hasPassword: false,
        fileSize: prev?.fileSize || res.data.size,
        mimeType: prev?.mimeType || contentType,
      }));
    } catch (err: any) {
      await handleApiError(err, Boolean(pwd), metaOverride);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const headers: Record<string, string> = {};
      if (password) {
        headers["X-File-Password"] = password;
      }

      const res = await apiClient.get(`/files/${shareToken}/download`, {
        headers,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", publicMeta?.fileName || `download-${shareToken}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      await handleApiError(err, Boolean(password));
    } finally {
      setDownloading(false);
    }
  };

  const handleApiError = async (err: any, isPasswordSubmit = false, metaOverride?: PublicFileInfo | null) => {
    const status = err.response?.status;
    let data = err.response?.data;

    if (data instanceof Blob) {
      try {
        const text = await data.text();
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    const activeMeta = metaOverride || publicMeta;
    setErrorStatus(status);

    const errorMessage = data?.message || data?.error;

    if (status === 404) {
      setErrorDetails({ message: errorMessage || "Không tìm thấy file hoặc file đã bị xóa" });
    } else if (status === 410) {
      setErrorDetails({
        message: errorMessage || "File này đã hết hạn và không còn khả dụng",
        expiredAt: data?.expiredAt,
      });
    } else if (status === 423) {
      setErrorDetails({
        message: "File này chưa đến thời gian mở truy cập",
        availableFrom: data?.availableFrom,
        hoursUntilAvailable: data?.hoursUntilAvailable,
      });
    } else if (status === 401) {
      setErrorDetails({
        message: errorMessage || "File này ở chế độ riêng tư. Bạn cần đăng nhập tài khoản",
      });
    } else if (status === 403) {
      const errMsg = (errorMessage || "").toLowerCase();
      const isPasswordIssue =
        activeMeta?.hasPassword ||
        isPasswordSubmit ||
        errMsg.includes("password") ||
        errMsg.includes("mật khẩu");

      if (isPasswordIssue) {
        setRequiresPassword(true);
        if (isPasswordSubmit) {
          setPasswordError(errorMessage || "Mật khẩu không chính xác. Vui lòng thử lại");
        }
      } else {
        setErrorDetails({
          message: errorMessage || "Bạn không có quyền truy cập hoặc tải file này",
        });
      }
    } else {
      setErrorDetails({ message: errorMessage || "Đã xảy ra lỗi khi kết nối máy chủ" });
    }
  };

  const getFileType = (mime: string = "", name: string = "") => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
    if (mime.startsWith("video/") || ["mp4", "webm", "mkv", "mov"].includes(ext)) return "video";
    if (mime.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(ext)) return "audio";
    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (["doc", "docx"].includes(ext) || mime.includes("word")) return "word";
    if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("excel") || mime.includes("sheet")) return "excel";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
    return "binary";
  };

  const fileType = getFileType(publicMeta?.mimeType, publicMeta?.fileName);
  const isPreviewSupported = ["image", "video", "audio", "pdf"].includes(fileType);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="min-h-16 py-3 border-b border-gray-200 bg-white/90 backdrop-blur px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
            title="Quay lại"
          >
            <lucideReact.ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm sm:text-base text-gray-900 truncate" title={publicMeta?.fileName}>
              {publicMeta?.fileName || "Chi tiết file được chia sẻ"}
            </h1>
            {publicMeta?.fileSize ? (
              <p className="text-xs text-gray-500">
                {(publicMeta.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            ) : null}
          </div>
        </div>

        {fileBlobUrl && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {downloading ? <lucideReact.Loader2 className="w-4 h-4 animate-spin" /> : <lucideReact.Download className="w-4 h-4" />}
            <span>Tải về</span>
          </button>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <lucideReact.Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Đang kiểm tra bảo mật và tải file...</p>
          </div>
        ) : errorStatus && !requiresPassword ? (
          /* Khung hiển thị lỗi */
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="bg-white border border-gray-200 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-sm">
              {errorStatus === 404 && (
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
                  <lucideReact.FileQuestion className="w-7 h-7" />
                </div>
              )}
              {errorStatus === 410 && (
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                  <lucideReact.Clock className="w-7 h-7" />
                </div>
              )}
              {errorStatus === 423 && (
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                  <lucideReact.Clock className="w-7 h-7" />
                </div>
              )}
              {errorStatus === 401 && (
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100">
                  <lucideReact.LogIn className="w-7 h-7" />
                </div>
              )}
              {errorStatus === 403 && (
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
                  <lucideReact.ShieldAlert className="w-7 h-7" />
                </div>
              )}

              <h2 className="text-lg font-bold text-gray-900">
                {errorStatus === 404 ? "Không tìm thấy file" :
                  errorStatus === 410 ? "File đã hết hạn" :
                    errorStatus === 423 ? "File chưa mở" :
                      errorStatus === 401 ? "Yêu cầu đăng nhập tài khoản" : "Truy cập bị từ chối"}
              </h2>
              <p className="text-sm text-gray-600">{errorDetails?.message}</p>

              {errorStatus === 423 && errorDetails?.availableFrom && (
                <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 space-y-1.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Mở truy cập lúc:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(errorDetails.availableFrom).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  {errorDetails.hoursUntilAvailable !== undefined && (
                    <div className="flex justify-between items-center pt-1.5 border-t border-blue-100/80">
                      <span className="text-gray-500">Thời gian chờ:</span>
                      <span className="font-semibold text-blue-700">
                        {errorDetails.hoursUntilAvailable >= 24
                          ? `${(errorDetails.hoursUntilAvailable / 24).toFixed(0)} ngày`
                          : `${errorDetails.hoursUntilAvailable.toFixed(0)} giờ`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {errorStatus === 401 && (
                <button
                  onClick={() => router.push(`/login?redirect=/f/${shareToken}`)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              )}
            </div>
          </div>
        ) : requiresPassword && !fileBlobUrl ? (
          /* Mật khẩu */
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="bg-white border border-gray-200 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                <lucideReact.Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">File có mật khẩu bảo vệ</h2>
                <p className="text-xs text-gray-500 mt-1">Vui lòng nhập mật khẩu để xem nội dung</p>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2 text-left">
                  <lucideReact.AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); loadPreviewContent(password); }} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của file"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <lucideReact.EyeOff className="w-4 h-4" />
                    ) : (
                      <lucideReact.Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Mở khóa file
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Hiển thị nội dung file */
          <>
            {publicMeta && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <span className="text-xs text-gray-400 block mb-0.5">Định dạng file</span>
                  <span className="font-semibold text-sm text-gray-800 truncate block" title={publicMeta.mimeType}>
                    {formatMimeType(publicMeta.mimeType, publicMeta.fileName)}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs text-gray-400 block mb-0.5">Dung lượng file</span>
                  <span className="font-semibold text-sm text-gray-800 block truncate">
                    {publicMeta.fileSize ? `${(publicMeta.fileSize / (1024 * 1024)).toFixed(2)} MB` : "0 B"}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs text-gray-400 block mb-0.5">Quyền truy cập</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-sm text-gray-800 truncate">
                    {publicMeta.isPublic ? (
                      <span className="text-blue-600 flex items-center gap-1">Công khai</span>
                    ) : (
                      <span className="text-purple-600 flex items-center gap-1">Riêng tư</span>
                    )}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs text-gray-400 block mb-0.5">Trạng thái</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${publicMeta.status === "active" ? "bg-green-50 text-green-700 border border-green-200" :
                    publicMeta.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                    {publicMeta.status === "active" ? "Hoạt động" : publicMeta.status === "pending" ? "Chờ hiệu lực" : "Hết hạn"}
                  </span>
                </div>
              </div>
            )}

            {/* Preview hoặc download */}
            <div className="flex-1 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex items-center justify-center min-h-125">
              {fileBlobUrl && isPreviewSupported ? (
                fileType === "image" ? (
                  <img
                    src={fileBlobUrl}
                    alt={publicMeta?.fileName}
                    className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-md border border-gray-100"
                  />
                ) :
                  fileType === "video" ? (
                    <video
                      src={fileBlobUrl}
                      controls
                      autoPlay
                      className="w-full max-h-[70vh] rounded-2xl shadow-md border border-gray-200 bg-black"
                    />
                  ) :
                    fileType === "audio" ? (
                      <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-xs">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                          <lucideReact.Music className="w-7 h-7" />
                        </div>
                        <p className="font-bold text-gray-900 truncate">{publicMeta?.fileName}</p>
                        <audio src={fileBlobUrl} controls className="w-full" />
                      </div>
                    ) :
                      fileType === "pdf" ? (
                        <iframe
                          src={fileBlobUrl}
                          className="w-full h-[75vh] rounded-2xl border border-gray-200 shadow-sm"
                        />
                      ) : null
              ) : (
                <div className="text-center space-y-5 max-w-md p-8">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-200 shadow-xs">
                    {fileType === "excel" ? (
                      <lucideReact.FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                    ) : fileType === "word" ? (
                      <lucideReact.FileText className="w-10 h-10 text-blue-600" />
                    ) : fileType === "archive" ? (
                      <lucideReact.FileArchive className="w-10 h-10 text-amber-600" />
                    ) : (
                      <lucideReact.FileCheck className="w-10 h-10 text-gray-600" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{publicMeta?.fileName}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Định dạng này không hỗ trợ xem trước trên trình duyệt. Vui lòng tải file về thiết bị để xem.
                    </p>
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    {downloading ? <lucideReact.Loader2 className="w-4 h-4 animate-spin" /> : <lucideReact.Download className="w-4 h-4" />}
                    Tải về
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}