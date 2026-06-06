'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Droplets, Save, MessageCircle, ShieldCheck, WifiOff, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLine, setSavingLine] = useState(false);
  
  const [elecRate, setElecRate] = useState('');
  const [waterRate, setWaterRate] = useState('');
  
  // LINE credentials (editable, loaded from property)
  const [lineToken, setLineToken] = useState('');
  const [lineSecret, setLineSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [lineConfigured, setLineConfigured] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setOffline(false);
    try {
      // Load settings (rates)
      const data = await fetchApi<any>('/settings');
      if (data?.elec_rate) setElecRate(data.elec_rate);
      if (data?.water_rate) setWaterRate(data.water_rate);

      // Load current property to get LINE credentials
      const properties = await fetchApi<any[]>('/properties');
      if (Array.isArray(properties) && properties.length > 0) {
        // Use selected property or first one
        let selectedProp = properties[0];
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('selected_property') || localStorage.getItem('impersonated_property');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const found = properties.find((p: any) => p.id === parsed.id);
              if (found) selectedProp = found;
            } catch {}
          }
        }
        setPropertyId(selectedProp.id);
        setLineToken(selectedProp.line_channel_access_token || '');
        setLineSecret(selectedProp.line_channel_secret || '');
        setLineConfigured(!!(selectedProp.line_channel_access_token && selectedProp.line_channel_secret));
      }
    } catch (err: any) {
      if (err.message?.includes('เชื่อมต่อเซิร์ฟเวอร์')) {
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/settings', {
        method: 'POST',
        body: JSON.stringify({ elec_rate: elecRate, water_rate: waterRate })
      });
      toast.success(t('settingsSaved') || 'บันทึกการตั้งค่าสำเร็จ ✓');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      toast.error('ไม่พบข้อมูลหอพัก กรุณารีเฟรชหน้า');
      return;
    }
    setSavingLine(true);
    try {
      await fetchApi(`/properties/${propertyId}`, {
        method: 'PUT',
        body: JSON.stringify({
          line_channel_access_token: lineToken,
          line_channel_secret: lineSecret
        })
      });
      toast.success('บันทึกการตั้งค่า LINE สำเร็จ ✓');
      setLineConfigured(!!(lineToken && lineSecret));
    } catch (err: any) {
      toast.error(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingLine(false);
    }
  };

  return (
    <div className="space-y-6 page-enter max-w-5xl">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('settingsDesc')}</p>
      </div>

      {offline && (
        <div className="glass-card rounded-2xl py-8 px-6 flex items-center gap-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">ทำงานในโหมด Offline</h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80">ไม่สามารถดึงข้อมูลจาก Backend ได้ คุณจะไม่สามารถบันทึกการตั้งค่าได้ในขณะนี้</p>
          </div>
          <Button variant="outline" className="ml-auto shrink-0 bg-white dark:bg-black/20" onClick={loadData}>ลองเชื่อมต่อใหม่</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Rates Settings ── */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('pricingRates')}</h2>
              <p className="text-sm text-muted-foreground">ตั้งค่าหน่วยละกี่บาท</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {loading ? (
              <div className="space-y-4">
                <div className="shimmer h-12 w-full rounded-xl" />
                <div className="shimmer h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> {t('elecRate')}
                  </label>
                  <div className="relative">
                    <input 
                      type="number" min="0" step="0.1" required
                      value={elecRate} onChange={e => setElecRate(e.target.value)} 
                      className="w-full border rounded-xl pl-4 pr-12 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder={t('eg8')} 
                      disabled={offline}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">บาท</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" /> {t('waterRate')}
                  </label>
                  <div className="relative">
                    <input 
                      type="number" min="0" step="0.1" required
                      value={waterRate} onChange={e => setWaterRate(e.target.value)} 
                      className="w-full border rounded-xl pl-4 pr-12 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder={t('eg18')} 
                      disabled={offline}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">บาท</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={saving || offline} className="w-full gradient-btn text-white gap-2 rounded-xl py-6">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('saveSettings')}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* ── LINE Integration (Editable) ── */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#00B900]/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#00B900]" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('lineIntegration')}</h2>
              <p className="text-sm text-muted-foreground">เชื่อมต่อ LINE Official Account</p>
            </div>
          </div>

          <form onSubmit={handleSaveLine} className="space-y-5 flex-1 flex flex-col">
            {loading ? (
              <div className="space-y-4">
                <div className="shimmer h-12 w-full rounded-xl" />
                <div className="shimmer h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Channel Access Token</label>
                  <div className="relative">
                    <input 
                      type={showToken ? 'text' : 'password'}
                      value={lineToken}
                      onChange={e => setLineToken(e.target.value)}
                      className="w-full border rounded-xl px-4 py-2.5 pr-10 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00B900]/40"
                      placeholder="วาง Channel Access Token ที่นี่"
                      disabled={offline}
                    />
                    <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('channelSecret')}</label>
                  <div className="relative">
                    <input 
                      type={showSecret ? 'text' : 'password'}
                      value={lineSecret}
                      onChange={e => setLineSecret(e.target.value)}
                      className="w-full border rounded-xl px-4 py-2.5 pr-10 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00B900]/40"
                      placeholder="วาง Channel Secret ที่นี่"
                      disabled={offline}
                    />
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ดึงค่าเหล่านี้จาก <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-[#00B900] underline hover:no-underline">LINE Developers Console</a> → Messaging API
                </p>
                <div className="pt-2 mt-auto">
                  <Button type="submit" disabled={savingLine || offline} className="w-full bg-[#00B900] hover:bg-[#009900] text-white gap-2 rounded-xl py-6">
                    {savingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึกการตั้งค่า LINE
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="mt-5 pt-4 border-t flex items-center justify-between">
            {lineConfigured ? (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{t('lineConnected')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-amber-600 dark:text-amber-400">ยังไม่ได้ตั้งค่า — Bot จะยังไม่ทำงาน</span>
              </div>
            )}
            <ShieldCheck className={cn("w-5 h-5 opacity-50", lineConfigured ? "text-emerald-500" : "text-muted-foreground")} />
          </div>
        </div>
      </div>
    </div>
  );
}
