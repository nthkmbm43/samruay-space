'use client';

import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string;
  created_at: string;
}

export function NotificationDropdown() {
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${notif.id}/read`, { 
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchNotifications();
      } catch (error) {
        console.error(error);
      }
    }
    setIsOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 block h-2 w-2 rounded-full bg-red-500 animate-pulse border border-background"></span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
        <div className="flex justify-between items-center px-3 py-2 text-sm font-semibold border-b">
          <span>{t('notifications') || 'การแจ้งเตือน'}</span>
          <span 
            onClick={markAllAsRead}
            className="text-xs font-normal text-muted-foreground cursor-pointer hover:underline"
          >
            ทำเครื่องหมายว่าอ่านแล้ว
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => handleClick(notif)}
              className="flex flex-col items-start p-3 cursor-pointer gap-1 hover:bg-muted/50 border-b border-border/50"
            >
              <div className="flex w-full justify-between items-start gap-2">
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notif.title}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {notif.message}
                  </span>
                </div>
                {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">{formatTime(notif.created_at)}</span>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
