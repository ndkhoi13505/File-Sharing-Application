"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - ẩn/hiện hoặc thu gọn mượt mà */}
      <aside
        className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white ${isSidebarOpen ? "w-64" : "w-0 -translate-x-full overflow-hidden border-none"
          }`}
      >
        <div className="w-64">
          <Sidebar />
        </div>
      </aside>

      {/* Vùng nội dung chính */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar chứa nút toggle sidebar */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium"
            title={isSidebarOpen ? "Thu gọn" : "Mở rộng"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
            <span className="hidden sm:inline text-xs text-gray-500">
              {isSidebarOpen ? "Thu gọn" : "Mở rộng"}
            </span>
          </button>
        </header>

        {/* Nội dung Dashboard */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}