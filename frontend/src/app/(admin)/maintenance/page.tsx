'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus, Wrench, Loader2, X, WifiOff,
  Clock, Zap, CheckCircle2, XCircle, Upload
} from 'lucide-react';
import { fetchApi, uploadApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/loading-skeleton';

const STATUS_CFG = {
  pending:     { label: 'รอดำเนินการ', icon: Clock,        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_progress: { label: 'กำลังซ่อม',   icon: Zap,          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed:   { label: 'เสร็จสิ้น',   icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled:   { label: 'ยกเลิก',      icon: XCircle,      badge: 'bg-muted text-muted-foreground' },
} as const;

const PRIORITY_CFG = {
  high:   { label: 'เร่งด่วน', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  normal: { label: 'ปกติ',    badge: 'bg-muted text-muted-foreground' },
  low:    { label: 'ต่ำ',      badge: 'bg-muted text-muted-foreground' },
};

export default function MaintenancePage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Add ticket
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [saving, setSaving] = useState(false);

  // Update status
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateImage, setUpdateImage] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    setOffline(false);
    try {
      const [reqData, roomsData] = await Promise.all([
        fetchApi<any[]>('/maintenance'),
        fetchApi<any[]>('/rooms'),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      if (Array.isArray(roomsData) && roomsData.length > 0 && !roomId) {
        setRoomId(roomsData[0].id.toString());
      }
    } catch (err: any) {
      if (err.message?.includes('เชื่อมต่อเซิร์ฟเวอร์')) {
        setOffline(true);
      }
      // Silently fail — do NOT console.error to avoid noisy console TypeError
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/maintenance', {
        method: 'POST',
        body: JSON.stringify({ room_id: Number(roomId), title, description, priority }),
      });
      toast.success('แจ้งซ่อมสำเร็จ ✓');
      setIsDialogOpen(false);
      setTitle(''); setDescription('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('status', updateStatus);
      if (updateImage) formData.append('image', updateImage);
      await uploadApi(`/maintenance/${selectedRequest.id}/status`, formData);
      toast.success('อัปเดตสถานะสำเร็จ ✓');
      setSelectedRequest(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // counts for summary
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;

  return (
    <div className="space-y-5 page-enter">
      {/* ── Add Ticket Modal ── */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{t('createTicketTitle')}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddRequest} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('room')}</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {rooms.map((r: any) => (
                    <option key={r.id} value={r.id}>ห้อง {r.room_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('issueTitle')}</label>
                <input
                  required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="เช่น ก๊อกน้ำรั่ว, ไฟดับ"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('description')}</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  rows={3} placeholder="อธิบายปัญหาเพิ่มเติม..."
                />
              </div>
              {/* Priority */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">ความเร่งด่วน</label>
                <div className="flex gap-2">
                  {(['normal', 'high'] as const).map((p) => (
                    <button
                      key={p} type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                        priority === p
                          ? p === 'high' ? 'bg-rose-500 text-white border-rose-500' : 'bg-primary text-white border-primary'
                          : 'border-transparent bg-muted hover:border-border'
                      )}
                    >
                      {p === 'high' ? '🔴 เร่งด่วน' : '🟡 ปกติ'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving} className="gradient-btn text-white gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('submitTicket')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Update Status Modal ── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">อัปเดตสถานะแจ้งซ่อม</h3>
              <button onClick={() => setSelectedRequest(null)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-3 mb-4 text-sm">
              <div className="font-medium">{selectedRequest.title}</div>
              <div className="text-muted-foreground mt-0.5">ห้อง {selectedRequest.Room?.room_number}</div>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">เปลี่ยนสถานะ</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STATUS_CFG) as [string, typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([key, cfg]) => (
                    <button
                      key={key} type="button"
                      onClick={() => setUpdateStatus(key)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                        updateStatus === key ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted hover:border-border'
                      )}
                    >
                      <cfg.icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">แนบรูปภาพ (ส่งแจ้งเตือน LINE)</label>
                <label className={cn(
                  'flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all',
                  updateImage ? 'border-primary/50 bg-primary/5' : 'border-muted hover:border-primary/40'
                )}>
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {updateImage ? updateImage.name : 'คลิกเพื่อเลือกรูปภาพ (ไม่บังคับ)'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setUpdateImage(e.target.files?.[0] || null)} />
                </label>
                {updateImage && (
                  <img src={URL.createObjectURL(updateImage)} alt="Preview" className="mt-2 w-full max-h-36 object-contain rounded-xl border" />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setSelectedRequest(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving || !updateStatus} className="gradient-btn text-white gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกและแจ้งเตือน
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('maintTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('maintDesc')}</p>
        </div>
        <Button className="gradient-btn text-white shrink-0 gap-2 rounded-xl" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" /> {t('newTicket')}
        </Button>
      </div>

      {/* ── Summary Chips ── */}
      {!loading && !offline && (
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">รอดำเนินการ {pendingCount} รายการ</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">กำลังซ่อม {inProgressCount} รายการ</span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : offline ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถเชื่อมต่อ Backend ได้</h3>
          <p className="text-sm text-muted-foreground mb-5">
            ตรวจสอบว่า Backend Server กำลังทำงานที่ <code className="bg-muted px-2 py-0.5 rounded text-xs">localhost:3001</code>
          </p>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={loadData}>
            <Loader2 className="w-4 h-4" /> ลองใหม่
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                {[t('issue'), t('room'), t('dateReported'), t('priority'), t('status'), ''].map((h, i) => (
                  <th key={i} className={cn('px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-left', i === 5 && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Wrench className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">{t('noTickets')}</p>
                  </td>
                </tr>
              ) : (
                requests.map((req: any) => {
                  const st = (req.status ?? 'pending') as keyof typeof STATUS_CFG;
                  const pr = (req.priority ?? 'normal') as keyof typeof PRIORITY_CFG;
                  const stCfg = STATUS_CFG[st] ?? STATUS_CFG.pending;
                  const prCfg = PRIORITY_CFG[pr] ?? PRIORITY_CFG.normal;

                  return (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-medium leading-tight">{req.title}</div>
                            {req.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        ห้อง {req.Room?.room_number ?? '-'}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">
                        {new Date(req.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', prCfg.badge)}>
                          {prCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', stCfg.badge)}>
                          <stCfg.icon className="w-3 h-3" />
                          {stCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 rounded-lg text-xs border hover:border-primary/30"
                          onClick={() => { setSelectedRequest(req); setUpdateStatus(req.status ?? 'pending'); setUpdateImage(null); }}
                        >
                          {t('update')}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
