import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toaster } from '@/components/ui/sonner';
import { OrgSettingsProvider } from '@/context/OrgSettingsContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      {/* Wrap all dashboard content inside the provider */}
      <OrgSettingsProvider>
        <div className="flex flex-col flex-1">
          <Topbar />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>

          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              classNames: {
                toast:
                  'border border-slate-200 shadow-md bg-white rounded-xl text-slate-800 font-medium',
                description: 'text-slate-600 text-sm mt-0.5',
                actionButton: 'bg-primary text-white hover:bg-primary/90 transition-all rounded-md',
              },
            }}
          />
        </div>
      </OrgSettingsProvider>
    </div>
  );
}
