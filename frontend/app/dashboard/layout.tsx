"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as lucideReact from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        isOpenMobile={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isCollapsedDesktop={desktopCollapsed}
        onToggleDesktop={() => setDesktopCollapsed(!desktopCollapsed)}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${desktopCollapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
      >
        <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between lg:hidden shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Mở menu"
          >
            <lucideReact.Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900 text-base">File Sharing</span>
          <div className="w-5" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}