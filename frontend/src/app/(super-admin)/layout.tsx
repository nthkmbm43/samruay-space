import { ReactNode } from 'react';
import Link from 'next/link';
import { Settings, Building2, Users } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            SAMRUAY <span className="text-foreground">SaaS</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Super Admin Portal</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/saas" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Building2 className="w-4 h-4" /> จัดการหอพัก
          </Link>
          <Link href="/saas/users" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Users className="w-4 h-4" /> ผู้ใช้งานระบบ
          </Link>
          <Link href="/saas/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" /> ตั้งค่าระบบ (Maintenance)
          </Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-muted/20 p-8">
        {children}
      </main>
    </div>
  );
}
