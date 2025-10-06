"use client";

import { Menu } from "lucide-react";
import TopbarUserMenu from "@/components/TopbarUserMenu";

export function Topbar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
      {/* Mobile menu button */}
      <button className="md:hidden p-2 text-gray-600 hover:text-gray-800">
        <Menu size={20} />
      </button>

      {/* Greeting */}
      <div className="text-sm text-gray-500 hidden sm:block">
        Welcome back 👋
      </div>

      {/* User avatar & dropdown */}
      <div className="flex items-center gap-3">
        <TopbarUserMenu />
      </div>
    </header>
  );
}
