"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/auth";
import { User } from "@/types";
import UserAvatar from "@/components/UserAvatar";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import EnableTOTPModal from "@/components/EnableTOTPModal";
import DisableTOTPModal from "@/components/DisableTOTPModal";
import {
  Mail,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  KeyRound,
  Shield
} from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEnableTOTPOpen, setIsEnableTOTPOpen] = useState(false);
  const [isDisableTOTPOpen, setIsDisableTOTPOpen] = useState(false);

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

      {/* CARD 1: THÔNG TIN CÁ NHÂN */}
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Thông tin cá nhân
        </h2>

        <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
          <UserAvatar
            name={user?.username}
            avatarUrl={(user as any)?.avatarUrl}
            size="xl"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900 capitalize">{user?.username}</h3>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${user?.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                {user?.role}
              </span>
            </div>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* 2 Ô THÔNG TIN CHI TIẾT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
              Tên tài khoản
            </span>
            <span className="font-semibold text-gray-800 block truncate capitalize">
              {displayName}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Địa chỉ Email
            </span>
            <span className="font-semibold text-gray-800 block truncate">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: BẢO MẬT & TÀI KHOẢN */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Shield className="w-5 h-5 text-blue-600" /> Bảo mật & Xác thực
        </h2>

        <div className="divide-y divide-gray-100">
          {/* Mục 1: Đổi mật khẩu */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-gray-500" /> Mật khẩu tài khoản
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Nên định kỳ cập nhật mật khẩu để bảo vệ tài khoản tốt hơn.</p>
            </div>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl transition-colors cursor-pointer w-fit"
            >
              Đổi mật khẩu
            </button>
          </div>

          {/* Mục 2: Xác thực 2 bước (2FA) */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                {user?.totpEnabled ? (
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                )}
                Xác thực 2 yếu tố (TOTP 2FA)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Trạng thái:{" "}
                <span className={`font-semibold ${user?.totpEnabled ? "text-green-600" : "text-amber-600"}`}>
                  {user?.totpEnabled ? "Đang bật" : "Chưa kích hoạt"}
                </span>
              </p>
            </div>

            {user?.totpEnabled ? (
              <button
                onClick={() => setIsDisableTOTPOpen(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors cursor-pointer w-fit border border-red-100"
              >
                Hủy kích hoạt 2FA
              </button>
            ) : (
              <button
                onClick={() => setIsEnableTOTPOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer w-fit shadow-md shadow-blue-600/20"
              >
                Kích hoạt 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Enable 2FA Modal */}
      <EnableTOTPModal
        isOpen={isEnableTOTPOpen}
        onClose={() => setIsEnableTOTPOpen(false)}
        onSuccess={() => {
          fetchUserData();
        }}
      />

      {/* Disable 2FA Modal */}
      <DisableTOTPModal
        isOpen={isDisableTOTPOpen}
        onClose={() => setIsDisableTOTPOpen(false)}
        onSuccess={() => {
          fetchUserData();
        }}
      />
    </div>
  );
}