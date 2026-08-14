"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { 
  FileText, 
  Download, 
  Eye, 
  Lock, 
  ArrowLeft, 
  FileSpreadsheet, 
  Video, 
  Music, 
  FileCheck,
  AlertCircle
} from "lucide-react";

export default function PreviewPage() {
  const params = useParams();
  const shareToken = params?.shareToken || params?.id;

  const [fileInfo, setFileInfo] = useState<any>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (shareToken) {
      loadFile(password);
    }
  }, [shareToken]);

  const loadFile = async (pwd?: string) => {
    try {
      setLoading(true);
      setErrorMsg("");

      // 1. Tải blob dữ liệu file từ Backend
      const res = await axios.get(`http://localhost:8080/files/${shareToken}/preview`, {
        params: pwd ? { password: pwd } : {},
        headers: pwd ? { "X-File-Password": pwd } : {},
        responseType: "blob",
      });

      const contentType = String(res.headers["content-type"] || "application/octet-stream");
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      setFileBlobUrl(url);

      // 2. Tách tên file từ Content-Disposition
      let fileName = `file-${shareToken}`;
      const disposition = res.headers["content-disposition"];
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      setFileInfo({
        name: fileName,
        type: contentType,
        size: res.data.size,
      });
      setNeedsPassword(false);
    } catch (err: any) {
      console.error("Lỗi preview:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setNeedsPassword(true);
        if (pwd) setErrorMsg("Mật khẩu không chính xác!");
      } else {
        setErrorMsg("Không thể tải tập tin. Vui lòng kiểm tra lại quyền truy cập!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileBlobUrl) return;
    const a = document.createElement("a");
    a.href = fileBlobUrl;
    a.download = fileInfo?.name || "downloaded-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Helper nhận diện phân loại định dạng file
  const getFileType = (mime: string = "", name: string = "") => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (mime.startsWith("video/") || ["mp4", "webm", "mkv", "mov"].includes(ext)) return "video";
    if (mime.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(ext)) return "audio";
    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (["doc", "docx"].includes(ext) || mime.includes("word")) return "word";
    if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("excel") || mime.includes("sheet")) return "excel";
    return "binary";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* HEADER THANH CÔNG CỤ TRÊN CÙNG */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.close()} 
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-sm sm:text-base max-w-md truncate text-slate-200">
              {fileInfo?.name || "Xem trước tập tin"}
            </h1>
            {fileInfo?.size && (
              <p className="text-xs text-slate-400">
                {(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>

        {fileBlobUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-600/30"
          >
            <Download className="w-4 h-4" /> Tải về máy
          </button>
        )}
      </header>

      {/* KHUNG PREVIEW TO TOÀN MÀN HÌNH */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Đang giải mã và hiển thị tập tin...</p>
          </div>
        ) : needsPassword ? (
          /* FORM NHẬP MẬT KHẨU FILE PRIVATE */
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Tập tin được bảo vệ</h2>
              <p className="text-xs text-slate-400 mt-1">Vui lòng nhập mật khẩu để mở khóa và xem nội dung.</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); loadFile(password); }} className="space-y-4">
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Mở khóa tập tin
              </button>
            </form>
          </div>
        ) : fileBlobUrl ? (
          /* KHU VỰC HIỂN THỊ NỘI DUNG TỪNG ĐỊNH DẠNG */
          <div className="w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center">
            
            {/* 1. HÌNH ẢNH */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "image" && (
              <img
                src={fileBlobUrl}
                alt={fileInfo?.name}
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            )}

            {/* 2. VIDEO (MP4, WEBM, MOV) */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "video" && (
              <video
                src={fileBlobUrl}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-2xl shadow-2xl border border-slate-800 bg-black"
              />
            )}

            {/* 3. ÂM THANH (MP3, WAV) */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "audio" && (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full text-center space-y-4">
                <Music className="w-12 h-12 text-blue-400 mx-auto" />
                <p className="font-medium text-slate-200">{fileInfo?.name}</p>
                <audio src={fileBlobUrl} controls className="w-full" />
              </div>
            )}

            {/* 4. TÀI LIỆU PDF */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "pdf" && (
              <iframe
                src={fileBlobUrl}
                className="w-full h-[80vh] rounded-2xl border border-slate-800 shadow-2xl bg-white"
              />
            )}

            {/* 5. TÀI LIỆU WORD */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "word" && (
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-xl w-full text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-inner">
                  <FileText className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{fileInfo?.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">Tài liệu Microsoft Word</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Định dạng DOCX cần phần mềm Word hoặc Google Docs trên máy để hiển thị đầy đủ bố cục.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
                >
                  <Download className="w-4 h-4" /> Tải về và mở bằng Word
                </button>
              </div>
            )}

            {/* 6. TÀI LIỆU EXCEL */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "excel" && (
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-xl w-full text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                  <FileSpreadsheet className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{fileInfo?.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">Bảng tính Microsoft Excel</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Tập tin chứa các trang tính, công thức và dữ liệu bảng.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-medium text-sm transition-all shadow-lg shadow-emerald-600/30"
                >
                  <Download className="w-4 h-4" /> Tải về và mở bằng Excel
                </button>
              </div>
            )}

            {/* 7. CÁC ĐỊNH DẠNG FILE KHÁC (ZIP, RAR, EXE...) */}
            {getFileType(fileInfo?.type, fileInfo?.name) === "binary" && (
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-xl w-full text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-slate-800 text-slate-300 rounded-3xl flex items-center justify-center mx-auto border border-slate-700">
                  <FileCheck className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{fileInfo?.name}</h2>
                  <p className="text-xs text-slate-400 mt-1">Tập tin nhị phân / Định dạng lưu trữ</p>
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-2xl font-medium text-sm transition-all"
                >
                  <Download className="w-4 h-4" /> Tải tập tin về máy
                </button>
              </div>
            )}

          </div>
        ) : null}
      </main>
    </div>
  );
}