'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, Receipt, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BillingPage() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [properties, setProperties] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [propertyId, setPropertyId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    try {
      const [invData, propData] = await Promise.all([
        fetchApi('/billing/invoices'),
        fetchApi('/properties')
      ]);
      setInvoices(invData);
      setProperties(propData);
      if (propData.length > 0 && !propertyId) setPropertyId(propData[0].id.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await fetchApi('/billing/invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          property_id: Number(propertyId),
          period_month: Number(periodMonth),
          period_year: Number(periodYear)
        })
      });
      setIsDialogOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('billingTitle')}</h2>
          <p className="text-muted-foreground">{t('billingDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">{t('logMeter')}</Button>
          <Button className="shrink-0" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('generateInvoices')}
          </Button>
        </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('generateInvoicesTitle')}</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('property')}</label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('month')}</label>
                  <input type="number" min="1" max="12" required value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('year')}</label>
                  <input type="number" required value={periodYear} onChange={e => setPeriodYear(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={generating}>
                  {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('generateBtn')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">{t('invoiceNo')}</th>
                <th className="px-6 py-4 font-medium">{t('room')}</th>
                <th className="px-6 py-4 font-medium">{t('dueDate')}</th>
                <th className="px-6 py-4 font-medium">{t('total')}</th>
                <th className="px-6 py-4 font-medium">{t('status')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('noInvoices')}</td></tr>
              ) : invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-base">{inv.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{t('room')} {inv.Room?.room_number}</td>
                  <td className="px-6 py-4">{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium">฿{parseFloat(inv.total).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status === 'paid' ? t('statusPaid') : inv.status === 'pending' ? t('statusPending') : t('statusOverdue')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8">{t('view')}</Button>
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
