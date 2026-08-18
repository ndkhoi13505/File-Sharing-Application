"use client";

import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { authService } from "@/services/auth";
import TOTPLoginModal from "@/components/TOTPLoginModal";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // TOTP State
  const [totpCid, setTotpCid] = useState<string | null>(null);
  const [isTotpOpen, setIsTotpOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.login({ email, password });

      // 1. Kiểm tra nếu là TOTPRequiredResponse
      if ("requireTOTP" in data && data.requireTOTP) {
        setTotpCid(data.cid);
        setIsTotpOpen(true);
        return;
      }

      // 2. Ngược lại TypeScript sẽ nhận diện data là LoginSuccessResponse
      if ("accessToken" in data && data.accessToken) {
        localStorage.setItem("token", data.accessToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSuccess = (accessToken: string) => {
    localStorage.setItem("token", accessToken);
    setIsTotpOpen(false);
    window.location.href = "/dashboard";
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 text-gray-900">
      <div className="w-full max-w-md space-y-3">
        {/* Nút quay lại trang chính */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>

        <form onSubmit={handleLogin} className="w-full space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-main">Đăng nhập</h2>
            <p className="text-sm text-gray-500">Đăng nhập tài khoản của bạn.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 text-center font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn"
                required
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-brand-main focus:outline-none focus:ring-1 focus:ring-brand-main transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 pr-11 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-600/10 disabled:bg-gray-400 cursor-pointer"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-semibold text-brand-main hover:text-brand-hover transition-colors underline underline-offset-4"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Modal nhập mã TOTP khi tài khoản có bật 2FA */}
      {totpCid && (
        <TOTPLoginModal
          isOpen={isTotpOpen}
          cid={totpCid}
          onSuccess={handleTotpSuccess}
          onCancel={() => {
            setIsTotpOpen(false);
            setTotpCid(null);
          }}
        />
      )}
    </div>
  );
}