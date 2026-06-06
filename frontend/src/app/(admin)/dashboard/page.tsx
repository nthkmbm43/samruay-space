'use client';

import { useState, useEffect } from 'react';
import {
  Users, DoorOpen, BadgeDollarSign, AlertTriangle,
  TrendingUp, TrendingDown, Zap, Plus, FileText,
  Gauge, Activity, ArrowRight, Calendar, CheckCircle2,
  Clock, Home,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/loading-skeleton';
import { SessionTimeout } from '@/components/ui/session-timeout';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────
interface Stats {
  totalRevenue: number;
  occupiedRooms: number;
  totalRooms: number;
  totalTenants: number;
  pendingRepairs: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  lastMonthRevenue: number;
}

interface RoomGridItem {
  id: number;
  room_number: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  floor?: number;
}

interface ActivityItem {
  id: number;
  type: 'payment' | 'tenant' | 'maintenance' | 'invoice';
  message: string;
  time: string;
  amount?: number;
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({
  title, value, subtitle, icon: Icon, iconBg, iconColor, trend, trendValue,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <div className="stat-card glass-card rounded-2xl p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {trendValue && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            trend === 'down' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
            'bg-muted text-muted-foreground'
          )}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
      <div className="text-sm font-medium text-foreground/80">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ── Room Status Grid (Mini Floor Plan) ───────────────────────
function RoomStatusGrid({ rooms }: { rooms: RoomGridItem[] }) {
  const statusColor: Record<string, string> = {
    available:   'bg-emerald-400 hover:bg-emerald-500',
    occupied:    'bg-primary hover:bg-primary/80',
    maintenance: 'bg-amber-400 hover:bg-amber-500',
    reserved:    'bg-blue-400 hover:bg-blue-500',
  };
  const statusLabel: Record<string, string> = {
    available: 'ว่าง',
    occupied: 'มีผู้เช่า',
    maintenance: 'ซ่อมบำรุง',
    reserved: 'จอง',
  };

  const maxShow = 48;
  const displayRooms = rooms.slice(0, maxShow);

  return (
    <div>
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
        {displayRooms.map((r) => (
          <Link
            key={r.id}
            href={`/rooms`}
            title={`ห้อง ${r.room_number} — ${statusLabel[r.status]}`}
            className={cn(
              'aspect-square rounded-lg transition-all duration-150 cursor-pointer',
              'flex items-center justify-center text-[9px] font-bold text-white',
              statusColor[r.status] ?? 'bg-muted'
            )}
          >
            {r.room_number.slice(-2)}
          </Link>
        ))}
        {rooms.length > maxShow && (
          <Link
            href="/rooms"
            className="aspect-square rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center text-[10px] font-bold text-muted-foreground"
          >
            +{rooms.length - maxShow}
          </Link>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {Object.entries(statusLabel).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn('w-2.5 h-2.5 rounded-sm', statusColor[key]?.split(' ')[0])} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Feed ────────────────────────────────────────────
function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const typeConfig = {
    payment:     { icon: BadgeDollarSign, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    tenant:      { icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    maintenance: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    invoice:     { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Activity className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">ยังไม่มีกิจกรรม</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const cfg = typeConfig[item.type];
        return (
          <div key={item.id} className="flex items-start gap-3">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
              <cfg.icon className={cn('w-3.5 h-3.5', cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{item.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
            </div>
            {item.amount && (
              <span className="text-sm font-semibold text-emerald-600 shrink-0">
                +฿{item.amount.toLocaleString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Quick Actions ────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { href: '/billing', icon: Plus, label: 'สร้างบิล', color: 'bg-primary text-white hover:bg-primary/90' },
    { href: '/tenants', icon: Users, label: 'เพิ่มผู้เช่า', color: 'bg-blue-500 text-white hover:bg-blue-600' },
    { href: '/meter', icon: Gauge, label: 'จดมิเตอร์', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { href: '/maintenance', icon: Zap, label: 'แจ้งซ่อม', color: 'bg-amber-500 text-white hover:bg-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-2xl font-medium text-sm',
            'transition-all duration-200 hover:scale-105 hover:shadow-lg',
            a.color
          )}
        >
          <a.icon className="w-5 h-5" />
          {a.label}
        </Link>
      ))}
    </div>
  );
}

// ── Mock chart data (replace with real API) ──────────────────
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                   'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function buildRevenueChart(monthlyRevenue?: Record<string, number>) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    return {
      month: MONTHS_TH[d.getMonth()],
      revenue: monthlyRevenue?.[key] ?? Math.floor(Math.random() * 30000 + 10000),
    };
  });
}

// ── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0, occupiedRooms: 0, totalRooms: 0,
    totalTenants: 0, pendingRepairs: 0,
    paidInvoices: 0, pendingInvoices: 0, overdueInvoices: 0,
    lastMonthRevenue: 0,
  });
  const [rooms, setRooms] = useState<RoomGridItem[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [roomsData, reportData, invoicesData] = await Promise.all([
          fetchApi('/rooms'),
          fetchApi('/reports/dashboard'),
          fetchApi('/billing/invoices'),
        ]) as [any, any, any];

        const paid = invoicesData.filter((i: any) => i.status === 'paid');

        setStats({
          totalRevenue: reportData.revenue.total,
          occupiedRooms: reportData.occupancy.occupied,
          totalRooms: reportData.occupancy.total,
          totalTenants: reportData.occupancy.occupied, // Approx
          pendingRepairs: reportData.maintenance.pending,
          paidInvoices: paid.length,
          pendingInvoices: reportData.revenue.pending, // We use this for revenue pending
          overdueInvoices: reportData.invoices.overdue,
          lastMonthRevenue: reportData.revenue.total * 0.87, // mock
        });

        setRooms(roomsData.slice(0, 60));
        setRevenueData(buildRevenueChart());

        // Build activity from recent invoices
        const activities: ActivityItem[] = paid.slice(0, 6).map((inv: any, i: number) => ({
          id: i,
          type: 'payment' as const,
          message: `ใบแจ้งหนี้ ${inv.invoice_number ?? `#${inv.id}`} ชำระแล้ว`,
          time: inv.paid_at ? new Date(inv.paid_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'เมื่อกี้',
          amount: Number(inv.paid_amount || 0),
        }));
        setActivityItems(activities);
      } catch {
        // Backend offline — show demo data already set above
        setRevenueData(buildRevenueChart());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const occupancyRate = stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
    : 0;

  const revenueTrend = stats.lastMonthRevenue > 0
    ? ((stats.totalRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100).toFixed(1)
    : '0';

  const paymentPieData = [
    { name: 'ชำระแล้ว', value: stats.paidInvoices, color: '#10B981' },
    { name: 'รอชำระ', value: stats.pendingInvoices, color: '#F97316' },
    { name: 'ค้างชำระ', value: stats.overdueInvoices, color: '#F43F5E' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 page-enter">
      <SessionTimeout />

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('dashboardTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('dashboardDesc')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-xl px-3 py-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <QuickActions />

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('totalRevenueTitle')}
            value={`฿${stats.totalRevenue.toLocaleString()}`}
            subtitle={t('totalRevenueDesc')}
            icon={BadgeDollarSign}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            trend={Number(revenueTrend) >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(Number(revenueTrend))}%`}
          />
          <StatCard
            title={t('occupiedRoomsTitle')}
            value={`${stats.occupiedRooms}/${stats.totalRooms}`}
            subtitle={`${t('occupancyRate')} ${occupancyRate}%`}
            icon={DoorOpen}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-500"
            trend={occupancyRate >= 70 ? 'up' : 'down'}
            trendValue={`${occupancyRate}%`}
          />
          <StatCard
            title={t('totalTenantsTitle')}
            value={String(stats.totalTenants)}
            subtitle={t('currentTenants')}
            icon={Users}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-500"
            trend="neutral"
          />
          <StatCard
            title={t('pendingRepairsTitle')}
            value={String(stats.pendingRepairs)}
            subtitle={t('pendingRepairsDesc')}
            icon={AlertTriangle}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-500"
            trend={stats.pendingRepairs > 5 ? 'down' : 'up'}
            trendValue={stats.pendingRepairs > 0 ? 'ต้องดูแล' : 'ปกติ'}
          />
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid gap-5 lg:grid-cols-7">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-foreground">{t('revenueOverview')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">รายได้ 6 เดือนล่าสุด</p>
            </div>
            <Link href="/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
              ดูทั้งหมด <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any) => [`฿${Number(v).toLocaleString()}`, 'รายได้']}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: '#F97316' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Status Donut + Activity */}
        <div className="lg:col-span-3 space-y-5">
          {/* Donut */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-semibold text-foreground mb-4">สถานะใบแจ้งหนี้</h2>
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="shimmer w-28 h-28 rounded-full" />
              </div>
            ) : paymentPieData.length > 0 ? (
              <div className="flex items-center gap-2">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                      {paymentPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {paymentPieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                ยังไม่มีข้อมูลใบแจ้งหนี้
              </div>
            )}
          </div>

          {/* Occupancy bar */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">อัตราการเช่า</span>
              <span className="text-sm font-bold text-primary">{occupancyRate}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${occupancyRate}%`, background: 'var(--gradient-primary)' }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
              <span>{stats.occupiedRooms} ห้องถูกใช้งาน</span>
              <span>{stats.totalRooms - stats.occupiedRooms} ห้องว่าง</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Room Grid + Activity ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Room Status Grid */}
        <div className="lg:col-span-3 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-foreground">สถานะห้องพัก</h2>
              <p className="text-xs text-muted-foreground mt-0.5">แผนผังห้องทั้งหมด</p>
            </div>
            <Link href="/rooms" className="text-xs text-primary hover:underline flex items-center gap-1">
              จัดการห้อง <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="shimmer aspect-square rounded-lg" style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          ) : (
            <RoomStatusGrid rooms={rooms} />
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-foreground">{t('recentActivity')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">กิจกรรมล่าสุดในระบบ</p>
            </div>
          </div>
          <ActivityFeed items={activityItems} />

          {/* Pending invoices summary */}
          {!loading && stats.overdueInvoices > 0 && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-medium text-rose-700 dark:text-rose-400">
                  {stats.overdueInvoices} ใบค้างชำระ
                </span>
              </div>
              <Link href="/billing" className="text-xs text-rose-500 hover:underline mt-1 flex items-center gap-1">
                ดูรายการค้างชำระ <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
