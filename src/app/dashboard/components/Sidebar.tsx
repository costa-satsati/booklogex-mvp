'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Users, Settings, FileText, Briefcase, AlertCircle } from 'lucide-react';

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
    <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-sm z-30">
      {/* Logo Section */}
      <Link
        href="/dashboard"
        className="h-16 flex items-center justify-center border-b border-gray-200 "
      >
        <Image
          src="/logo.png"
          alt="BookLogex Logo"
          width={160}
          height={48}
          priority
          className="max-h-12 w-auto object-contain"
        />
      </Link>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Tip Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="text-blue-600" size={16} />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-blue-900 mb-1">💡 Quick Tip</div>
              <div className="text-blue-700">Export your BAS summary before the deadline!</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
