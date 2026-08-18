"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { X, ShieldCheck, Loader2, AlertCircle, Copy, Check } from "lucide-react";

interface EnableTOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnableTOTPModal({ isOpen, onClose, onSuccess }: EnableTOTPModalProps) {
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initSetup();
    } else {
      setCode("");
      setErrorMsg("");
      setSetupData(null);
    }
  }, [isOpen]);

  const initSetup = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await authService.setupTOTP();
      setSetupData(res.totpSetup);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể tạo mã thiết lập 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    try {
      setVerifying(true);
      setErrorMsg("");
      await authService.verifyTOTP(code);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn.");
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">Bật xác thực 2 lớp (2FA)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-center">
          {loading ? (
            <div className="py-12 text-gray-400 animate-pulse font-medium text-sm">Đang tạo mã QR...</div>
          ) : setupData ? (
            <>
              <p className="text-xs text-gray-500 text-left">
                Quét mã QR bằng ứng dụng Authenticator (Google Authenticator, Authy...) hoặc nhập Secret key:
              </p>

              {/* QR Code */}
              <div className="flex justify-center p-3 bg-white border border-gray-200 rounded-2xl w-fit mx-auto shadow-xs">
                <img src={setupData.qrCode} alt="TOTP QR Code" className="w-44 h-44 rounded-lg" />
              </div>

              {/* Secret Key */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-mono text-gray-700 font-semibold">{setupData.secret}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.secret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nhập mã 6 số */}
              <form onSubmit={handleVerify} className="space-y-3 pt-2">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập 6 chữ số"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                  required
                />
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác minh & Kích hoạt"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-sm text-red-500">{errorMsg || "Không thể kết nối dịch vụ 2FA."}</div>
          )}
        </div>
      </div>
    </div>
  );
}