'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DoorOpen, BadgeDollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    totalTenants: 0,
    pendingRepairs: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [rooms, tenants, invoices, requests] = await Promise.all([
          fetchApi('/rooms'),
          fetchApi('/tenants'),
          fetchApi('/billing/invoices'),
          fetchApi('/maintenance')
        ]);

        const occupied = rooms.filter((r: any) => r.status === 'occupied').length;
        const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
        const revenue = paidInvoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0);
        const pending = requests.filter((r: any) => r.status === 'pending').length;

        setStats({
          totalRevenue: revenue,
          occupiedRooms: occupied,
          totalRooms: rooms.length,
          totalTenants: tenants.length,
          pendingRepairs: pending
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('dashboardTitle')}</h2>
        <p className="text-muted-foreground">{t('dashboardDesc')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{t('totalRevenueTitle')}</CardTitle>
                <BadgeDollarSign className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{t('totalRevenueDesc')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{t('occupiedRoomsTitle')}</CardTitle>
                <DoorOpen className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.occupiedRooms}/{stats.totalRooms}</div>
                <p className="text-xs text-muted-foreground">
                  {t('occupancyRate')} {stats.totalRooms ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{t('totalTenantsTitle')}</CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTenants}</div>
                <p className="text-xs text-muted-foreground">{t('currentTenants')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{t('pendingRepairsTitle')}</CardTitle>
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingRepairs}</div>
                <p className="text-xs text-muted-foreground">{t('pendingRepairsDesc')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>{t('revenueOverview')}</CardTitle>
              </CardHeader>
              <CardContent className="pl-2 flex justify-center items-center h-[300px] text-muted-foreground">
                {t('revenueChartPlaceholder')}
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>{t('recentActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8 flex items-center justify-center h-[200px] text-muted-foreground">
                  {t('noRecentActivity')}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
