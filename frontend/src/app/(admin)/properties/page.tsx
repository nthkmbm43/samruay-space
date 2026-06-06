'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Plus, Loader2, WifiOff, X, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function PropertiesPage() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<any>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProperties = async () => {
    setLoading(true);
    setOffline(false);
    try {
      const data = await fetchApi<any[]>('/properties');
      setProperties(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.message?.includes('เชื่อมต่อเซิร์ฟเวอร์')) {
        setOffline(true);
      }
      // Silently fail without console.error to avoid Next.js overlay noise
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/properties', {
        method: 'POST',
        body: JSON.stringify({ name, address })
      });
      toast.success(t('propertyAdded') || 'เพิ่มหอพักสำเร็จ');
      setIsDialogOpen(false);
      setName('');
      setAddress('');
      loadProperties();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi(`/properties/${viewingProperty.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          name: viewingProperty.name, 
          address: viewingProperty.address,
          phone: viewingProperty.phone,
          is_active: viewingProperty.is_active,
          line_channel_access_token: viewingProperty.line_channel_access_token || '',
          line_channel_secret: viewingProperty.line_channel_secret || ''
        })
      });
      toast.success('อัปเดตหอพักสำเร็จ');
      setViewingProperty(null);
      loadProperties();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('propertiesDataTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('propertiesDesc')}</p>
        </div>
        <Button className="gradient-btn text-white shrink-0 gap-2 rounded-xl" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('addProperty')}
        </Button>
      </div>

      {/* ── Add Property Modal ── */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{t('addPropertyTitle')}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('propertyName')}</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t('egProperty')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('address')}</label>
                <textarea required value={address} onChange={e => setAddress(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" rows={3}></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving} className="gradient-btn text-white gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('saveProperty')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Property Modal ── */}
      {viewingProperty && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" style={{ animation: 'fade-in-up 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{t('editPropertyTitle')}</h3>
              <button onClick={() => setViewingProperty(null)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('propertyName')}</label>
                <input required value={viewingProperty.name || ''} onChange={e => setViewingProperty({...viewingProperty, name: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('address')}</label>
                <textarea required value={viewingProperty.address || ''} onChange={e => setViewingProperty({...viewingProperty, address: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" rows={3}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('phone')}</label>
                <input value={viewingProperty.phone || ''} onChange={e => setViewingProperty({...viewingProperty, phone: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" checked={viewingProperty.is_active} onChange={e => setViewingProperty({...viewingProperty, is_active: e.target.checked})} className="w-5 h-5 rounded border-muted text-primary focus:ring-primary" />
                <div>
                  <div className="text-sm font-medium">{t('active')}</div>
                  <div className="text-xs text-muted-foreground">เปิดใช้งานสาขานี้ในระบบ</div>
                </div>
              </label>

              {/* ── LINE Bot Configuration ── */}
              <div className="pt-4 mt-2 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-4 h-4 text-[#00B900]" />
                  <span className="text-sm font-semibold">ตั้งค่า LINE Bot</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Channel Access Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={viewingProperty.line_channel_access_token || ''}
                        onChange={e => setViewingProperty({...viewingProperty, line_channel_access_token: e.target.value})}
                        className="w-full border rounded-xl px-4 py-2.5 pr-10 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00B900]/40"
                        placeholder="กรอก Channel Access Token จาก LINE Developer"
                      />
                      <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Channel Secret</label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={viewingProperty.line_channel_secret || ''}
                        onChange={e => setViewingProperty({...viewingProperty, line_channel_secret: e.target.value})}
                        className="w-full border rounded-xl px-4 py-2.5 pr-10 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00B900]/40"
                        placeholder="กรอก Channel Secret จาก LINE Developer"
                      />
                      <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">ดึงค่าเหล่านี้จาก LINE Developers Console &gt; Messaging API</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setViewingProperty(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving} className="gradient-btn text-white gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('saveData')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="shimmer w-12 h-12 rounded-xl" />
                <div className="shimmer w-16 h-6 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="shimmer h-6 w-3/4 rounded" />
                <div className="shimmer h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : offline ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถเชื่อมต่อ Backend ได้</h3>
          <p className="text-sm text-muted-foreground mb-5">
            ตรวจสอบว่า Backend Server กำลังทำงานที่ <code className="bg-muted px-2 py-0.5 rounded text-xs">localhost:3001</code>
          </p>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={loadProperties}>
            <Loader2 className="w-4 h-4" /> ลองใหม่
          </Button>
        </div>
      ) : properties.length === 0 ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{t('noPropertiesData')}</h3>
          <p className="text-sm text-muted-foreground mb-5">{t('startAddingProperty')}</p>
          <Button className="gradient-btn text-white gap-2 rounded-xl" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" /> {t('addProperty')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => (
            <div key={prop.id} onClick={() => setViewingProperty(prop)} className="glass-card rounded-2xl p-6 cursor-pointer group hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  prop.is_active 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {prop.is_active ? t('active') : t('inactive')}
                </span>
              </div>
              
              <h3 className="text-lg font-bold mb-2 line-clamp-1">{prop.name}</h3>
              
              <div className="flex items-start gap-2 text-sm text-muted-foreground min-h-[40px] mb-4">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="line-clamp-2 leading-relaxed">{prop.address || t('noAddress')}</p>
              </div>

              <div className="pt-4 border-t flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('idLabel')} {prop.id}</span>
                <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('manage')} &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
