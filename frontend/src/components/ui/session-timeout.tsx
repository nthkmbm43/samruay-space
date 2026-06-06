'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SessionTimeoutProps {
  /** minutes before warning appears (default: 25) */
  warnAfterMinutes?: number;
  /** minutes after warning to auto-logout (default: 5) */
  logoutAfterMinutes?: number;
}

export function SessionTimeout({
  warnAfterMinutes = 25,
  logoutAfterMinutes = 5,
}: SessionTimeoutProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(logoutAfterMinutes * 60);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }, [router]);

  const handleExtendSession = useCallback(() => {
    setShowWarning(false);
    setCountdown(logoutAfterMinutes * 60);
    setLastActivity(Date.now());
    // Refresh token if needed
    const token = localStorage.getItem('token');
    if (!token) handleLogout();
  }, [logoutAfterMinutes, handleLogout]);

  // Track user activity
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    const resetActivity = () => setLastActivity(Date.now());
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => document.addEventListener(e, resetActivity, { passive: true }));

    const check = setInterval(() => {
      const idle = (Date.now() - lastActivity) / 1000 / 60;
      if (idle >= warnAfterMinutes && !showWarning) {
        setShowWarning(true);
      }
    }, 30_000);

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetActivity));
      clearInterval(check);
    };
  }, [lastActivity, warnAfterMinutes, showWarning]);

  // Countdown timer
  useEffect(() => {
    if (!showWarning) return;
    if (countdown <= 0) {
      handleLogout();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showWarning, countdown, handleLogout]);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const progress = (countdown / (logoutAfterMinutes * 60)) * 100;

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="glass-card rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
        style={{ animation: 'fade-in-up 0.3s ease-out' }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-foreground mb-2">
            เซสชันกำลังจะหมดอายุ
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            คุณไม่ได้ใช้งานระบบสักพักแล้ว ระบบจะออกจากระบบโดยอัตโนมัติใน
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-3xl font-bold text-primary tabular-nums">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: progress > 50
                  ? 'var(--gradient-primary)'
                  : progress > 25
                    ? '#F59E0B'
                    : '#F43F5E',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex-1 gap-2"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </Button>
          <Button
            onClick={handleExtendSession}
            className="flex-1 gap-2 gradient-btn text-white"
          >
            <RefreshCw className="w-4 h-4" />
            ใช้งานต่อ
          </Button>
        </div>
      </div>
    </div>
  );
}
