"use client";

import { useState } from "react";
import { authService } from "@/services/auth";
import { ShieldCheck, Loader2, AlertCircle, X } from "lucide-react";

interface TOTPLoginModalProps {
  isOpen: boolean;
  cid: string;
  onSuccess: (accessToken: string) => void;
  onCancel: () => void;
}

export default function TOTPLoginModal({ isOpen, cid, onSuccess, onCancel }: TOTPLoginModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const res = await authService.verifyLoginTOTP({ cid, code });
      onSuccess(res.accessToken);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Mã xác thực không đúng hoặc phiên đăng nhập đã hết hạn.";
      setErrorMsg(typeof msg === "string" ? msg : "Mã xác thực không hợp lệ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Xác thực 2 bước (2FA)</h3>
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Tài khoản của bạn đã bật bảo mật 2 lớp. Hãy mở ứng dụng xác thực trên điện thoại và nhập mã 6 số:
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="py-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center tracking-[0.6em] font-mono text-2xl py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}