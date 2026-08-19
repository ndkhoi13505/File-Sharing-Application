"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { copyToClipboard } from "@/utils/copy";
import * as lucideReact from "lucide-react";

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
      setErrorMsg(err.response?.data?.message || "Không thể tạo mã thiết lập 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async (secret: string) => {
    const ok = await copyToClipboard(secret);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setErrorMsg("Không thể sao chép mã khóa");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    try {
      setVerifying(true);
      setErrorMsg("");
      await authService.verifyTOTP(code);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn");
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-150 my-8">

        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <lucideReact.ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Kích hoạt xác thực 2 lớp (2FA)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <lucideReact.X className="w-5 h-5" />
          </button>
        </div>

        <div>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
              <lucideReact.Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Đang tạo mã bảo mật...</span>
            </div>
          ) : setupData ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Sử dụng ứng dụng xác thực như <span className="font-semibold text-gray-800">Google Authenticator</span> hoặc <span className="font-semibold text-gray-800">Authy</span> để quét mã QR phía dưới, hoặc nhập khoá bí mật thủ công
              </p>

              <div className="flex justify-center p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <img
                  src={setupData.qrCode}
                  alt="TOTP QR Code"
                  className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg object-contain bg-white p-1"
                />
              </div>

              {/* Khóa bí mật (Secret Key) */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Khóa bí mật (Secret key)
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1.5 pl-3">
                  <span className="font-mono text-gray-800 font-medium text-xs sm:text-sm select-all min-w-0 flex-1 truncate">
                    {setupData.secret}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopySecret(setupData.secret)}
                    className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${copied
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                  >
                    {copied ? <lucideReact.Check className="w-3.5 h-3.5" /> : <lucideReact.Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                  <lucideReact.AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4 pt-2 border-t border-gray-100">
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                    Nhập mã xác thực (6 chữ số)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="VD: 123456"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-center font-mono tracking-widest transition-colors"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={verifying || code.length !== 6}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {verifying && <lucideReact.Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Xác nhận</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">
              {errorMsg || "Không thể kết nối đến dịch vụ cấp mã bảo mật (2FA)"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}