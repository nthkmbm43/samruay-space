'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

export function NotificationDropdown() {
  const { t } = useLanguage();
  
  // Mock notifications for now
  const notifications = [
    { id: 1, title: 'แจ้งซ่อมแอร์ ห้อง 101', time: '10 นาทีที่แล้ว', unread: true },
    { id: 2, title: 'โอนเงินค่าเช่า ห้อง 205', time: '1 ชั่วโมงที่แล้ว', unread: true },
    { id: 3, title: 'ย้ายเข้าใหม่ ห้อง 302', time: '2 วันที่แล้ว', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>{t('notifications') || 'การแจ้งเตือน'}</span>
          <span className="text-xs font-normal text-muted-foreground cursor-pointer hover:underline">
            ทำเครื่องหมายว่าอ่านแล้ว
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-80 overflow-y-auto">
          {notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer gap-1">
              <div className="flex w-full justify-between items-start gap-2">
                <span className={`text-sm font-medium ${notif.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notif.title}
                </span>
                {notif.unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
              <span className="text-xs text-muted-foreground">{notif.time}</span>
            </DropdownMenuItem>
          ))}
          {notifications.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</div>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" className="w-full text-sm h-8" size="sm">
            ดูการแจ้งเตือนทั้งหมด
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
