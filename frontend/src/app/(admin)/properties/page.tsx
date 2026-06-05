'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Plus, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PropertiesPage() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProperties = async () => {
    try {
      const data = await fetchApi('/properties');
      setProperties(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/properties', {
        method: 'POST',
        body: JSON.stringify({ name, address })
      });
      setIsDialogOpen(false);
      setName('');
      setAddress('');
      loadProperties();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('propertiesDataTitle')}</h2>
          <p className="text-muted-foreground">{t('propertiesDesc')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addProperty')}
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('addPropertyTitle')}</h3>
            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('propertyName')}</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" placeholder={t('egProperty')} />
              </div>
              <div>
                <label className="text-sm font-medium">{t('address')}</label>
                <textarea required value={address} onChange={e => setAddress(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" rows={3}></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveProperty')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingProperty && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('editPropertyTitle')}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await fetchApi(`/properties/${viewingProperty.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({ 
                    name: viewingProperty.name, 
                    address: viewingProperty.address,
                    phone: viewingProperty.phone,
                    is_active: viewingProperty.is_active
                  })
                });
                setViewingProperty(null);
                loadProperties();
              } catch (err: any) {
                alert(err.message);
              } finally {
                setSaving(false);
              }
            }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('propertyName')}</label>
                <input required value={viewingProperty.name || ''} onChange={e => setViewingProperty({...viewingProperty, name: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('address')}</label>
                <textarea required value={viewingProperty.address || ''} onChange={e => setViewingProperty({...viewingProperty, address: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" rows={3}></textarea>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('phone')}</label>
                <input value={viewingProperty.phone || ''} onChange={e => setViewingProperty({...viewingProperty, phone: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="isActive" checked={viewingProperty.is_active} onChange={e => setViewingProperty({...viewingProperty, is_active: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="isActive" className="text-sm font-medium">{t('active')}</label>
              </div>
              <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="ghost" onClick={() => setViewingProperty(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveData')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : properties.length === 0 ? (
        <div className="text-center p-12 border rounded-xl border-dashed">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-1">{t('noPropertiesData')}</h3>
          <p className="text-muted-foreground">{t('startAddingProperty')}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => (
            <Card key={prop.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${prop.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {prop.is_active ? t('active') : t('inactive')}
                  </span>
                </div>
                <CardTitle>{prop.name}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  {prop.address || t('noAddress')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t('idLabel')} {prop.id}</span>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); setViewingProperty(prop); }}>{t('manage')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
