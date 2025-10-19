import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toaster } from '@/components/ui/sonner';
import { OrgProvider } from '@/context/OrgContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <OrgProvider>
        <div className="flex flex-col flex-1 md:pl-64">
          <Topbar />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>

          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              classNames: {
                toast:
                  'border border-slate-200 shadow-lg bg-white rounded-xl text-slate-800 font-medium',
                description: 'text-slate-600 text-sm mt-0.5',
                actionButton: 'bg-blue-600 text-white hover:bg-blue-700 transition-all rounded-lg',
              },
            }}
          />
        </div>
      </OrgProvider>
    </div>
  );
}
