'use client';

import { Bell, Menu, Search, Sun, Moon, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useTheme } from '@/components/theme-provider';
import { useLanguage } from '@/contexts/LanguageContext';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder={t('search')} 

            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')} title="Switch Language">
          <span className="font-bold text-sm">{language.toUpperCase()}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative" onClick={() => alert(t('notifications'))}>
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full"></span>
        </Button>
        <Link href="/billing" passHref>
          <Button variant="default" className="hidden sm:flex">
            + {t('createInvoice')}
          </Button>
        </Link>
      </div>
    </header>
  );
}
