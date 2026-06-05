'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const data = await fetchApi('/promotions');
      setPromotions(data);
    } catch (error) {
      console.error('Error fetching promotions:', error);
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
      if (image) formData.append('image', image);

      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/promotions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Failed to create promotion');
      
      await loadPromotions();
      setFormOpen(false);
      setName('');
      setDescription('');
      setImage(null);
    } catch (error) {
      console.error(error);
      alert('Error creating promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบข่าวสาร/โปรโมชั่น?')) return;
    try {
      await fetchApi(`/promotions/${id}`, { method: 'DELETE' });
      await loadPromotions();
    } catch (error) {
      console.error(error);
      alert('Error deleting');
    }
  };

  const handleBroadcast = async (id: number) => {
    if (!confirm('ยืนยันส่งข่าวสารนี้ให้ผู้ใช้ทุกคนทาง LINE?')) return;
    try {
      await fetchApi(`/promotions/${id}/broadcast`, { method: 'POST' });
      alert('ส่ง Broadcast สำเร็จ!');
    } catch (error) {
      console.error(error);
      alert('Error broadcasting');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ข่าวสาร & โปรโมชั่น</h1>
          <p className="text-muted-foreground mt-2">จัดการข่าวสารและโปรโมชั่น และส่งแจ้งเตือนให้ลูกบ้านทาง LINE</p>
        </div>
        <button 
          onClick={() => setFormOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          + สร้างข่าวสารใหม่
        </button>
      </div>

      {formOpen && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">เพิ่มข่าวสาร/โปรโมชั่น</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">หัวข้อ</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
                placeholder="เช่น โปรโมชั่นอยู่ฟรี 1 เดือน!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">รายละเอียด (ข้อความ)</label>
              <textarea 
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
                placeholder="ใส่รายละเอียดโปรโมชั่น..."
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">รูปภาพประกอบ (รองรับ JPG, PNG)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setImage(e.target.files?.[0] || null)}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : promotions.length === 0 ? (
        <div className="text-center p-12 bg-muted/30 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground">ยังไม่มีข่าวสารหรือโปรโมชั่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map(promo => (
            <div key={promo.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {promo.image_url ? (
                <div className="aspect-video w-full relative overflow-hidden bg-muted">
                  <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${promo.image_url}`} alt={promo.name} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary/50 text-4xl">📢</span>
                </div>
              )}
              <div className="p-5">
                <h3 className="text-lg font-semibold truncate">{promo.name}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 min-h-[60px]">{promo.description || '-'}</p>
                
                <div className="mt-6 flex justify-between items-center gap-2">
                  <button 
                    onClick={() => handleDelete(promo.id)}
                    className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    ลบ
                  </button>
                  <button 
                    onClick={() => handleBroadcast(promo.id)}
                    className="bg-primary text-primary-foreground flex-1 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path></svg>
                    บรอดแคสต์เดี๋ยวนี้
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
