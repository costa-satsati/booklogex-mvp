'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Users, Settings, FileText, Briefcase } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/dashboard/bas', icon: FileText, label: 'BAS Summary' },
  { href: '/dashboard/payroll', icon: Users, label: 'Payroll' },
  { href: '/dashboard/employees', icon: Briefcase, label: 'Employees' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-60 bg-white border-r shadow-sm flex flex-col">
      {/* 🔹 Logo Section */}
      <Link
        href="/dashboard"
        className="px-4 py-2 flex justify-center items-center border-b bg-white"
      >
        <Image
          src="/logo.png"
          alt="BookLogex Logo"
          width={180}
          height={60}
          priority
          className="max-h-14 w-auto object-contain"
        />
      </Link>

      {/* 🔹 Nav Links */}
      <nav className="space-y-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors ${
                active
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
