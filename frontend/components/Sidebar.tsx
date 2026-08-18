"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authService } from "@/services/auth";
import { User } from "@/types";
import * as lucideReact from "lucide-react";

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleDesktop: () => void;
}

export default function Sidebar({
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleDesktop,
}: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((res) => setUser(res.user))
      .catch(() => { });
  }, []);

  useEffect(() => {
    onCloseMobile();
  }, [pathname]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error("Đã xảy ra lỗi khi đăng xuất: ", err);
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

  const LogoutButton = () => (
    <button
      type="button"
      onClick={() => setShowLogoutModal(true)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-red-600 hover:bg-red-50 transition-all duration-150 cursor-pointer mt-1"
      title="Đăng xuất"
    >
      <lucideReact.LogOut className="w-5 h-5 text-red-500 shrink-0" />
      <span className={isCollapsedDesktop ? "lg:hidden" : "block"}>Đăng xuất</span>
    </button>
  );

  return (
    <>
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col p-3.5 z-50 transition-all duration-300 ease-in-out shadow-lg lg:shadow-xs ${isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${isCollapsedDesktop ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex items-center justify-between px-2 py-1 mb-4 shrink-0">
          <div className={`flex items-center gap-3 ${isCollapsedDesktop ? "lg:hidden" : "flex"}`}>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
              File Sharing
            </span>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer lg:hidden"
            title="Đóng menu"
          >
            <lucideReact.X className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleDesktop}
            className={`hidden lg:flex p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer ${isCollapsedDesktop ? "mx-auto" : ""
              }`}
            title={isCollapsedDesktop ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            <lucideReact.PanelLeftClose
              className={`w-5 h-5 transition-transform duration-300 ${isCollapsedDesktop ? "rotate-180" : ""
                }`}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5 overflow-x-hidden">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.name}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    } ${isCollapsedDesktop ? "lg:justify-center lg:px-2" : ""}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`} />
                  <span className={`whitespace-nowrap ${isCollapsedDesktop ? "lg:hidden" : "block"}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {user?.role === "admin" ? (
              <div className="pt-4 mt-4 border-t border-gray-100 space-y-1.5">
                <span
                  className={`px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2 whitespace-nowrap ${isCollapsedDesktop ? "lg:hidden" : "block"
                    }`}
                >
                  Quản trị viên
                </span>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.name}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${isActive
                        ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                        : "text-gray-600 hover:bg-red-50 hover:text-red-700"
                        } ${isCollapsedDesktop ? "lg:justify-center lg:px-2" : ""}`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`} />
                      <span className={`whitespace-nowrap ${isCollapsedDesktop ? "lg:hidden" : "block"}`}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
                <LogoutButton />
              </div>
            ) : (
              <div className="pt-2">
                <LogoutButton />
              </div>
            )}
          </nav>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <button
              onClick={() => !isLoggingOut && setShowLogoutModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <lucideReact.X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <lucideReact.LogOut className="w-6 h-6 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Xác nhận đăng xuất</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?</p>
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs shadow-red-600/30 disabled:opacity-50"
                >
                  {isLoggingOut ? "Đang xử lý..." : "Đăng xuất"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}