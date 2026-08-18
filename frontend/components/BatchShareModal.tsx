"use client";

import { useState } from "react";
import axios from "axios";
import { X, Share2, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BatchShareModalProps {
  fileIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchShareModal({ fileIds, isOpen, onClose, onSuccess }: BatchShareModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const userList = email.split(",").map((e) => e.trim()).filter(Boolean);

      // 🌟 KHỚP 100% VỚI SHAREMODAL: /files/share/{fileId} và body { sharedWith }
      await Promise.all(
        fileIds.map((fileId) =>
          axios.post(
            `http://localhost:8080/files/share/${fileId}`,
            { sharedWith: userList },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      setMessage({
        type: "success",
        text: `Đã chia sẻ thành công ${fileIds.length} tập tin cho ${email}!`,
      });
      setEmail("");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Lỗi chia sẻ:", err);
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Không thể chia sẻ tập tin. Vui lòng kiểm tra lại email người nhận!";
      setMessage({
        type: "error",
        text: serverMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
            <Share2 className="w-5 h-5 text-blue-600" />
            <span>Chia sẻ {fileIds.length} tập tin</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 border ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
              Email / Gmail người nhận
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="user1@gmail.com, user2@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Người nhận sẽ thấy toàn bộ {fileIds.length} file này trong mục <strong>Shared With Me</strong>.
            </p>
          </div>

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
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Chia sẻ ngay"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}