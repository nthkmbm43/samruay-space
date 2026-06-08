'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DoorOpen, Plus, Search, Loader2, Trash2, AlertTriangle,
  LayoutGrid, List, X, Clock
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { RoomGridSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'available' | 'occupied' | 'maintenance';

const STATUS_CONFIG = {
  available:   { label: 'ว่าง', color: 'bg-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  occupied:    { label: 'มีผู้เช่า', color: 'bg-primary', text: 'text-primary', badge: 'bg-primary/15 text-primary' },
  maintenance: { label: 'ซ่อมบำรุง', color: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  reserved:    { label: 'จอง', color: 'bg-blue-400', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

// ── Room Card (Grid View) ─────────────────────────────────────
function RoomCard({ room, onEdit, onDelete }: { room: any; onEdit: () => void; onDelete: () => void }) {
  const status = room.status as keyof typeof STATUS_CONFIG;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;
  const price = parseFloat(room.price_override ?? room.RoomType?.base_price ?? 0);
  const pricePerDay = parseFloat(room.price_per_day ?? 0);

  // Pending price badge
  const hasPending = room.price_effective_date && (
    room.pending_price_override != null || room.pending_price_per_day != null
  );
  const pendingEffDate = hasPending
    ? new Date(room.price_effective_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div className="glass-card rounded-2xl p-4 group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 relative">
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm', cfg.color)}>
          {room.room_number?.slice(-2) ?? '??'}
        </div>
        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', cfg.badge)}>
          {cfg.label}
        </span>
      </div>

      {/* Info */}
      <div className="mb-3">
        <div className="font-bold text-foreground text-lg leading-tight">ห้อง {room.room_number}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          ชั้น {room.Floor?.floor_number ?? room.floor_number ?? '-'} · {room.RoomType?.name ?? '-'}
        </div>
      </div>

      {/* Price */}
      <div className="text-primary font-semibold text-sm mb-1">
        {room.rental_type === 'daily' ? (
          <span>฿{pricePerDay > 0 ? pricePerDay.toLocaleString() : '-'}/วัน</span>
        ) : room.rental_type === 'both' ? (
          <div className="flex flex-col gap-0.5">
            <span>฿{price > 0 ? price.toLocaleString() : '-'}/เดือน</span>
            <span className="text-xs text-muted-foreground">฿{pricePerDay > 0 ? pricePerDay.toLocaleString() : '-'}/วัน</span>
          </div>
        ) : (
          <span>฿{price > 0 ? price.toLocaleString() : '-'}/เดือน</span>
        )}
      </div>

      {/* Pending Price Badge */}
      {hasPending && (
        <div className="flex items-center gap-1 mt-1 mb-2">
          <Clock className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-amber-500 font-medium">
            ราคาใหม่มีผล {pendingEffDate}:&nbsp;
            {room.pending_price_per_day != null && `฿${parseFloat(room.pending_price_per_day).toLocaleString()}/วัน`}
            {room.pending_price_per_day != null && room.pending_price_override != null && ' · '}
            {room.pending_price_override != null && `฿${parseFloat(room.pending_price_override).toLocaleString()}/เดือน`}
          </span>
        </div>
      )}

      {/* Tenant if occupied */}
      {room.status === 'occupied' && room.Contract?.Tenant && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[9px]">
            {room.Contract.Tenant.User?.first_name?.[0] ?? 'T'}
          </div>
          <span className="truncate">
            {room.Contract.Tenant.User?.first_name} {room.Contract.Tenant.User?.last_name}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs rounded-lg"
          onClick={onEdit}
        >
          แก้ไข
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Room Form Modal ───────────────────────────────────────────
function RoomModal({ 
  title, room, properties, tenants, saving, onClose, onSubmit, isEdit
}: { 
  title: string; room: any; properties: any[]; tenants: any[]; saving: boolean;
  onClose: () => void; onSubmit: (form: any) => void; isEdit?: boolean
}) {
  const { t } = useLanguage();

  // ── Init form state จาก DB data จริงๆ ─────────────────────
  const [form, setForm] = useState(() => ({
    ...room,
    // ป้องกัน null/0 — ใช้ค่า DB จริง ถ้าไม่มีค่อย default
    price_override: room.price_override != null
      ? String(parseFloat(room.price_override))
      : room.display_price != null
      ? String(room.display_price)
      : '',
    price_per_day: room.price_per_day != null
      ? String(parseFloat(room.price_per_day))
      : '',
    rental_type: room.rental_type || 'both',
  }));

  const [effectiveImmediately, setEffectiveImmediately] = useState(false);

  // ตรวจว่าราคาเปลี่ยนไปจาก DB หรือไม่
  const origPriceOverride = room.price_override != null ? parseFloat(room.price_override) : null;
  const origPricePerDay = room.price_per_day != null ? parseFloat(room.price_per_day) : null;
  const formPriceOverride = form.price_override !== '' ? parseFloat(form.price_override) : null;
  const formPricePerDay = form.price_per_day !== '' ? parseFloat(form.price_per_day) : null;

  const priceChanged = isEdit && (
    formPriceOverride !== origPriceOverride ||
    formPricePerDay !== origPricePerDay
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ animation: 'fade-in-up 0.25s ease-out' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, effective_immediately: effectiveImmediately }); }} className="space-y-4">
          {/* Property */}
          {!room.id && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('property')}</label>
              <select
                value={form.property_id ?? ''}
                onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('roomNumber')}</label>
              <input
                required value={form.room_number ?? ''}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={t('egRoom')}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('floor')}</label>
              <input
                required type="number"
                value={form.floor_number ?? form.Floor?.floor_number ?? 1}
                onChange={(e) => setForm({ ...form, floor_number: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('roomType')}</label>
              <select
                value={form.room_type ?? form.RoomType?.name ?? 'Standard Room'}
                onChange={(e) => setForm({ ...form, room_type: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Standard Room">{t('standardRoom')}</option>
                <option value="Suite Room">{t('suiteRoom')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">รูปแบบการปล่อยเช่า</label>
              <select
                value={form.rental_type}
                onChange={(e) => setForm({ ...form, rental_type: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="monthly">รายเดือนเท่านั้น</option>
                <option value="daily">รายวันเท่านั้น</option>
                <option value="both">ปล่อยเช่าได้ทั้งคู่ (Hybrid)</option>
              </select>
            </div>
          </div>

          {/* Price Fields */}
          <div className="grid grid-cols-2 gap-3">
            {(form.rental_type === 'monthly' || form.rental_type === 'both') && (
              <div className={form.rental_type === 'monthly' ? 'col-span-2' : ''}>
                <label className="text-sm font-medium mb-1.5 block">ราคาเช่ารายเดือน (บาท)</label>
                <input
                  required type="number" min="0"
                  value={form.price_override}
                  onChange={(e) => setForm({ ...form, price_override: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="เช่น 1500"
                />
              </div>
            )}
            {(form.rental_type === 'daily' || form.rental_type === 'both') && (
              <div className={form.rental_type === 'daily' ? 'col-span-2' : ''}>
                <label className="text-sm font-medium mb-1.5 block">ราคาเช่ารายวัน (บาท/คืน)</label>
                <input
                  required type="number" min="0"
                  value={form.price_per_day}
                  onChange={(e) => setForm({ ...form, price_per_day: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="เช่น 500"
                />
              </div>
            )}
          </div>

          {/* ── Temporal Price Toggle (Edit Mode only + ราคาเปลี่ยน) ── */}
          {isEdit && priceChanged && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3.5">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                กำหนดเวลาราคาใหม่มีผล
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={effectiveImmediately}
                    onChange={(e) => setEffectiveImmediately(e.target.checked)}
                  />
                  <div className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors duration-200" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium">
                  {effectiveImmediately
                    ? '✅ ใช้ราคาใหม่ทันที (วันนี้)'
                    : '⏳ ใช้ราคาใหม่พรุ่งนี้ (เที่ยงคืน)'}
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground mt-1.5 ml-11">
                {effectiveImmediately
                  ? 'ราคาจะมีผลทันที และแสดงในระบบทุกส่วนเดี๋ยวนี้'
                  : 'บิลและการจองที่ดำเนินการอยู่จะไม่ถูกกระทบ ราคาใหม่จะมีผลวันพรุ่งนี้เวลา 00:00 น.'}
              </p>
            </div>
          )}

          {/* Status (edit only) */}
          {room.id && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('status')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['available', 'occupied', 'maintenance'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, status: s, tenant_id: s === 'occupied' ? form.tenant_id : null })}
                      className={cn(
                        'py-2 rounded-xl text-xs font-medium border transition-all',
                        form.status === s
                          ? 'border-primary bg-primary text-white'
                          : 'border-transparent bg-muted hover:border-border'
                      )}
                    >
                      {STATUS_CONFIG[s]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.status === 'occupied' && (
                <div className="mt-3">
                  <label className="text-sm font-medium mb-1.5 block">เลือกผู้เช่า</label>
                  <select
                    value={form.tenant_id || ''}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">-- เลือกผู้เช่า --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.user?.first_name} {t.user?.last_name} {t.room ? `(ย้ายจากห้อง ${t.room.room_number})` : '(ยังไม่มีห้อง)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1.5">หากไม่พบรายชื่อในระบบ ให้ทำการสร้างผู้เช่าใหม่ในหน้า "ผู้เช่า" ก่อน</p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" disabled={saving} className="gradient-btn text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {room.id ? t('saveData') : t('saveRoom')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function RoomsPage() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, propsData, tenantsData] = await Promise.all([
        fetchApi('/rooms'),
        fetchApi('/properties'),
        fetchApi('/tenants'),
      ]) as [any, any, any];
      setRooms(roomsData);
      setProperties(propsData);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Filter & Sort
  const filtered = rooms
    .filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchSearch = !searchQuery ||
        r.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.RoomType?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (statusFilter === 'all') {
        const order = { 'available': 1, 'occupied': 2, 'maintenance': 3, 'reserved': 4 };
        const stA = order[a.status as keyof typeof order] || 99;
        const stB = order[b.status as keyof typeof order] || 99;
        if (stA !== stB) return stA - stB;
      }
      return String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true });
    });

  // Counts
  const counts = {
    all: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  };

  const handleAddRoom = async (form: any) => {
    setSaving(true);
    try {
      await fetchApi('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_number: form.room_number,
          room_type: form.room_type,
          base_price: form.price_override !== '' ? Number(form.price_override) : undefined,
          price_override: form.price_override !== '' ? Number(form.price_override) : undefined,
          rental_type: form.rental_type || 'both',
          price_per_day: (form.rental_type !== 'monthly' && form.price_per_day !== '')
            ? Number(form.price_per_day)
            : undefined,
          floor_number: Number(form.floor_number),
          property_id: Number(form.property_id ?? properties[0]?.id),
        }),
      });
      toast.success('เพิ่มห้องพักสำเร็จ ✓');
      setIsAddOpen(false);
      loadData();
    } catch (err: any) { 
      setErrorAlert(err.message || 'เกิดข้อผิดพลาดในการบันทึก'); 
    }
    finally { setSaving(false); }
  };

  const handleEditRoom = async (form: any) => {
    setSaving(true);
    try {
      await fetchApi(`/rooms/${form.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          room_number: form.room_number,
          status: form.status,
          floor_number: Number(form.floor_number ?? form.Floor?.floor_number),
          room_type: form.room_type ?? form.RoomType?.name,
          rental_type: form.rental_type || 'both',
          price_per_day: (form.rental_type !== 'monthly' && form.price_per_day !== '')
            ? Number(form.price_per_day)
            : null,
          price_override: form.price_override !== '' ? Number(form.price_override) : null,
          tenant_id: form.status === 'occupied' ? Number(form.tenant_id) : null,
          effective_immediately: form.effective_immediately === true,
        }),
      });

      if (form.effective_immediately) {
        toast.success('อัปเดตราคาทันทีสำเร็จ ✓');
      } else {
        toast.success('บันทึกราคาใหม่แล้ว — มีผลพรุ่งนี้ 00:00 น. ✓');
      }
      setEditingRoom(null);
      loadData();
    } catch (err: any) { 
      setErrorAlert(err.message || 'เกิดข้อผิดพลาดในการบันทึก'); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteRoomId) return;
    try {
      await fetchApi(`/rooms/${deleteRoomId}`, { method: 'DELETE' });
      toast.success('ลบห้องพักแล้ว');
      loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleteRoomId(null); }
  };

  return (
    <div className="space-y-5 page-enter">
      {/* ── Sweet Alert Error Modal ── */}
      {errorAlert && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden" style={{ animation: 'bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
            <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="font-extrabold text-2xl mb-2 text-foreground">ไม่สามารถบันทึกได้</h3>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed px-2">
              {errorAlert}
            </p>
            <Button 
              className="w-full rounded-xl py-6 text-base font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20" 
              onClick={() => setErrorAlert(null)}
            >
              รับทราบ
            </Button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {isAddOpen && (
        <RoomModal
          title={t('addRoomTitle')}
          room={{ room_number: '', floor_number: 1, room_type: 'Standard Room', price_override: '', price_per_day: '', property_id: properties[0]?.id }}
          properties={properties}
          tenants={tenants}
          saving={saving}
          isEdit={false}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddRoom}
        />
      )}
      {editingRoom && (
        <RoomModal
          title={t('editRoomTitle')}
          room={editingRoom}
          properties={properties}
          tenants={tenants}
          saving={saving}
          isEdit={true}
          onClose={() => setEditingRoom(null)}
          onSubmit={handleEditRoom}
        />
      )}
      {deleteRoomId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" style={{ animation: 'fade-in-up 0.2s ease-out' }}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="font-bold text-lg mb-1">ยืนยันการลบ?</h3>
            <p className="text-sm text-muted-foreground mb-5">การลบห้องพักจะไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteRoomId(null)}>ยกเลิก</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete}>ลบเลย</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('roomsTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('roomsDesc')}</p>
        </div>
        <Button className="gradient-btn text-white shrink-0 gap-2" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('addRoom')}
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex bg-muted/50 p-1 rounded-xl gap-1">
          {(['all', 'available', 'occupied', 'maintenance'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'all' ? `ทั้งหมด (${counts.all})` :
               s === 'available' ? `ว่าง (${counts.available})` :
               s === 'occupied' ? `มีผู้เช่า (${counts.occupied})` :
               `ซ่อม (${counts.maintenance})`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-1 justify-end">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-muted/50 p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        viewMode === 'grid'
          ? <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"><RoomGridSkeleton /></div>
          : <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <DoorOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">ไม่พบห้องพักที่ตรงกับเงื่อนไข</p>
          <Button className="mt-4 gradient-btn text-white" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่มห้องพัก
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={() => setEditingRoom(room)}
              onDelete={() => setDeleteRoomId(room.id)}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                {[t('roomNumber'), t('roomType'), t('floor'), t('price'), t('status'), ''].map((h, i) => (
                  <th key={i} className={cn('px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide', i === 5 && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((room) => {
                const st = room.status as keyof typeof STATUS_CONFIG;
                const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG.available;
                const price = parseFloat(room.price_override ?? room.RoomType?.base_price ?? 0);
                const pricePerDay = parseFloat(room.price_per_day ?? 0);
                const hasPending = room.price_effective_date && (
                  room.pending_price_override != null || room.pending_price_per_day != null
                );
                return (
                  <tr key={room.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', cfg.color)}>
                          {room.room_number?.slice(-2)}
                        </div>
                        <span className="font-semibold">ห้อง {room.room_number}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{room.RoomType?.name ?? '-'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">ชั้น {room.Floor?.floor_number ?? room.floor_number ?? '-'}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <div className="font-semibold text-primary">
                          {room.rental_type === 'daily'
                            ? `฿${pricePerDay > 0 ? pricePerDay.toLocaleString() : '-'}/วัน`
                            : room.rental_type === 'both'
                            ? `฿${price > 0 ? price.toLocaleString() : '-'}/เดือน · ฿${pricePerDay > 0 ? pricePerDay.toLocaleString() : '-'}/วัน`
                            : `฿${price > 0 ? price.toLocaleString() : '-'}/เดือน`}
                        </div>
                        {hasPending && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] text-amber-500">
                              ราคาใหม่พรุ่งนี้
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', cfg.badge)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setEditingRoom(room)}>
                          แก้ไข
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteRoomId(room.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
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
