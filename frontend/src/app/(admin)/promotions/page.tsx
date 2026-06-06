'use client';

import { useState, useEffect } from 'react';
import { fetchApi, uploadApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  Megaphone, Plus, Trash2, Send, X, Upload,
  Loader2, WifiOff, ImageIcon, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActiveAuto, setIsActiveAuto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);

  const [deletePromoId, setDeletePromoId] = useState<number | null>(null);
  const [broadcastPromoId, setBroadcastPromoId] = useState<number | null>(null);

  useEffect(() => { loadPromotions(); }, []);

  const loadPromotions = async () => {
    setLoading(true);
    setOffline(false);
    try {
      const data = await fetchApi<any[]>('/promotions');
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // Distinguish network error from other errors
      if (err.message?.includes('เชื่อมต่อเซิร์ฟเวอร์')) {
        setOffline(true);
      }
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('start_date', startDate || new Date().toISOString().split('T')[0]);
      if (endDate) formData.append('end_date', endDate);
      formData.append('is_active_auto', isActiveAuto.toString());
      if (image) formData.append('image', image);

      if (editingId) {
        await uploadApi(`/promotions/${editingId}`, formData, { method: 'PUT' });
        toast.success('แก้ไขข่าวสารสำเร็จ ✓');
      } else {
        await uploadApi('/promotions', formData);
        toast.success('สร้างข่าวสารสำเร็จ ✓');
      }
      
      setFormOpen(false);
      setName(''); setDescription(''); setImage(null); setExistingImage(null);
      setStartDate(''); setEndDate(''); setIsActiveAuto(false);
      setEditingId(null);
      loadPromotions();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditForm = (promo: any) => {
    setEditingId(promo.id);
    setName(promo.name);
    setDescription(promo.description || '');
    setStartDate(promo.start_date ? new Date(promo.start_date).toISOString().split('T')[0] : '');
    setEndDate(promo.end_date ? new Date(promo.end_date).toISOString().split('T')[0] : '');
    setIsActiveAuto(promo.is_active_auto || false);
    setImage(null);
    setExistingImage(promo.image_url || null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setName(''); setDescription(''); setImage(null); setExistingImage(null);
    setStartDate(''); setEndDate(''); setIsActiveAuto(false);
    setEditingId(null);
  };

  const confirmDelete = async () => {
    if (!deletePromoId) return;
    try {
      await fetchApi(`/promotions/${deletePromoId}`, { method: 'DELETE' });
      toast.success('ลบข่าวสารแล้ว');
      loadPromotions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletePromoId(null);
    }
  };

  const confirmBroadcast = async () => {
    if (!broadcastPromoId) return;
    try {
      await fetchApi(`/promotions/${broadcastPromoId}/broadcast`, { method: 'POST' });
      toast.success('ส่ง Broadcast สำเร็จ! 📣');
    } catch (err: any) {
      toast.error(err.message || 'ส่ง Broadcast ไม่สำเร็จ');
    } finally {
      setBroadcastPromoId(null);
    }
  };

  return (
    <div className="space-y-5 page-enter">
      {/* ── Delete Confirm ── */}
      {deletePromoId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" style={{ animation: 'fade-in-up 0.2s ease-out' }}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="font-bold text-lg mb-1">ยืนยันการลบ?</h3>
            <p className="text-sm text-muted-foreground mb-5">ข่าวสารนี้จะถูกลบถาวร</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeletePromoId(null)}>ยกเลิก</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDelete}>ลบเลย</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Broadcast Confirm ── */}
      {broadcastPromoId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" style={{ animation: 'fade-in-up 0.2s ease-out' }}>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-1">ส่ง Broadcast?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ข่าวสารนี้จะถูกส่งแจ้งเตือนให้ลูกบ้านทุกคนทาง LINE ทันที
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setBroadcastPromoId(null)}>ยกเลิก</Button>
              <Button className="flex-1 gradient-btn text-white gap-2" onClick={confirmBroadcast}>
                <Send className="w-4 h-4" /> ส่งเลย
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ข่าวสาร & โปรโมชั่น</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            จัดการข่าวสารและโปรโมชั่น ส่งแจ้งเตือนลูกบ้านทาง LINE
          </p>
        </div>
        <Button
          className="gradient-btn text-white shrink-0 gap-2 rounded-xl"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="w-4 h-4" /> สร้างข่าวสารใหม่
        </Button>
      </div>

      {/* ── Create / Edit Form Modal ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg">{editingId ? 'แก้ไขข่าวสาร / โปรโมชั่น' : 'เพิ่มข่าวสาร / โปรโมชั่น'}</h2>
            <button onClick={closeForm} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">หัวข้อ</label>
              <input
                type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="เช่น โปรโมชั่นอยู่ฟรี 1 เดือน!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">รายละเอียด</label>
              <textarea
                rows={4} value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder="ใส่รายละเอียดโปรโมชั่น..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">วันที่เริ่ม</label>
                <input
                  type="date" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">วันที่สิ้นสุด</label>
                <input
                  type="date" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <input 
                type="checkbox" 
                id="auto-toggle"
                checked={isActiveAuto}
                onChange={(e) => setIsActiveAuto(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary border-primary/50"
              />
              <label htmlFor="auto-toggle" className="text-sm font-medium cursor-pointer flex-1">
                ตั้งเป็นโปรโมชั่นอัตโนมัติ (ให้บอทตอบกลับใน LINE ทันที)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">รูปภาพประกอบ</label>
              <label className={cn(
                'flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all',
                (image || existingImage) ? 'border-primary/50 bg-primary/5' : 'border-muted hover:border-primary/40 hover:bg-muted/30'
              )}>
                {image ? (
                  <>
                    <img src={URL.createObjectURL(image)} alt="Preview" className="w-full max-h-48 object-contain rounded-lg" />
                    <span className="text-xs text-muted-foreground">{image.name}</span>
                  </>
                ) : existingImage ? (
                  <>
                    <img src={existingImage.startsWith('data:') ? existingImage : `${API_BASE}${existingImage}`} alt="Current" className="w-full max-h-48 object-contain rounded-lg" />
                    <span className="text-xs text-muted-foreground">รูปภาพปัจจุบัน (คลิกเพื่อเปลี่ยน)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">คลิกเพื่อเลือกรูปภาพ (JPG, PNG)</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={closeForm}>ยกเลิก</Button>
              <Button type="submit" disabled={submitting} className="gradient-btn text-white gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </Button>
            </div>
          </form>
        </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        /* Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl overflow-hidden">
              <div className="shimmer aspect-video w-full" />
              <div className="p-5 space-y-2">
                <div className="shimmer h-5 w-3/4 rounded-lg" />
                <div className="shimmer h-3 w-full rounded" />
                <div className="shimmer h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : offline ? (
        /* Offline state */
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถเชื่อมต่อ Backend ได้</h3>
          <p className="text-sm text-muted-foreground mb-5">
            ตรวจสอบว่า Backend Server กำลังทำงานที่ <code className="bg-muted px-2 py-0.5 rounded text-xs">localhost:3001</code>
          </p>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={loadPromotions}>
            <Loader2 className="w-4 h-4" /> ลองใหม่
          </Button>
        </div>
      ) : promotions.length === 0 ? (
        /* Empty state */
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">ยังไม่มีข่าวสาร</h3>
          <p className="text-sm text-muted-foreground mb-5">สร้างข่าวสารหรือโปรโมชั่นแรกของคุณ</p>
          <Button className="gradient-btn text-white gap-2 rounded-xl" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> สร้างข่าวสาร
          </Button>
        </div>
      ) : (
        /* Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="glass-card rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Image */}
              <div className="aspect-video w-full relative overflow-hidden bg-primary/5">
                {promo.image_url ? (
                  <img
                    src={promo.image_url.startsWith('data:') ? promo.image_url : `${API_BASE}${promo.image_url}`}
                    alt={promo.name}
                    className="object-cover w-full h-full"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-primary/30" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Active Badge */}
                {promo.is_active_auto && new Date() >= new Date(promo.start_date) && (!promo.end_date || new Date() <= new Date(promo.end_date)) && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Active Now
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-base truncate mb-2">{promo.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] leading-relaxed">
                  {promo.description || 'ไม่มีรายละเอียด'}
                </p>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openEditForm(promo)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    title="แก้ไข"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletePromoId(promo.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setBroadcastPromoId(promo.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium gradient-btn text-white transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    บรอดแคสต์ LINE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
