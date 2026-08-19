"use client";

import { useEffect, useState } from "react";
import { fileService } from "@/services/file";
import { formatMimeType, formatFileSize, formatDateTime } from "@/utils/format";
import { copyToClipboard } from "@/utils/copy";
import * as lucideReact from "lucide-react";

interface FileInfoModalProps {
    fileId: string | null;
    onClose: () => void;
}

export default function FileInfoModal({ fileId, onClose }: FileInfoModalProps) {
    const [activeTab, setActiveTab] = useState<"info" | "stats" | "history">("info");
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [fileDetail, setFileDetail] = useState<any>(null);
    const [fileStats, setFileStats] = useState<any>(null);
    const [historyData, setHistoryData] = useState<any>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!fileId) return;
        setHistoryPage(1);
        loadAllDetails(fileId);
    }, [fileId]);

    const loadAllDetails = async (id: string) => {
        try {
            setLoading(true);
            const [infoRes, statsRes, histRes] = await Promise.allSettled([
                fileService.getFileInfo(id),
                fileService.getFileStats(id),
                fileService.getFileDownloadHistory(id, { page: 1, limit: 10 }),
            ]);

            if (infoRes.status === "fulfilled") setFileDetail(infoRes.value.file);
            if (statsRes.status === "fulfilled") setFileStats(statsRes.value.statistics);
            if (histRes.status === "fulfilled") setHistoryData(histRes.value);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryPage = async (page: number) => {
        if (!fileId) return;
        try {
            setHistoryLoading(true);
            const res = await fileService.getFileDownloadHistory(fileId, { page, limit: 10 });

            if (res) {
                setHistoryData({
                    ...res,
                    history: Array.isArray(res.history) ? res.history : [],
                    pagination: res.pagination || { currentPage: page, totalPages: 1, totalRecords: 0, limit: 10 }
                });
                setHistoryPage(page);
            }
        } catch (err: any) {
            console.error("Lỗi khi tải trang lịch sử: ", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    if (!fileId) return null;

    const handleCopyLink = async () => {
        if (!fileDetail?.shareToken) return;
        const url = `${window.location.origin}/f/${fileDetail.shareToken}`;
        const ok = await copyToClipboard(url);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatLastDownloadedAt = (dateStr?: string, downloadCount?: number) => {
        if (!dateStr || Number(downloadCount || 0) === 0) return "Chưa có lượt tải nào";
        return formatDateTime(dateStr);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl border border-gray-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <lucideReact.Info className="w-4 h-4" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate leading-tight" title={fileDetail?.fileName}>
                            {fileDetail?.fileName || "Thông tin file"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors shrink-0"
                        title="Đóng"
                    >
                        <lucideReact.X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-100 px-4 sm:px-6 bg-gray-50/50 overflow-x-auto whitespace-nowrap scrollbar-none">
                    <button
                        onClick={() => setActiveTab("info")}
                        className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${activeTab === "info" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        <lucideReact.Info className="w-4 h-4" /> Chi tiết File
                    </button>
                    <button
                        onClick={() => setActiveTab("stats")}
                        className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${activeTab === "stats" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        <lucideReact.BarChart2 className="w-4 h-4" /> Thống kê lượt tải
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        <lucideReact.History className="w-4 h-4" /> Lịch sử tải xuống
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 max-h-[calc(80vh-140px)] overflow-y-auto text-sm text-gray-700">
                    {loading ? (
                        <div className="py-12 text-center text-gray-400 animate-pulse font-medium text-sm">Đang tải dữ liệu...</div>
                    ) : (
                        <>
                            {/* Thông tin chi tiết */}
                            {activeTab === "info" && fileDetail && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50/50 p-4.5 rounded-2xl border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                                                {fileDetail.owner?.username?.charAt(0).toUpperCase() || "A"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 text-sm">
                                                        {fileDetail.owner?.username || "Ẩn danh"}
                                                    </span>
                                                    {fileDetail.owner?.role && (
                                                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md uppercase ${fileDetail.owner.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                            }`}>
                                                            {fileDetail.owner.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <lucideReact.Mail className="w-3.5 h-3.5 text-gray-400" />
                                                    {fileDetail.owner?.email || "Không có email"}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-blue-700 font-semibold bg-blue-100/60 px-2.5 py-1 rounded-lg">
                                            Chủ sở hữu
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3.5 bg-gray-50 p-4.5 rounded-2xl border border-gray-200">
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-0.5">Dung lượng:</span>
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {formatFileSize(fileDetail.fileSize)} ({fileDetail.fileSize || 0} bytes)
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-0.5">Định dạng:</span>
                                            <span className="font-semibold text-gray-900 text-sm" title={fileDetail.mimeType}>
                                                {formatMimeType(fileDetail.mimeType, fileDetail.fileName)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-0.5">Quyền truy cập:</span>
                                            <span className="font-semibold text-gray-900 text-sm">{fileDetail.isPublic ? "Công khai" : "Riêng tư"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-0.5">Mật khẩu bảo vệ:</span>
                                            <span className="font-semibold text-gray-900 text-sm">{fileDetail.hasPassword ? "Đã cài đặt" : "Không có"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-0.5">Ngày tải lên:</span>
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {formatDateTime(fileDetail.createdAt)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-0.5">Hiệu lực từ:</span>
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {fileDetail.availableFrom ? formatDateTime(fileDetail.availableFrom) : "Ngay khi tạo"}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-500 block text-xs mb-0.5">Hết hạn lúc:</span>
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {fileDetail.availableTo ? formatDateTime(fileDetail.availableTo) : "Vĩnh viễn"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Danh sách người dùng được chia sẻ */}
                                    <div className="bg-gray-50 p-4.5 rounded-2xl border border-gray-200 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                                <lucideReact.Users className="w-4 h-4 text-blue-600" /> Danh sách tài khoản được chia sẻ:
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {fileDetail.isPublic
                                                    ? "Công khai"
                                                    : `${fileDetail.sharedWith?.length ?? 0} người dùng`}
                                            </span>
                                        </div>

                                        {fileDetail.sharedWith && fileDetail.sharedWith.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                                                {fileDetail.sharedWith.map((email: string) => (
                                                    <span
                                                        key={email}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-blue-700 border border-blue-100 rounded-lg text-xs font-medium shadow-xs"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        {email}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic pt-1">
                                                {fileDetail.isPublic
                                                    ? "File ở chế độ công khai (mọi người có liên kết đều truy cập được)"
                                                    : "Chưa cấu hình cấp quyền cho người dùng cụ thể nào"}
                                            </p>
                                        )}
                                    </div>

                                    {/* Share link */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                                            Link chia sẻ
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={`${window.location.origin}/f/${fileDetail.shareToken}`}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyLink}
                                                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                                            >
                                                {copied ? <lucideReact.Check className="w-4 h-4" /> : <lucideReact.Copy className="w-4 h-4" />}
                                                {copied ? "Đã chép" : "Sao chép"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Thống kê download */}
                            {activeTab === "stats" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100">
                                            <span className="text-gray-600 block text-xs font-medium mb-1">Tổng số lượt tải:</span>
                                            <span className="text-3xl font-bold text-blue-700">{fileStats?.downloadCount ?? 0}</span>
                                        </div>
                                        <div className="bg-purple-50/70 p-5 rounded-2xl border border-purple-100">
                                            <span className="text-gray-600 block text-xs font-medium mb-1">Số người tải (đã đăng nhập):</span>
                                            <span className="text-3xl font-bold text-purple-700">{fileStats?.uniqueDownloaders ?? 0}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                        <span className="text-gray-500 block text-xs mb-0.5">Lượt tải xuống gần nhất:</span>
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {formatLastDownloadedAt(fileStats?.lastDownloadedAt, fileStats?.downloadCount)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Lịch sử download */}
                            {activeTab === "history" && (
                                <div className="space-y-3">
                                    {historyLoading ? (
                                        <div className="py-8 text-center text-gray-400 animate-pulse font-medium text-sm">Đang tải lịch sử...</div>
                                    ) : historyData?.history && historyData.history.length > 0 ? (
                                        <>
                                            <div className="space-y-2.5 max-h-95 overflow-y-auto pr-1">
                                                {historyData.history.map((row: any) => (
                                                    <div
                                                        key={row.id}
                                                        className="p-3.5 bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                                                    >
                                                        {/* Thông tin người tải */}
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0 shadow-xs">
                                                                {row.downloader?.username?.charAt(0).toUpperCase() || "?"}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-gray-900 text-sm truncate">
                                                                    {row.downloader?.username || "Ẩn danh"}
                                                                </p>
                                                                <p className="text-xs text-gray-500 truncate">
                                                                    {row.downloader?.email || formatDateTime(row.downloadedAt)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Thời gian và Trạng thái */}
                                                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60 shrink-0">
                                                            <div className="text-left sm:text-right">
                                                                <span className="text-xs text-gray-500 block font-medium">
                                                                    {formatDateTime(row.downloadedAt)}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                {row.downloadCompleted ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-200">
                                                                        <lucideReact.CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hoàn tất
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200">
                                                                        <lucideReact.XCircle className="w-3.5 h-3.5 text-red-600" /> Gián đoạn
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Phân trang */}
                                            {historyData.pagination && historyData.pagination.totalPages > 1 && (
                                                <div className="flex items-center justify-between pt-3 px-1 text-xs text-gray-600 border-t border-gray-100">
                                                    <span>
                                                        Trang <b className="text-gray-900">{historyData.pagination.currentPage}</b> / <b className="text-gray-900">{historyData.pagination.totalPages}</b> (Tổng {historyData.pagination.totalRecords} lượt tải)
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            disabled={historyPage <= 1}
                                                            onClick={() => fetchHistoryPage(historyPage - 1)}
                                                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                                            title="Trang trước"
                                                        >
                                                            <lucideReact.ChevronLeft className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={historyPage >= historyData.pagination.totalPages}
                                                            onClick={() => fetchHistoryPage(historyPage + 1)}
                                                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                                            title="Trang sau"
                                                        >
                                                            <lucideReact.ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-10 text-gray-400 text-sm">
                                            Chưa có lịch sử tải về cho file này
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-3.5 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                    >
                        Đóng
                    </button>
                </div>

            </div>
        </div>
    );
}