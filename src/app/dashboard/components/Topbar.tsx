'use client';

import { Menu } from 'lucide-react';
import TopbarUserMenu from '@/components/TopbarUserMenu';
import { useOrgContext } from '@/context/OrgSettingsContext';

export function Topbar() {
  const { settings, loading } = useOrgContext();

  // Format ABN (adds spaces automatically)
  const formattedAbn = settings?.abn
    ? settings.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
    : null;

  if (!settings && loading) return <header className="h-12 border-b bg-white shadow-sm" />;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
      {/* Mobile menu button */}
      <button className="md:hidden p-2 text-gray-600 hover:text-gray-800">
        <Menu size={20} />
      </button>

      {/* Organisation Name + ABN */}
      <div className="text-sm text-gray-600 hidden sm:block" suppressHydrationWarning>
        {settings?.business_name ? (
          <>
            <span className="font-medium text-gray-800">{settings.business_name}</span>
            {formattedAbn && <span className="text-gray-500 ml-2">· ABN {formattedAbn}</span>}
          </>
        ) : (
          <span className="text-gray-500">Welcome back 👋</span>
        )}
      </div>

      {/* User Menu */}
      <div className="flex items-center gap-3">
        <TopbarUserMenu />
      </div>
    </header>
  );
}
