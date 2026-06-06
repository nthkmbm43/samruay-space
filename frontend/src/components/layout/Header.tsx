'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Sun, Moon, Search, Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePathname } from 'next/navigation';
import { NotificationDropdown } from './NotificationDropdown';
import { useMobileMenu } from '@/contexts/MobileMenuContext';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ── Breadcrumb Map ───────────────────────────────────────────
const breadcrumbMap: Record<string, { label: string; parent?: string }> = {
  '/dashboard':   { label: 'หน้าแรก' },
  '/promotions':  { label: 'โปรโมชั่น', parent: '/dashboard' },
  '/properties':  { label: 'หอพัก', parent: '/dashboard' },
  '/rooms':       { label: 'ห้องพัก', parent: '/dashboard' },
  '/tenants':     { label: 'ผู้เช่า', parent: '/dashboard' },
  '/billing':     { label: 'ใบแจ้งหนี้', parent: '/dashboard' },
  '/maintenance': { label: 'แจ้งซ่อม', parent: '/dashboard' },
  '/reports':     { label: 'รายงาน', parent: '/dashboard' },
  '/settings':    { label: 'ตั้งค่า', parent: '/dashboard' },
  '/meter':       { label: 'จดมิเตอร์', parent: '/dashboard' },
};

function Breadcrumb() {
  const pathname = usePathname();
  const current = breadcrumbMap[pathname] ?? { label: pathname };
  const parent = current.parent ? breadcrumbMap[current.parent] : null;

  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="breadcrumb">
      {parent && current.parent && (
        <>
          <Link
            href={current.parent}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {parent.label}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </>
      )}
      <span className="font-semibold text-foreground">{current.label}</span>
    </nav>
  );
}

// ── Global Search (Cmd+K) ────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'hidden md:flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-muted/50 hover:bg-muted border border-transparent hover:border-border',
          'text-muted-foreground text-sm transition-all duration-150 w-52'
        )}
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">{t('search')}</span>
        <kbd className="text-[10px] bg-background border rounded px-1.5 py-0.5 font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
      <div
        className="w-full max-w-xl bg-card border rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'fade-in-up 0.2s ease-out' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="ค้นหาห้อง ผู้เช่า ใบแจ้งหนี้..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          {query.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              พิมพ์เพื่อค้นหาในระบบ
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              กำลังค้นหา "{query}"...
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> เลื่อน</span>
          <span><kbd className="font-mono">↵</kbd> เลือก</span>
          <span><kbd className="font-mono">Esc</kbd> ปิด</span>
        </div>
      </div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────
export function Header() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { isOpen: mobileMenuOpen, toggle: toggleMobileMenu } = useMobileMenu();

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleMobileMenu}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center px-4">
        <GlobalSearch />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
          className="hidden sm:flex font-semibold text-xs w-9 h-9 rounded-lg"
          title="Switch Language"
        >
          {language.toUpperCase()}
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-lg"
          title="Toggle Theme"
        >
          {theme === 'dark'
            ? <Sun className="w-4.5 h-4.5" />
            : <Moon className="w-4.5 h-4.5" />
          }
        </Button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Create Invoice CTA */}
        <Link href="/billing">
          <Button
            size="sm"
            className="hidden sm:flex gradient-btn text-white ml-1 gap-1.5 rounded-xl font-medium"
          >
            <span className="text-base leading-none">+</span>
            สร้างบิล
          </Button>
        </Link>
      </div>
    </header>
  );
}
