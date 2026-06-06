'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Eye, EyeOff, Loader2, Shield, AlertTriangle,
  CheckCircle2, Lock
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

// Password strength (for demo/change-password use)
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'ตัวอักษรพิมพ์ใหญ่', ok: /[A-Z]/.test(password) },
    { label: 'ตัวเลข', ok: /[0-9]/.test(password) },
    { label: '8 ตัวขึ้นไป', ok: password.length >= 8 },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400'];
  if (password.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i < score ? colors[score - 1] : 'bg-muted')} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={cn('text-[11px] flex items-center gap-1', c.ok ? 'text-emerald-600' : 'text-muted-foreground')}>
            {c.ok ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Decorative floating orbs
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 dark:opacity-10"
        style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-48 -left-32 w-[28rem] h-[28rem] rounded-full opacity-15 dark:opacity-8"
        style={{ background: 'radial-gradient(circle, #EA580C, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #FED7AA, transparent 70%)', animation: 'float 6s ease-in-out infinite' }}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('admin@samruay.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);

  // Lockout countdown
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const t = setTimeout(() => setLockoutRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockoutRemaining]);

  const isLocked = lockoutRemaining > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection hint
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (rememberMe) localStorage.setItem('remember_email', email);
        setAttempts(0);
        router.push('/dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutRemaining(LOCKOUT_SECONDS);
          setError(`เข้าสู่ระบบผิดพลาดเกิน ${MAX_ATTEMPTS} ครั้ง ระบบล็อคชั่วคราว ${LOCKOUT_SECONDS} วินาที`);
        } else {
          setError(data.message || `${t('loginFailed')} (${newAttempts}/${MAX_ATTEMPTS})`);
        }
      }
    } catch {
      setError(t('connError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--gradient-hero)' }}>
      {/* ── Left Panel: Branding ─────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <BackgroundOrbs />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center p-1.5">
            <Image
              src={siteConfig.logoPath}
              alt={siteConfig.name}
              width={32}
              height={32}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <span className="text-white font-bold text-lg">{siteConfig.name}</span>
        </div>

        {/* Center Feature Cards */}
        <div className="relative z-10 space-y-4" style={{ animation: 'fade-in-up 0.6s ease-out 0.2s both' }}>
          <h2 className="text-white text-3xl font-bold leading-tight">
            ระบบจัดการหอพัก<br />
            <span className="text-white/80">สมัยใหม่ ครบวงจร</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            จัดการห้องพัก ผู้เช่า ใบแจ้งหนี้ และการแจ้งซ่อม<br />
            ในที่เดียว ใช้งานง่าย ปลอดภัย
          </p>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {[
              { icon: '🏠', label: 'จัดการห้องพัก' },
              { icon: '📊', label: 'Dashboard ครบ' },
              { icon: '🔔', label: 'แจ้งเตือน LINE' },
              { icon: '📱', label: 'ใช้ได้ทุกอุปกรณ์' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 border border-white/20 rounded-2xl p-3.5 backdrop-blur-sm">
                <div className="text-2xl mb-1.5">{f.icon}</div>
                <div className="text-white text-sm font-medium">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 w-fit">
            <Shield className="w-4 h-4 text-white/80" />
            <span className="text-white/80 text-xs">ปลอดภัยด้วย JWT + Security Headers</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        <BackgroundOrbs />

        <div
          className="w-full max-w-md relative z-10"
          style={{ animation: 'fade-in-up 0.5s ease-out' }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center p-2">
              <Image
                src={siteConfig.logoPath}
                alt={siteConfig.name}
                width={40}
                height={40}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <div className="font-bold text-lg text-primary">{siteConfig.name}</div>
              <div className="text-xs text-muted-foreground">{siteConfig.tagline}</div>
            </div>
          </div>

          {/* Card */}
          <div className="glass-card rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-foreground">ยินดีต้อนรับ 👋</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t('loginDesc')}
              </p>
            </div>

            {/* Lockout Banner */}
            {isLocked && (
              <div className="mb-4 flex items-center gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl px-4 py-3">
                <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="flex-1 text-sm">
                  <div className="font-semibold text-rose-600 dark:text-rose-400">ระบบล็อคชั่วคราว</div>
                  <div className="text-rose-500/80 text-xs">ลองอีกครั้งใน {lockoutRemaining} วินาที</div>
                </div>
                <div className="text-2xl font-bold text-rose-500 tabular-nums">{lockoutRemaining}</div>
              </div>
            )}

            {/* Error */}
            {error && !isLocked && (
              <div className="mb-4 flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3.5 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-rose-600 dark:text-rose-400">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="login-email">
                  {t('email')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLocked || loading}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-background',
                    'text-sm text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-150'
                  )}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="login-password">
                  {t('password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLocked || loading}
                    className={cn(
                      'w-full px-4 py-2.5 pr-11 rounded-xl border bg-background',
                      'text-sm text-foreground placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-all duration-150'
                    )}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Attempt meter */}
                {attempts > 0 && !isLocked && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all',
                          i < attempts ? 'bg-rose-400' : 'bg-muted'
                        )}
                      />
                    ))}
                    <span className="text-[11px] text-rose-500 ml-1">{attempts}/{MAX_ATTEMPTS}</span>
                  </div>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  จำฉันไว้
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLocked || loading}
                className={cn(
                  'w-full py-3 rounded-xl text-white font-semibold text-sm',
                  'gradient-btn flex items-center justify-center gap-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
                  'transition-all duration-200'
                )}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />กำลังเข้าสู่ระบบ...</>
                ) : isLocked ? (
                  <><Lock className="w-4 h-4" />ล็อคชั่วคราว ({lockoutRemaining}s)</>
                ) : (
                  t('signIn')
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>ระบบปลอดภัย ข้อมูลเข้ารหัส TLS</span>
            </div>
          </div>

          {/* Powered by */}
          <p className="text-center text-xs text-muted-foreground mt-5">
            Powered by{' '}
            <a href={siteConfig.supportUrl} className="text-primary hover:underline font-medium">
              {siteConfig.name}
            </a>
            {' '}— Template v{siteConfig.version}
          </p>
        </div>
      </div>
    </div>
  );
}
