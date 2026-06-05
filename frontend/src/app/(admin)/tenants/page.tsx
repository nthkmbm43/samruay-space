'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, User, Loader2, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function TenantsPage() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [viewingTenant, setViewingTenant] = useState<any>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<number | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [tenantsData, roomsData] = await Promise.all([
        fetchApi('/tenants'),
        fetchApi('/rooms')
      ]);
      setTenants(tenantsData);
      setRooms(roomsData.filter(r => r.status === 'available'));
      if (roomsData.length > 0 && !roomId) setRoomId(roomsData.find(r => r.status === 'available')?.id?.toString() || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTenant = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/tenants', {
        method: 'POST',
        body: JSON.stringify({ 
          first_name: firstName, 
          last_name: lastName, 
          email, 
          phone, 
          room_id: Number(roomId) 
        })
      });
      toast.success(t('tenantAdded') || 'เพิ่มผู้เช่าสำเร็จ');
      setIsDialogOpen(false);
      setFirstName(''); setLastName(''); setEmail(''); setPhone('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTenantId) return;
    try {
      await fetchApi(`/tenants/${deletingTenantId}`, { method: 'DELETE' });
      toast.success(t('tenantDeleted') || 'ลบข้อมูลสำเร็จ');
      setDeletingTenantId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTenant = (id: number) => {
    setDeletingTenantId(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('tenantsTitle')}</h2>
          <p className="text-muted-foreground">{t('tenantsDesc')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addTenantBtn')}
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{t('addTenantTitle')}</h3>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('firstName')}</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('lastName')}</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('email')}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">{t('phone')}</label>
                <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">{t('assignRoom')}</label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  <option value="">{t('noRoomPending')}</option>
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{t('room')} {r.room_number}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveTenant')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingTenant && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('editTenantTitle')}</h3>
            <form onSubmit={async (e) => {
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
                toast.success('แก้ไขข้อมูลสำเร็จ');
                setViewingTenant(null);
                loadData();
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setSaving(false);
              }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('firstName')}</label>
                  <input required value={viewingTenant.user?.first_name || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, first_name: e.target.value}})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('lastName')}</label>
                  <input required value={viewingTenant.user?.last_name || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, last_name: e.target.value}})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('room')}</label>
                <select value={viewingTenant.room_id || ''} onChange={e => setViewingTenant({...viewingTenant, room_id: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  <option value="">{t('noRoomPending')}</option>
                  {viewingTenant.room && !rooms.find((r:any) => r.id === viewingTenant.room.id) && (
                    <option value={viewingTenant.room.id}>{t('room')} {viewingTenant.room.room_number}</option>
                  )}
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{t('room')} {r.room_number}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('email')}</label>
                <input type="email" value={viewingTenant.user?.email || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, email: e.target.value}})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('phone')}</label>
                <input value={viewingTenant.user?.phone || ''} onChange={e => setViewingTenant({...viewingTenant, user: {...viewingTenant.user, phone: e.target.value}})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('status')}</label>
                <select value={viewingTenant.status || 'active'} onChange={e => setViewingTenant({...viewingTenant, status: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  <option value="active">{t('active') || 'กำลังเช่า'}</option>
                  <option value="moving_out">แจ้งย้ายออก</option>
                  <option value="inactive">{t('inactive') || 'ไม่ได้เช่า'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="ghost" onClick={() => setViewingTenant(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveChanges')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTenantId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-sm shadow-lg border">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">ยืนยันการลบข้อมูล</h3>
              <p className="text-sm text-muted-foreground">{t('confirmDelete') || 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?'}</p>
              <div className="flex w-full justify-center gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDeletingTenantId(null)}>{t('cancel')}</Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDelete}>{t('deleteBtn') || 'ลบข้อมูล'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">{t('tenantName')}</th>
                <th className="px-6 py-4 font-medium">{t('room')}</th>
                <th className="px-6 py-4 font-medium">{t('phone')}</th>
                <th className="px-6 py-4 font-medium">{t('email')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('manage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('noTenants')}</td></tr>
              ) : tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="flex flex-col">
                        <span className="font-medium text-base">{tenant.user?.first_name} {tenant.user?.last_name}</span>
                        <span className={`w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          (tenant.status || 'active') === 'active' ? 'bg-green-100 text-green-700' : 
                          tenant.status === 'moving_out' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {(tenant.status || 'active') === 'active' ? (t('active') || 'กำลังเช่า') : 
                           tenant.status === 'moving_out' ? 'แจ้งย้ายออก' : 
                           (t('inactive') || 'ไม่ได้เช่า')}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{tenant.room ? `${tenant.room.room_number}` : t('unassigned')}</td>
                  <td className="px-6 py-4">{tenant.user?.phone}</td>
                  <td className="px-6 py-4">{tenant.user?.email}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setViewingTenant(tenant)}>{t('manage')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTenant(tenant.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
