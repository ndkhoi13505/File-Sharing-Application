"use client";

import { useState } from "react";
import { authService } from "@/services/auth";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.login({ email, password });
      
      // Khớp chính xác với JSON trả về: data.accessToken và data.user
      if (data?.accessToken) {
        localStorage.setItem("token", data.accessToken); // Lưu token cho Interceptor xài
        localStorage.setItem("user", JSON.stringify(data.user)); // Lưu thông tin user để hiển thị UI
        
        // Đăng nhập xong, chuyển hướng qua trang dashboard
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      // Đọc thông báo lỗi từ backend trả về nếu có
      setError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 text-gray-900">

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
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
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Nhập mật khẩu của bạn"
              required 
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-brand-main focus:outline-none focus:ring-1 focus:ring-brand-main transition-colors" 
            />
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
  );
}
