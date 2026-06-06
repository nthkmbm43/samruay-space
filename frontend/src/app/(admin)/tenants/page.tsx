'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, User, Loader2, Trash2, X, WifiOff, Users } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/loading-skeleton';

const STATUS_CFG = {
  active:     { label: 'กำลังเช่า',   badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  moving_out: { label: 'แจ้งย้ายออก', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-300 dark:ring-purple-700/50' },
  inactive:   { label: 'ไม่ได้เช่า',  badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
} as const;

export default function TenantsPage() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Modals
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<any>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<number | null>(null);

  // Add Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setOffline(false);
    try {
      const [tenantsData, roomsData] = await Promise.all([
        fetchApi<any[]>('/tenants'),
        fetchApi<any[]>('/rooms')
      ]);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
      const availRooms = Array.isArray(roomsData) ? roomsData.filter((r) => r.status === 'available') : [];
      setRooms(availRooms);
      if (availRooms.length > 0 && !roomId) setRoomId(availRooms[0].id.toString());
    } catch (err: any) {
      if (err.message?.includes('เชื่อมต่อเซิร์ฟเวอร์')) {
        setOffline(true);
      }
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/tenants', {
        method: 'POST',
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, phone, room_id: Number(roomId) })
      });
      toast.success(t('tenantAdded') || 'เพิ่มผู้เช่าสำเร็จ ✓');
      setIsDialogOpen(false);
      setFirstName(''); setLastName(''); setEmail(''); setPhone('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTenantId) return;
    try {
      await fetchApi(`/tenants/${deletingTenantId}`, { method: 'DELETE' });
      toast.success(t('tenantDeleted') || 'ลบข้อมูลสำเร็จ');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'ลบไม่สำเร็จ');
    } finally {
      setDeletingTenantId(null);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi(`/tenants/${viewingTenant.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          first_name: viewingTenant.user?.first_name,
          last_name: viewingTenant.user?.last_name,
          email: viewingTenant.user?.email,
          phone: viewingTenant.user?.phone,
          room_id: viewingTenant.room_id ? Number(viewingTenant.room_id) : null,
          status: viewingTenant.status || 'active'
        })
      });
      toast.success('แก้ไขข้อมูลสำเร็จ ✓');
      setViewingTenant(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'แก้ไขข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 page-enter">
      {/* ── Add Tenant Modal ── */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{t('addTenantTitle')}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('firstName')}</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('lastName')}</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('email')}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('phone')}</label>
                <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('assignRoom')}</label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">{t('noRoomPending')}</option>
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{t('room')} {r.room_number}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving} className="gradient-btn text-white gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('saveTenant')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Tenant Modal ── */}
      {viewingTenant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{t('editTenantTitle')}</h3>
              <button onClick={() => setViewingTenant(null)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">{t('firstName')}</label>
                  <input required value={viewingTenant.user?.first_name || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, first_name: e.target.value}})} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">{t('lastName')}</label>
                  <input required value={viewingTenant.user?.last_name || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, last_name: e.target.value}})} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">{t('room')}</label>
                <select value={viewingTenant.room_id || ''} onChange={e => setViewingTenant({...viewingTenant, room_id: e.target.value})} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">{t('noRoomPending')}</option>
                  {viewingTenant.room && !rooms.find((r:any) => r.id === viewingTenant.room.id) && (
                    <option value={viewingTenant.room.id}>{t('room')} {viewingTenant.room.room_number}</option>
                  )}
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{t('room')} {r.room_number}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">{t('email')}</label>
                <input type="email" value={viewingTenant.user?.email || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, email: e.target.value}})} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">{t('phone')}</label>
                <input value={viewingTenant.user?.phone || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, phone: e.target.value}})} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">{t('status')}</label>
                <select value={viewingTenant.status || 'active'} onChange={e => setViewingTenant({...viewingTenant, status: e.target.value})} className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="active">{t('active') || 'กำลังเช่า'}</option>
                  <option value="moving_out">แจ้งย้ายออก</option>
                  <option value="inactive">{t('inactive') || 'ไม่ได้เช่า'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setViewingTenant(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving} className="gradient-btn text-white gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('saveChanges')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deletingTenantId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" style={{ animation: 'fade-in-up 0.2s ease-out' }}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="font-bold text-lg mb-1">ยืนยันการลบ?</h3>
            <p className="text-sm text-muted-foreground mb-5">{t('confirmDelete') || 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?'}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeletingTenantId(null)}>{t('cancel')}</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDelete}>{t('deleteBtn') || 'ลบข้อมูล'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('tenantsTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('tenantsDesc')}</p>
        </div>
        <Button className="gradient-btn text-white shrink-0 gap-2 rounded-xl" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('addTenantBtn')}
        </Button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : offline ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถเชื่อมต่อ Backend ได้</h3>
          <p className="text-sm text-muted-foreground mb-5">ตรวจสอบว่า Backend Server กำลังทำงานที่ <code className="bg-muted px-2 py-0.5 rounded text-xs">localhost:3001</code></p>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={loadData}>
            <Loader2 className="w-4 h-4" /> ลองใหม่
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                {[t('tenantName'), t('room'), t('phone'), t('email'), ''].map((h, i) => (
                  <th key={i} className={cn('px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-left', i === 4 && 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">{t('noTenants')}</p>
                  </td>
                </tr>
              ) : tenants.map((tenant) => {
                const st = (tenant.status || 'active') as keyof typeof STATUS_CFG;
                const stCfg = STATUS_CFG[st] ?? STATUS_CFG.active;

                return (
                  <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold">
                          {tenant.user?.first_name?.charAt(0) || <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-base leading-tight mb-1">{tenant.user?.first_name} {tenant.user?.last_name}</div>
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide', stCfg.badge)}>
                            {stCfg.label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium">
                      {tenant.room ? `${t('room')} ${tenant.room.room_number}` : <span className="text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded-md text-xs">{t('unassigned')}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{tenant.user?.phone || '-'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{tenant.user?.email || '-'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setViewingTenant(tenant)}>{t('manage')}</Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg" onClick={() => setDeletingTenantId(tenant.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
