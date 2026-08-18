export const formatMimeType = (mimeType?: string, fileName?: string): string => {
  const mime = mimeType?.toLowerCase() || "";
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";

  if (mime.includes("wordprocessingml") || ext === "docx") return "Word (.docx)";
  if (mime.includes("msword") || ext === "doc") return "Word (.doc)";
  if (mime.includes("spreadsheetml") || ext === "xlsx") return "Excel (.xlsx)";
  if (mime.includes("ms-excel") || ext === "xls") return "Excel (.xls)";
  if (mime.includes("presentationml") || ext === "pptx") return "PowerPoint (.pptx)";
  if (mime.includes("ms-powerpoint") || ext === "ppt") return "PowerPoint (.ppt)";
  if (mime === "application/pdf" || ext === "pdf") return "PDF";
  if (mime === "text/plain" || ext === "txt") return "Văn bản (.txt)";
  if (mime === "text/csv" || ext === "csv") return "CSV";

  if (mime === "image/png" || ext === "png") return "Hình ảnh (PNG)";
  if (mime === "image/jpeg" || ext === "jpg" || ext === "jpeg") return "Hình ảnh (JPEG)";
  if (mime === "image/webp" || ext === "webp") return "Hình ảnh (WebP)";
  if (mime === "image/svg+xml" || ext === "svg") return "Hình ảnh (SVG)";
  if (mime === "image/gif" || ext === "gif") return "Ảnh động (GIF)";

  if (mime.startsWith("video/") || ["mp4", "mkv", "webm", "mov", "avi"].includes(ext)) {
    return `Video (.${ext || "mp4"})`;
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac"].includes(ext)) {
    return `Âm thanh (.${ext || "mp3"})`;
  }

  if (mime.includes("zip") || ext === "zip") return "Tập tin nén (.zip)";
  if (mime.includes("x-rar") || ext === "rar") return "Tập tin nén (.rar)";
  if (ext === "7z" || mime.includes("7z")) return "Tập tin nén (.7z)";
  if (mime.includes("tar") || ext === "tar" || ext === "gz") return "Tập tin nén (.tar.gz)";

  if (ext) return `Tập tin .${ext.toUpperCase()}`;
  return mime || "Tập tin nhị phân";
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return "Không xác định";
  const date = new Date(dateStr);
  if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
    return "Không xác định";
  }
  return date.toLocaleString("vi-VN");
};
