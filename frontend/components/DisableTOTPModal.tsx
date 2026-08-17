"use client";

import { useState } from "react";
import { authService } from "@/services/auth";
import { X, ShieldAlert, Loader2, AlertCircle } from "lucide-react";

interface DisableTOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisableTOTPModal({ isOpen, onClose, onSuccess }: DisableTOTPModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      await authService.disableTOTP(code);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Mã TOTP không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-gray-900">Tắt xác thực 2 lớp (2FA)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDisable} className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            Để tắt xác thực 2 bước, vui lòng nhập mã TOTP 6 chữ số hiện tại từ ứng dụng xác thực của bạn:
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full text-center tracking-[0.5em] font-mono text-xl py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-600"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-red-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận tắt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}