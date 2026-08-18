"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authService } from "@/services/auth";
import { User } from "@/types";
import * as lucideReact from "lucide-react";

interface SidebarProps {
  onToggle?: () => void;
}

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authService.getCurrentUser()
      .then((res) => setUser(res.user))
      .catch(() => { });
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Đã xảy ra lỗi khi đăng xuất:", err);
    } finally {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  const navItems = [
    { name: "Trang chủ", href: "/dashboard", icon: lucideReact.LayoutDashboard },
    { name: "Được chia sẻ với tôi", href: "/dashboard/shared", icon: lucideReact.Users },
    { name: "Cài đặt", href: "/dashboard/settings", icon: lucideReact.Settings },
  ];

  const adminItems = [
    { name: "Quản lý toàn bộ file", href: "/dashboard/admin/files", icon: lucideReact.Files },
    { name: "Cấu hình hệ thống", href: "/dashboard/admin/policy", icon: lucideReact.Sliders },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-4 z-30 shadow-xs">
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">File Sharing</span>
          </div>

          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Thu gọn thanh bên"
            >
              <lucideReact.PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                {item.name}
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <div className="pt-4 mt-4 border-t border-gray-100">
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Quản trị viên
              </span>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${isActive
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                      : "text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      <div className="pt-3 border-t border-gray-100 bg-white shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <lucideReact.LogOut className="w-5 h-5 text-red-500" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}