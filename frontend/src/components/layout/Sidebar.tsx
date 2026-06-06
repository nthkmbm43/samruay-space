'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Building2, DoorOpen, Users, Receipt, Settings,
  Wrench, Megaphone, ChevronLeft, ChevronRight,
  LogOut, ChevronDown, BarChart3, CreditCard,
  LayoutDashboard, ShieldCheck, X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { useMobileMenu } from '@/contexts/MobileMenuContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface Property {
  id: number;
  name: string;
  logo_url?: string;
}

export function Sidebar() {
  const { t } = useLanguage();
  const { isOpen: mobileOpen, setIsOpen: setMobileOpen } = useMobileMenu();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [pendingMaint, setPendingMaint] = useState(0);
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);

  const navItems: NavItem[] = [
    { name: t('dashboard'), href: '/dashboard', icon: Home },
    { name: 'โปรโมชั่น', href: '/promotions', icon: Megaphone },
    { name: t('properties'), href: '/properties', icon: Building2 },
    { name: t('rooms'), href: '/rooms', icon: DoorOpen },
    { name: t('tenants'), href: '/tenants', icon: Users },
    { name: t('billing'), href: '/billing', icon: Receipt },
    { name: t('maintenance'), href: '/maintenance', icon: Wrench, badge: pendingMaint || undefined },
    { name: 'รายงาน', href: '/reports', icon: BarChart3 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  useEffect(() => {
    // Auto-close mobile menu on route change
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    // Load user from localStorage
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.first_name) {
        setUser({ name: `${u.first_name} ${u.last_name}`, email: u.email, role: u.role });
      }
    } catch {}

    // Load pending maintenance count
    fetchApi<any[]>('/maintenance').then((data) => {
      if (Array.isArray(data)) {
        setPendingMaint(data.filter((r) => r.status === 'pending').length);
      }
    }).catch(() => { /* backend offline — ignore */ });

    // Load properties for multi-property selector and ensure selected_property is set
    fetchApi<Property[]>('/properties').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setProperties(data);
        
        let initialProp: Property | null = null;
        const savedProp = localStorage.getItem('selected_property');
        if (savedProp) {
          try { initialProp = JSON.parse(savedProp); } catch (e) {}
        }
        
        if (initialProp && data.some(p => p.id === initialProp!.id)) {
          setSelectedProperty(initialProp);
        } else {
          setSelectedProperty(data[0]);
          localStorage.setItem('selected_property', JSON.stringify(data[0]));
        }
      }
    }).catch(() => { /* backend offline — ignore */ });
  }, []);

  // Show property selector based on config
  const showPropertySelector =
    siteConfig.multiPropertyMode === 'always' ||
    (siteConfig.multiPropertyMode === 'auto' && properties.length > 1);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'ผู้ดูแลระบบ',
    staff: 'เจ้าหน้าที่',
    tenant: 'ผู้เช่า',
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col h-screen bg-sidebar border-r border-sidebar-border',
          'transition-all duration-300 ease-in-out fixed md:relative z-50 md:z-30 scrollbar-thin overflow-y-auto',
          // Mobile positioning
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
          // Desktop collapsed width
          !mobileOpen && collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        {/* Mobile Close Button */}
        <button
          className="md:hidden absolute top-4 right-4 z-50 text-muted-foreground hover:text-foreground bg-sidebar/80 rounded-full p-1 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        {/* Brand / Logo Area */}
        <div className="p-4 border-b flex items-center gap-3">
          {selectedProperty ? (
            <div className="flex-1 flex flex-col gap-2">
              <div className={cn(
                "flex items-center gap-3 cursor-pointer",
                collapsed ? "justify-center" : "justify-start"
              )}>
                <div className="relative w-8 h-8 shrink-0">
                  <Image
                    src={selectedProperty?.logo_url || siteConfig.logoPath}
                    alt={`${selectedProperty?.name || siteConfig.name} logo`}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-primary truncate leading-tight">
                      {selectedProperty?.name || siteConfig.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {selectedProperty ? 'Property Management' : siteConfig.tagline}
                    </div>
                  </div>
                )}
              </div>
              {!collapsed && typeof window !== 'undefined' && localStorage.getItem('impersonated_property') && (
                <button
                  onClick={() => {
                    localStorage.removeItem('impersonated_property');
                    window.location.href = '/saas';
                  }}
                  className="w-full mt-1 px-2 py-1.5 text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> ออกจากโหมดสวมสิทธิ์
                </button>
              )}
            </div>
          ) : (
            <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-start")}>
              <div className="font-bold text-lg text-primary">{siteConfig.name}</div>
            </div>
          )}
        </div>

        {/* Property Selector */}
        {showPropertySelector && !collapsed && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <button
              onClick={() => setPropertyOpen(!propertyOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors text-sm"
            >
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 text-left truncate text-sidebar-foreground font-medium">
                {selectedProperty?.name ?? 'เลือกหอพัก'}
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', propertyOpen && 'rotate-180')} />
            </button>
            {propertyOpen && (
              <div className="mt-1 bg-popover border rounded-xl shadow-lg overflow-hidden">
                {properties.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProperty(p);
                      localStorage.setItem('selected_property', JSON.stringify(p));
                      setPropertyOpen(false);
                      window.location.reload();
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors',
                      selectedProperty?.id === p.id && 'bg-primary/10 text-primary font-medium'
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 py-2">
              เมนูหลัก
            </p>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'nav-item',
                  isActive && 'active',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4.5 h-4.5')} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={cn(
                        'min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1.5',
                        isActive ? 'bg-white/25 text-white' : 'bg-primary/15 text-primary'
                      )}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && item.badge > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile + Logout */}
        <div className="p-3 border-t border-sidebar-border shrink-0 space-y-2">
          {/* Profile */}
          <div className={cn(
            'flex items-center rounded-xl px-2 py-2',
            collapsed ? 'justify-center' : 'gap-3'
          )}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {user?.name?.[0] ?? 'A'}
            </div>
            {!collapsed && user && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.role ? roleLabel[user.role] ?? user.role : user.email}
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium',
              'text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30',
              'transition-all duration-150',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>ออกจากระบบ</span>}
          </button>

          {/* Version */}
          {!collapsed && (
            <p className="text-[10px] text-muted-foreground/50 text-center">
              v{siteConfig.version}
            </p>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border shadow-md',
            'flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary',
            'transition-all duration-200 z-50'
          )}
          title={collapsed ? 'ขยาย Sidebar' : 'ย่อ Sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />
          }
        </button>
      </aside>
    </>
  );
}
