"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setErrorMsg("");
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5 animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-none">Xác thực 2 lớp</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Tài khoản của bạn đã bật bảo mật 2 lớp. Hãy mở ứng dụng xác thực trên điện thoại và nhập mã 6 số:
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              Nhập mã xác thực (6 chữ số)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="VD: 123456"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-center font-mono tracking-widest transition-colors"
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xác nhận</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}