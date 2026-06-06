'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Wallet, 
  Calendar,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchApi } from '@/lib/api';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';

interface ReportData {
  kpi: {
    revenue: { value: number; growth: number };
    occupancy: { value: number; growth: number };
    overdue: { value: number; growth: number };
  };
  charts: {
    revenueTrend: { month: string; value: number }[];
    occupancyTrend: { month: string; rate: number }[];
  };
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetchApi('/reports/statistics') as ReportData;
        setData(res);
      } catch (err) {
        console.error('Failed to load reports statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter charts based on timeRange (6m = last 6 months, 1y = all 12 months)
  const getFilteredRevenueData = () => {
    if (!data) return [];
    return timeRange === '6m' 
      ? data.charts.revenueTrend.slice(-6) 
      : data.charts.revenueTrend;
  };

  const getFilteredOccupancyData = () => {
    if (!data) return [];
    return timeRange === '6m' 
      ? data.charts.occupancyTrend.slice(-6) 
      : data.charts.occupancyTrend;
  };

  return (
    <div className="space-y-6 page-enter">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            รายงานและสถิติ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ภาพรวมรายได้ อัตราการเข้าพัก และข้อมูลเชิงลึกของหอพัก
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl gap-2 bg-background/50 backdrop-blur-sm">
            <Filter className="w-4 h-4" /> ตัวกรอง
          </Button>
          <Button className="gradient-btn text-white rounded-xl gap-2">
            <Download className="w-4 h-4" /> ส่งออก PDF
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      {loading || !data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Revenue KPI */}
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-primary">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                data.kpi.revenue.growth >= 0 
                  ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
              )}>
                {data.kpi.revenue.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {data.kpi.revenue.growth >= 0 ? '+' : ''}{data.kpi.revenue.growth}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">รายได้รวม (เดือนนี้)</p>
            <h3 className="text-2xl font-bold">฿{data.kpi.revenue.value.toLocaleString()}</h3>
          </div>

          {/* Occupancy KPI */}
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <span className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                data.kpi.occupancy.growth >= 0 
                  ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
              )}>
                {data.kpi.occupancy.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {data.kpi.occupancy.growth >= 0 ? '+' : ''}{data.kpi.occupancy.growth}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">อัตราการเข้าพัก</p>
            <h3 className="text-2xl font-bold">{data.kpi.occupancy.value}%</h3>
          </div>

          {/* Overdue KPI */}
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <span className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                data.kpi.overdue.growth <= 0 
                  ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
              )}>
                {data.kpi.overdue.growth <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {data.kpi.overdue.growth >= 0 ? '+' : ''}{data.kpi.overdue.growth}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">ค้างชำระ</p>
            <h3 className={cn(
              "text-2xl font-bold",
              data.kpi.overdue.value > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
            )}>
              ฿{data.kpi.overdue.value.toLocaleString()}
            </h3>
          </div>
        </div>
      )}

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Chart */}
        <div className="glass-card rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">แนวโน้มรายได้ ({timeRange === '6m' ? '6 เดือน' : '1 ปี'})</h3>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1 bg-background focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="6m">6 เดือนล่าสุด</option>
              <option value="1y">1 ปีล่าสุด</option>
            </select>
          </div>
          <div className="h-[250px] w-full mt-auto">
            {loading || !data ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getFilteredRevenueData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickFormatter={(val) => `฿${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.75rem', fontSize: '13px' }}
                    itemStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'รายได้']}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="glass-card rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">อัตราการเข้าพัก (%)</h3>
          </div>
          <div className="h-[250px] w-full mt-auto">
            {loading || !data ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getFilteredOccupancyData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.75rem', fontSize: '13px' }}
                    formatter={(value: any) => [`${value}%`, 'อัตราเข้าพัก']}
                  />
                  <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

