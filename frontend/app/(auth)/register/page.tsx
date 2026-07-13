"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { authService } from "@/services/auth";
import Link from "next/link";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(5);

  const handleRegister = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không trùng khớp.");
        return;
    }

    setLoading(true);

    try {
      const data = await authService.register({ username, email, password });
      
      setSuccess(data.message);
      
      let timeLeft = 5;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.href = "/login";
        }
      }, 1000);
      
    } catch (err: any) {
        const backendError = err.response?.data?.message;

        if (backendError && typeof backendError === "object") {
            const firstKey = Object.keys(backendError)[0];
            setError(backendError[firstKey]);
        } else if (typeof backendError === "string") {
            setError(backendError);
        } else {
            setError("Đăng ký thất bại. Vui lòng thử lại.");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 text-gray-900">
      <form onSubmit={handleRegister} className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-black">Đăng ký tài khoản mới</h2>
          <p className="text-sm text-gray-500">Bắt đầu chia sẻ file của bạn với File Sharing.</p>
        </div>
        
        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 text-center font-medium">
            {error}
          </div>
        )}

        {/* Thông báo thành công nếu có */}
        {success && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-600 text-center font-medium">
            {success}. Tự động chuyển hướng sang trang đăng nhập sau <span className="font-bold text-sm text-green-700">{countdown}</span> giây.
          </div>
        )}

        <div className="space-y-4">
          {/* Ô nhập Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên tài khoản</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Nhập tên tài khoản của bạn"
              required 
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors" 
            />
          </div>

          {/* Ô nhập Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Nhập email của bạn"
              required 
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors" 
            />
          </div>
          
          {/* Ô nhập Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                required
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
          </div>

          {/* Ô nhập Xác nhận mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Nhập lại mật khẩu của bạn"
                required 
                className="w-full rounded-xl border border-gray-300 bg-white p-3 pr-11 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Ẩn/Hiện cả hai mật khẩu"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Nút bấm Submit */}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-600/10 disabled:bg-gray-400 cursor-pointer"
        >
          {loading ? "Đang xử lý..." : "Đăng ký ngay"}
        </button>

        {/* Nút quay lại trang Đăng nhập */}
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Đã có tài khoản?{" "}
            <Link 
              href="/login" 
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-4"
            >
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
