// app/dashboard/components/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Users, Settings, FileText } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/dashboard/bas', icon: FileText, label: 'BAS Summary' },
  { href: '/dashboard/payroll', icon: Users, label: 'Payroll' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-60 bg-white border-r shadow-sm">
      <div className="px-4 py-6 text-xl font-semibold">BookLogex</div>
      <nav className="space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-md ${
              path === href ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
