'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elecRate, setElecRate] = useState('');
  const [waterRate, setWaterRate] = useState('');
  const [channelId, setChannelId] = useState('2010301594');
  const [channelSecret, setChannelSecret] = useState('');

  const loadData = async () => {
    try {
      const data = await fetchApi('/settings');
      if (data.elec_rate) setElecRate(data.elec_rate);
      if (data.water_rate) setWaterRate(data.water_rate);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi('/settings', {
        method: 'POST',
        body: JSON.stringify({ 
          elec_rate: elecRate, 
          water_rate: waterRate 
        })
      });
      toast.success(t('settingsSaved'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('settingsTitle')}</h2>
        <p className="text-muted-foreground">{t('settingsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('pricingRates')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('elecRate')}</Label>
                  <Input 
                    type="number" 
                    value={elecRate} 
                    onChange={e => setElecRate(e.target.value)} 
                    placeholder={t('eg8')} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('waterRate')}</Label>
                  <Input 
                    type="number" 
                    value={waterRate} 
                    onChange={e => setWaterRate(e.target.value)} 
                    placeholder={t('eg18')} 
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="mt-4">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveSettings')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('lineIntegration')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('channelId')}</Label>
              <Input 
                value={channelId} 
                onChange={e => setChannelId(e.target.value)} 
                readOnly 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('channelSecret')}</Label>
              <Input 
                type="password" 
                value="***************************" 
                readOnly 
                className="bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('lineConnected')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
