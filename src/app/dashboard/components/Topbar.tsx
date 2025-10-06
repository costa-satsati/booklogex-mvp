// app/dashboard/components/Topbar.tsx
"use client";
import { Menu } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
      <button className="md:hidden p-2">
        <Menu size={20} />
      </button>
      <div className="text-sm text-gray-500">Welcome back 👋</div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-200" />
      </div>
    </header>
  );
}
