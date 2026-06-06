import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileMenuProvider } from '@/contexts/MobileMenuContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileMenuProvider>
      <div className="flex h-screen bg-background overflow-hidden relative">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
