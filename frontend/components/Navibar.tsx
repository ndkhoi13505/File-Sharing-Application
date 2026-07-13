"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Lỗi logout từ server:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand Name */}
          <Link 
            href={isLoggedIn ? "/dashboard" : "/"} 
            className="flex items-center gap-2 group"
          >
            <div className="bg-blue-600 p-2 rounded-lg text-white transition-transform group-hover:scale-105">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-gray-950 tracking-tight">
              File Sharing
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/upload" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Upload File
            </Link>

            {isLoggedIn ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>

                <button 
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg transition-all shadow-sm font-semibold border border-red-200 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Đăng nhập
                </Link>

                <Link 
                  href="/register" 
                  className="bg-gray-950 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
