"use client";

import { useState, useEffect, useRef } from "react";
import { authService } from "@/services/auth";
import { User } from "@/types";
import UserAvatar from "@/components/UserAvatar";
import { 
  Camera, 
  Mail, 
  ShieldAlert, 
  User as UserIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Lock 
} from "lucide-react";
import axios from "axios";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Đổi mật khẩu State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await authService.getCurrentUser();
      setUser(res.user);
    } catch (err) {
      console.error("Lỗi lấy thông tin:", err);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý chọn ảnh từ thư mục máy tính
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Tạo preview ngay lập tức trên UI
    const previewUrl = URL.createObjectURL(file);
    setUser((prev: any) => ({ ...prev, avatarUrl: previewUrl }));

    // Gửi file ảnh lên Backend
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploadingAvatar(true);
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8080/user/avatar", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setAvatarMsg("Cập nhật ảnh đại diện thành công!");
      setTimeout(() => setAvatarMsg(""), 3000);
    } catch (err) {
      alert("Không thể tải ảnh đại diện lên server!");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Xử lý submit đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    // 1. Kiểm tra xác nhận mật khẩu
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Mật khẩu mới và xác nhận mật khẩu không khớp!" });
      return;
    }

    // 2. Bắt lỗi trùng mật khẩu cũ ngay tại client
    if (oldPassword === newPassword) {
      setPasswordMsg({ type: "error", text: "Mật khẩu mới không được trùng với mật khẩu hiện tại!" });
      return;
    }

    // 3. Kiểm tra độ dài tối thiểu
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Mật khẩu mới phải có tối thiểu 8 ký tự!" });
      return;
    }

    try {
      setSubmittingPassword(true);
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:8080/auth/password/change",
        { 
          old_password: oldPassword, 
          new_password: newPassword 
        },
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );

      // 🌟 THÔNG BÁO VÀ KÍCH HOẠT CƯỠNG CHẾ LOGOUT
      setPasswordMsg({ 
        type: "success", 
        text: "Đổi mật khẩu thành công! Đang đăng xuất và chuyển về trang đăng nhập..." 
      });
      
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Đợi 2 giây để người dùng đọc thông báo rồi xóa phiên và chuyển trang
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userID");
        window.location.href = "/login";
      }, 2000);

    } catch (err: any) {
      console.warn("Lỗi đổi mật khẩu từ Server:", err.response?.data);

      let serverMsg = "Mật khẩu hiện tại không chính xác!";
      const resData = err.response?.data;

      if (typeof resData === "string") {
        serverMsg = resData;
      } else if (typeof resData?.message === "string") {
        serverMsg = resData.message;
      } else if (typeof resData?.error === "string") {
        serverMsg = resData.error;
      }

      setPasswordMsg({ type: "error", text: serverMsg });
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Đang tải thông tin tài khoản...</div>;
  }

  const displayName = (user as any)?.fullName || (user as any)?.fullname || user?.username || "Chưa thiết lập";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
        <p className="text-sm text-gray-500 mt-0.5">Quản lý thông tin cá nhân và thiết lập bảo mật hệ thống.</p>
      </div>

      {/* THÔNG BÁO AVATAR */}
      {avatarMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{avatarMsg}</span>
        </div>
      )}

      {/* CARD 1: THÔNG TIN CÁ NHÂN & ẢNH ĐẠI DIỆN */}
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Thông tin cá nhân & Ảnh đại diện
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
          {/* Avatar + Nút Camera */}
          <div className="relative group">
            <UserAvatar 
              name={user?.username} 
              avatarUrl={(user as any)?.avatarUrl} 
              size="xl" 
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg border-2 border-white transition-transform transform active:scale-95 cursor-pointer"
              title="Đổi ảnh đại diện"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-xl font-bold text-gray-900 capitalize">{user?.username}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400">Định dạng hỗ trợ: JPG, PNG hoặc WEBP (Tối đa 2MB)</p>
          </div>
        </div>

        {/* 3 Ô THÔNG TIN CHI TIẾT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Ô 1: Tên tài khoản */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
              Tên tài khoản
            </span>
            <span className="font-semibold text-gray-800 block truncate capitalize">
              {displayName}
            </span>
          </div>

          {/* Ô 2: Email */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Địa chỉ Email
            </span>
            <span className="font-semibold text-gray-800 block truncate">
              {user?.email}
            </span>
          </div>

          {/* Ô 3: 2FA */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
                Xác thực 2 yếu tố (2FA)
              </span>
              <span className="font-semibold text-gray-800">
                {user?.totpEnabled ? "Đã kích hoạt" : "Chưa kích hoạt"}
              </span>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              Khuyên dùng
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: ĐỔI MẬT KHẨU */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4">
          <KeyRound className="w-5 h-5 text-blue-600" /> Đổi mật khẩu
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          {passwordMsg && (
            <div className={`p-3.5 rounded-2xl text-sm flex items-center gap-2.5 border ${
              passwordMsg.type === "success" 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {passwordMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submittingPassword}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submittingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cập nhật mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}