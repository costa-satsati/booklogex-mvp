'use client';

import { useState } from 'react';
import { Menu, Bell, Search, ChevronDown, LogOut, User, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useOrgContext } from '@/context/OrgContext';
import { notify } from '@/lib/notify';
import { Home, Receipt, Users, Settings, FileText, Briefcase } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/dashboard/bas', icon: FileText, label: 'BAS Summary' },
  { href: '/dashboard/payroll', icon: Users, label: 'Payroll' },
  { href: '/dashboard/employees', icon: Briefcase, label: 'Employees' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { organisation, loading } = useOrgContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');

  // Get user info
  useState(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        setUserEmail(user.email || '');
      }
    })();
  });

  // Format ABN
  const formattedAbn = organisation?.abn
    ? organisation.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
    : null;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      notify.success('Signed out', 'See you next time!');
      router.push('/login');
    } catch (error) {
      notify.error('Error', 'Failed to sign out');
    }
  };

  if (!organisation && loading) return <header className="h-16 border-b bg-white shadow-sm" />;

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} className="text-gray-600" />
            </button>

            <div className="hidden md:block" suppressHydrationWarning>
              {organisation?.name ? (
                <>
                  <div className="text-sm font-medium text-gray-900">{organisation.name}</div>
                  {formattedAbn && <div className="text-xs text-gray-500">ABN {formattedAbn}</div>}
                </>
              ) : (
                <div className="text-sm text-gray-600">Welcome back 👋</div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search - Desktop only */}
            <button className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Search size={16} className="text-gray-600" />
              <span className="text-sm text-gray-600">Search...</span>
            </button>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
                  {userName[0]?.toUpperCase()}
                </div>
                <ChevronDown size={16} className="text-gray-600 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="font-medium text-gray-900">{userName}</div>
                      <div className="text-sm text-gray-500 truncate">{userEmail}</div>
                    </div>
                    <button
                      onClick={() => {
                        router.push('/dashboard/settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User size={16} />
                      Profile
                    </button>
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="text-xl font-bold text-white">BookLogex</div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Info at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {userName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{userName}</div>
                  <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
