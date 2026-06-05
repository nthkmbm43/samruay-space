'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Home, Building2, DoorOpen, Users, Receipt, Settings, Wrench } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function Sidebar() {
  const { t } = useLanguage();

  const navItems = [
    { name: t('dashboard'), href: '/dashboard', icon: Home },
    { name: t('properties'), href: '/properties', icon: Building2 },
    { name: t('rooms'), href: '/rooms', icon: DoorOpen },
    { name: t('tenants'), href: '/tenants', icon: Users },
    { name: t('billing'), href: '/billing', icon: Receipt },
    { name: t('maintenance'), href: '/maintenance', icon: Wrench },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Image src="/logo.png" alt="Samruay Space Logo" width={32} height={32} className="object-contain" />
          <span>SAMRUAY SPACE</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
          >
            <item.icon className="w-5 h-5 text-sidebar-foreground group-hover:text-primary transition-colors" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Admin User</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">admin@samruay.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
