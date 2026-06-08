'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Receipt, Loader2, Image as ImageIcon, Zap, Droplet } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [meters, setMeters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'booking' | 'monthly' | 'meters'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [invoiceSelections, setInvoiceSelections] = useState<Record<number, any>>({});
  const [generating, setGenerating] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

  // Verify Modal
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<'paid'|'partial'|'pending'>('paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [verifyReason, setVerifyReason] = useState<string>('');
  const [verifying, setVerifying] = useState(false);

  // Meter Modal
  const [isMeterOpen, setIsMeterOpen] = useState(false);
  const [meterReadings, setMeterReadings] = useState<any[]>([]);
  const [savingMeters, setSavingMeters] = useState(false);

  // Billing Test Modal States
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testRoomPrice, setTestRoomPrice] = useState('3500');
  const [testWaterUnits, setTestWaterUnits] = useState('5');
  const [testElecUnits, setTestElecUnits] = useState('80');
  const [testResult, setTestResult] = useState<any>(null);
  const [calculatingTest, setCalculatingTest] = useState(false);

  const handleTestCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      toast.error('กรุณาเลือกหอพัก');
      return;
    }
    setCalculatingTest(true);
    setTestResult(null);
    try {
      const res = await fetchApi<any>('/billing/invoices/test-calculate', {
        method: 'POST',
        body: JSON.stringify({
          property_id: Number(propertyId),
          room_price: Number(testRoomPrice || 0),
          water_units: Number(testWaterUnits || 0),
          elec_units: Number(testElecUnits || 0)
        })
      });
      setTestResult(res);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการทดสอบคำนวณ');
    } finally {
      setCalculatingTest(false);
    }
  };

  const loadData = async () => {
    try {
      const [invData, propData, roomData, meterData] = await Promise.all([
        fetchApi('/billing/invoices'),
        fetchApi('/properties'),
        fetchApi('/rooms'),
        fetchApi('/billing/meters')
      ]) as [any, any, any, any];
      setInvoices(invData);
      setProperties(propData);
      setRooms(roomData);
      setMeters(meterData);
      if (propData.length > 0 && !propertyId) setPropertyId(propData[0].id.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const data = await fetchApi('/billing/invoices/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          property_id: Number(propertyId),
          period_month: Number(periodMonth),
          period_year: Number(periodYear)
        })
      }) as any;
      setPreviewData(data);
      
      const initialSelections: Record<number, any> = {};
      data.forEach((p: any) => {
        initialSelections[p.room_id] = {
          selected: p.has_reading && !p.already_generated,
          maintenances: p.maintenances.map((m: any) => ({ ...m, selected: true })),
          manual_costs: []
        };
      });
      setInvoiceSelections(initialSelections);
      setIsDialogOpen(false);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmGenerate = async () => {
    setGenerating(true);
    try {
      const selectedInvoices = previewData.filter(p => invoiceSelections[p.room_id]?.selected).map(p => {
        const sel = invoiceSelections[p.room_id];
        return {
          tenant_id: p.tenant_id,
          room_id: p.room_id,
          room_price: p.room_price,
          maintenances: sel.maintenances.filter((m: any) => m.selected),
          manual_costs: sel.manual_costs
        };
      });

      if (selectedInvoices.length === 0) {
        toast.error('กรุณาเลือกห้องที่ต้องการสร้างบิลอย่างน้อย 1 ห้อง');
        setGenerating(false);
        return;
      }

      await fetchApi('/billing/invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          property_id: Number(propertyId),
          period_month: Number(periodMonth),
          period_year: Number(periodYear),
          invoices: selectedInvoices
        })
      });
      toast.success(t('invoiceCreated') || 'สร้างใบแจ้งหนี้สำเร็จ!');
      setIsPreviewOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setVerifying(true);
    try {
      await fetchApi(`/billing/invoices/${selectedInvoice.id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({
          status: verifyStatus,
          paid_amount: verifyStatus === 'paid' ? selectedInvoice.total : paidAmount,
          reason: verifyReason
        })
      });
      toast.success('ตรวจสอบสลิปสำเร็จ! ระบบแจ้งผู้เช่าแล้ว');
      setIsVerifyOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const openVerifyModal = (inv: any) => {
    setSelectedInvoice(inv);
    setVerifyStatus('paid');
    setPaidAmount(inv.total);
    setVerifyReason('');
    setIsVerifyOpen(true);
  };

  const openMeterModal = (month?: number, year?: number) => {
    if (month) setPeriodMonth(month);
    if (year) setPeriodYear(year);
    setIsMeterOpen(true);
  };

  const loadPeriodMeters = async () => {
    try {
      const res = await fetchApi(`/billing/meters/period?month=${periodMonth}&year=${periodYear}`) as any[];
      setMeterReadings(res);
    } catch (err) {
      console.error('Failed to load period meters:', err);
    }
  };

  useEffect(() => {
    if (!isMeterOpen) return;
    loadPeriodMeters();
  }, [isMeterOpen, periodMonth, periodYear]);

  // Auto-generate reply patterns for Verify Modal
  useEffect(() => {
    if (!selectedInvoice) return;
    
    if (verifyStatus === 'partial') {
      const missingAmount = parseFloat(selectedInvoice.total) - paidAmount;
      if (missingAmount > 0) {
        setVerifyReason(`ยอดเงินโอนค่าบิลเลขที่ ${selectedInvoice.invoice_number} ขาดอีก ${missingAmount.toLocaleString()} บาท รบกวนโอนยอดให้ครบพร้อมแนบสลิปส่งกลับมาด้วยนะคะ`);
      }
    } else if (verifyStatus === 'pending') {
      setVerifyReason('ไม่พบยอดเงินเข้า หรือ สลิปไม่ถูกต้อง รบกวนตรวจสอบและแนบสลิปที่ถูกต้องส่งกลับมาอีกครั้งนะคะ');
    } else {
      setVerifyReason('');
    }
  }, [verifyStatus, paidAmount, selectedInvoice]);

  const handleMeterChange = (roomId: number, field: 'water_current' | 'elec_current', value: string) => {
    const numValue = value !== '' ? parseFloat(value) : null;
    setMeterReadings(prev => prev.map(m => {
      if (m.room_id === roomId) {
        const updated = { ...m, [field]: numValue };
        
        // Dynamically compute units
        if (field === 'water_current') {
          updated.water_units = (numValue !== null && numValue >= m.water_previous) 
            ? Number((numValue - m.water_previous).toFixed(2)) 
            : 0;
        } else if (field === 'elec_current') {
          updated.elec_units = (numValue !== null && numValue >= m.elec_previous) 
            ? Number((numValue - m.elec_previous).toFixed(2)) 
            : 0;
        }
        return updated;
      }
      return m;
    }));
  };

  const handleMeterPreviousChange = (roomId: number, field: 'water_previous' | 'elec_previous', value: string) => {
    const numValue = value !== '' ? parseFloat(value) : 0;
    setMeterReadings(prev => prev.map(m => {
      if (m.room_id === roomId) {
        const updated = { ...m, [field]: numValue };
        
        // Dynamically compute units
        if (field === 'water_previous') {
          updated.water_units = (m.water_current !== null && m.water_current >= numValue) 
            ? Number((m.water_current - numValue).toFixed(2)) 
            : 0;
        } else if (field === 'elec_previous') {
          updated.elec_units = (m.elec_current !== null && m.elec_current >= numValue) 
            ? Number((m.elec_current - numValue).toFixed(2)) 
            : 0;
        }
        return updated;
      }
      return m;
    }));
  };

  const saveMeters = async () => {
    setSavingMeters(true);
    try {
      // Filter out empty readings
      const validReadings = meterReadings.filter(m => m.water_current !== null || m.elec_current !== null);
      if (validReadings.length === 0) {
        toast.error('กรุณากรอกข้อมูลอย่างน้อย 1 ห้อง');
        setSavingMeters(false);
        return;
      }
      
      await fetchApi('/billing/meters', {
        method: 'POST',
        body: JSON.stringify({
          period_month: periodMonth,
          period_year: periodYear,
          readings: validReadings
        })
      });
      toast.success('บันทึกเลขมิเตอร์สำเร็จ!');
      setIsMeterOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingMeters(false);
    }
  };

  const hasValidationError = meterReadings.some(m => {
    const isWaterInvalid = m.water_current !== null && m.water_current !== undefined && Number(m.water_current) < Number(m.water_previous);
    const isElecInvalid = m.elec_current !== null && m.elec_current !== undefined && Number(m.elec_current) < Number(m.elec_previous);
    return isWaterInvalid || isElecInvalid;
  });

  const filteredInvoices = invoices.filter(inv => {
    if (activeTab === 'all') return true;
    const isBooking = inv.notes === 'ค่ามัดจำและค่าเช่าล่วงหน้า (จองห้อง)';
    if (activeTab === 'booking') return isBooking;
    if (activeTab === 'monthly') return !isBooking;
    return true;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✓ จ่ายแล้ว</span>;
    if (status === 'partial') return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">⚠ โอนไม่ครบ</span>;
    if (status === 'awaiting_verification') return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">🔍 รอตรวจสลิป</span>;
    if (status === 'pending') return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">⏳ รอชำระ</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">🔴 ค้างชำระ</span>;
  };

  return (
    <div className="space-y-5 page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('billingTitle') || 'ใบแจ้งหนี้และบิลค่าเช่า'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('billingDesc') || 'จัดการใบแจ้งหนี้ ตรวจสอบสลิปโอนเงิน และจดมิเตอร์'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl gap-2 border-dashed" onClick={() => setIsTestOpen(true)}>
            <Zap className="w-4 h-4 text-amber-500 animate-pulse" />ทดสอบคำนวณบิล
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => openMeterModal()}>
            💧จดมิเตอร์
          </Button>
          <Button className="gradient-btn text-white shrink-0 rounded-xl gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            สร้างใบแจ้งหนี้
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/50 p-1 rounded-xl gap-1 w-max">
        {(['all', 'booking', 'monthly', 'meters'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab === 'all' ? `ทั้งหมด (${invoices.length})` : tab === 'booking' ? 'จองห้อง' : tab === 'monthly' ? 'รายเดือน' : '💧 มิเตอร์'}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {activeTab === 'meters' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4">ห้อง</th>
                  <th className="px-6 py-4">เดือน/ปี</th>
                  <th className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1"><Droplet className="w-4 h-4 text-blue-500" /> ค่าน้ำ (หน่วย)</div></th>
                  <th className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1"><Zap className="w-4 h-4 text-orange-500" /> ค่าไฟ (หน่วย)</div></th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {meters.length > 0 ? meters.map((m: any) => (
                  <tr key={m.id} className="bg-card hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-semibold">{m.Room?.room_number || m.room?.room_number || m.room_id}</td>
                    <td className="px-6 py-4 font-medium">{m.period_month}/{m.period_year}</td>
                    <td className="px-6 py-4 text-center text-blue-600">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground">{m.water_previous || 0} → {m.water_current || 0}</span>
                        <span className="font-bold">({m.water_units || 0} หน่วย)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-orange-600">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground">{m.elec_previous || 0} → {m.elec_current || 0}</span>
                        <span className="font-bold">({m.elec_units || 0} หน่วย)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openMeterModal(m.period_month, m.period_year)}>
                        แก้ไข
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">ไม่มีข้อมูลมิเตอร์</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">เลขที่บิล</th>
                <th className="px-6 py-4 font-medium">ห้องพัก</th>
                <th className="px-6 py-4 font-medium">รายละเอียด</th>
                <th className="px-6 py-4 font-medium">ยอดรวม</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">ไม่มีข้อมูลใบแจ้งหนี้</td></tr>
              ) : filteredInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-base">{inv.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">ห้อง {inv.Room?.room_number}</td>
                  <td className="px-6 py-4">
                    {inv.notes === 'ค่ามัดจำและค่าเช่าล่วงหน้า (จองห้อง)' ? (
                      <span className="text-orange-500 font-medium">มัดจำ/แรกเข้า</span>
                    ) : (
                      <div className="text-xs space-y-1">
                        <div>ค่าห้อง: ฿{parseFloat(inv.room_price || 0).toLocaleString()}</div>
                        <div className="text-blue-500">ค่าน้ำ: ฿{parseFloat(inv.water_amount || 0).toLocaleString()}</div>
                        <div className="text-red-500">ค่าไฟ: ฿{parseFloat(inv.elec_amount || 0).toLocaleString()}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-base">฿{parseFloat(inv.total).toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                  <td className="px-6 py-4 text-right">
                    {inv.status === 'awaiting_verification' ? (
                      <Button size="sm" onClick={() => openVerifyModal(inv)} className="bg-blue-600 hover:bg-blue-700">ตรวจสลิป</Button>
                    ) : (inv.Payments && inv.Payments.length > 0) || (inv.payments && inv.payments.length > 0) ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openVerifyModal(inv)}>ดูสลิป</Button>
                        {inv.pdf_url && <Button variant="ghost" size="sm" onClick={() => window.open(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') + inv.pdf_url, '_blank')}>ดูบิล</Button>}
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => inv.pdf_url ? window.open(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') + inv.pdf_url, '_blank') : openVerifyModal(inv)}>
                        ดูรายละเอียด
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Verify Slip Modal */}
      {isVerifyOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-2xl shadow-xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex-1 bg-muted/30 rounded-lg border flex items-center justify-center p-2 min-h-[300px]">
              {(selectedInvoice.Payments && selectedInvoice.Payments.length > 0) || (selectedInvoice.payments && selectedInvoice.payments.length > 0) ? (
                <img 
                  src={(selectedInvoice.Payments?.[0] || selectedInvoice.payments?.[0])?.slip_image?.startsWith('data:') 
                    ? (selectedInvoice.Payments?.[0] || selectedInvoice.payments?.[0])?.slip_image 
                    : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '')}${(selectedInvoice.Payments?.[0] || selectedInvoice.payments?.[0])?.slip_image}`} 
                  alt="Slip" 
                  className="max-w-full max-h-[600px] object-contain rounded-md"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>ไม่พบรูปภาพสลิป</p>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">ตรวจสอบการชำระเงิน</h3>
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-md">
                <span className="text-muted-foreground">เลขที่บิล:</span> <span className="font-medium">{selectedInvoice.invoice_number}</span>
                <span className="text-muted-foreground">ห้อง:</span> <span className="font-medium">{selectedInvoice.Room?.room_number}</span>
                <span className="text-muted-foreground">ยอดเรียกเก็บ:</span> <span className="font-bold text-lg text-primary">฿{parseFloat(selectedInvoice.total).toLocaleString()}</span>
              </div>
              
              <form onSubmit={handleVerify} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">ผลการตรวจสอบสลิป</label>
                  <select 
                    value={verifyStatus} 
                    onChange={e => setVerifyStatus(e.target.value as any)} 
                    className="w-full border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="paid">✅ อนุมัติ (โอนยอดครบถ้วน)</option>
                    <option value="partial">⚠️ จ่ายไม่ครบ (ให้โอนเพิ่ม)</option>
                    <option value="pending">❌ ปฏิเสธ (สลิปไม่ถูกต้อง)</option>
                  </select>
                </div>

                {verifyStatus === 'partial' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block text-orange-600">จำนวนเงินที่ได้รับจริง (บาท)</label>
                    <input 
                      type="number" 
                      required 
                      value={paidAmount} 
                      onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} 
                      className="w-full border-orange-200 focus:border-orange-500 rounded-md px-3 py-2" 
                    />
                  </div>
                )}

                {verifyStatus !== 'paid' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block text-red-600">เหตุผลที่แจ้งให้ผู้เช่าทราบ (ส่งเข้า LINE)</label>
                    <textarea 
                      required
                      value={verifyReason}
                      onChange={e => setVerifyReason(e.target.value)}
                      placeholder={verifyStatus === 'partial' ? "เช่น ขาดอีก 500 บาท" : "เช่น ภาพไม่ชัด, ชื่อบัญชีผิด"}
                      className="w-full border-red-200 focus:border-red-500 rounded-md px-3 py-2 min-h-[80px]" 
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsVerifyOpen(false)}>ปิดหน้าต่าง</Button>
                  <Button type="submit" disabled={verifying} className={
                    verifyStatus === 'paid' ? 'bg-green-600 hover:bg-green-700' :
                    verifyStatus === 'partial' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  }>
                    {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {verifyStatus === 'paid' ? 'ยืนยันและอนุมัติ' : 'ส่งแจ้งเตือนทางไลน์'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Meter Recording Modal */}
      {isMeterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              จดมิเตอร์น้ำและไฟฟ้า
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4 bg-muted/50 p-4 rounded-lg shrink-0">
              <div>
                <label className="text-sm font-medium">เดือน (Month)</label>
                <input type="number" min="1" max="12" value={periodMonth} onChange={e => setPeriodMonth(parseInt(e.target.value) || 1)} className="w-full mt-1 border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">ปี (Year)</label>
                <input type="number" value={periodYear} onChange={e => setPeriodYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-full mt-1 border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3">ห้อง</th>
                    <th className="px-4 py-3"><Droplet className="w-4 h-4 inline mr-1 text-blue-500" /> เลขมิเตอร์น้ำ (หน่วย)</th>
                    <th className="px-4 py-3"><Zap className="w-4 h-4 inline mr-1 text-yellow-500" /> เลขมิเตอร์ไฟ (หน่วย)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {meterReadings.map(m => {
                    const isWaterInvalid = m.water_current !== null && m.water_current !== undefined && Number(m.water_current) < Number(m.water_previous);
                    const isElecInvalid = m.elec_current !== null && m.elec_current !== undefined && Number(m.elec_current) < Number(m.elec_previous);
                    return (
                      <tr key={m.room_id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold">ห้อง {m.room_number}</div>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            m.status === 'occupied' 
                              ? "bg-primary/10 text-primary" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {m.status === 'occupied' ? 'มีผู้เช่า' : 'ว่าง'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>ก่อนหน้า:</span>
                              <input 
                                type="number"
                                step="0.01"
                                value={m.water_previous !== null && m.water_previous !== undefined ? m.water_previous : ''}
                                onChange={e => handleMeterPreviousChange(m.room_id, 'water_previous', e.target.value)}
                                className="border rounded px-2 py-0.5 w-[95px] text-xs h-6 text-foreground bg-background focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                placeholder="ค่าก่อนหน้า"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                step="0.01"
                                value={m.water_current !== null && m.water_current !== undefined ? m.water_current : ''} 
                                onChange={e => handleMeterChange(m.room_id, 'water_current', e.target.value)}
                                placeholder="เลขมิเตอร์น้ำล่าสุด"
                                className={cn(
                                  "border rounded-md px-3 py-1 w-full max-w-[140px] text-sm h-9",
                                  isWaterInvalid 
                                    ? "border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/50" 
                                    : "focus:border-blue-500"
                                )}
                              />
                              {!isWaterInvalid && (
                                <span className="text-xs text-blue-600 font-semibold shrink-0">
                                  {m.water_units !== null && m.water_units !== undefined && m.water_units > 0 ? `(+${m.water_units} หน่วย)` : '(0 หน่วย)'}
                                </span>
                              )}
                            </div>
                            {isWaterInvalid && (
                              <span className="text-[10px] text-rose-500 block mt-0.5 font-medium">ค่าปัจจุบันต้องไม่น้อยกว่าค่าก่อนหน้า</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>ก่อนหน้า:</span>
                              <input 
                                type="number"
                                step="0.01"
                                value={m.elec_previous !== null && m.elec_previous !== undefined ? m.elec_previous : ''}
                                onChange={e => handleMeterPreviousChange(m.room_id, 'elec_previous', e.target.value)}
                                className="border rounded px-2 py-0.5 w-[95px] text-xs h-6 text-foreground bg-background focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                                placeholder="ค่าก่อนหน้า"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                step="0.01"
                                value={m.elec_current !== null && m.elec_current !== undefined ? m.elec_current : ''} 
                                onChange={e => handleMeterChange(m.room_id, 'elec_current', e.target.value)}
                                placeholder="เลขมิเตอร์ไฟล่าสุด"
                                className={cn(
                                  "border rounded-md px-3 py-1 w-full max-w-[140px] text-sm h-9",
                                  isElecInvalid 
                                    ? "border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/50" 
                                    : "focus:border-yellow-500"
                                )}
                              />
                              {!isElecInvalid && (
                                <span className="text-xs text-orange-600 font-semibold shrink-0">
                                  {m.elec_units !== null && m.elec_units !== undefined && m.elec_units > 0 ? `(+${m.elec_units} หน่วย)` : '(0 หน่วย)'}
                                </span>
                              )}
                            </div>
                            {isElecInvalid && (
                              <span className="text-[10px] text-rose-500 block mt-0.5 font-medium">ค่าปัจจุบันต้องไม่น้อยกว่าค่าก่อนหน้า</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {meterReadings.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">ไม่มีข้อมูลห้องพัก</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                เคล็ดลับ: จดเลขมิเตอร์เสร็จแล้ว ให้กดปุ่ม <b>"สร้างใบแจ้งหนี้"</b> ในหน้าหลัก ระบบจะคำนวณเงินให้อัตโนมัติ
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsMeterOpen(false)}>ยกเลิก</Button>
                <Button onClick={saveMeters} disabled={savingMeters || meterReadings.length === 0 || hasValidationError}>
                  {savingMeters && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึกข้อมูลมิเตอร์
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal - Step 1: Select Month/Year */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('generateInvoicesTitle') || 'สร้างใบแจ้งหนี้รายเดือน'}</h3>
            <form onSubmit={handleGeneratePreview} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('property') || 'หอพัก'}</label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('month') || 'เดือน'}</label>
                  <input type="number" min="1" max="12" required value={periodMonth} onChange={e => setPeriodMonth(parseInt(e.target.value) || 1)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('year') || 'ปี'}</label>
                  <input type="number" required value={periodYear} onChange={e => setPeriodYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel') || 'ยกเลิก'}</Button>
                <Button type="submit" disabled={generating} className="gradient-btn text-white">
                  {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  ตรวจสอบข้อมูล (Preview)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generation Modal - Step 2: Preview & Select */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b">
              <h3 className="text-xl font-bold">ตรวจสอบก่อนสร้างใบแจ้งหนี้ (ดึงข้อมูลแจ้งซ่อม)</h3>
              <p className="text-sm text-muted-foreground">รอบเดือน {periodMonth}/{periodYear}</p>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {previewData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ไม่มีห้องที่พร้อมสร้างบิล</p>
              ) : (
                previewData.map(p => {
                  const sel = invoiceSelections[p.room_id];
                  const canGenerate = p.has_reading && !p.already_generated;
                  return (
                    <div key={p.room_id} className={`border rounded-xl p-4 transition-colors ${!canGenerate ? 'bg-muted/50 opacity-75' : sel?.selected ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            disabled={!canGenerate}
                            checked={sel?.selected || false} 
                            onChange={e => setInvoiceSelections(prev => ({
                              ...prev,
                              [p.room_id]: { ...prev[p.room_id], selected: e.target.checked }
                            }))}
                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <div className="font-bold text-lg">ห้อง {p.room_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {p.already_generated ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> สร้างบิลแล้ว</span>
                              ) : !p.has_reading ? (
                                <span className="text-rose-500 font-medium flex items-center gap-1"><Droplet className="w-3.5 h-3.5" /> ขาดเลขมิเตอร์น้ำ/ไฟ</span>
                              ) : (
                                <span className="text-blue-600 font-medium">พร้อมสร้างบิล</span>
                              )}
                            </div>
                          </div>
                        </label>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">ค่าห้องพัก</div>
                          <div className="font-semibold text-primary">฿{p.room_price.toLocaleString()}</div>
                        </div>
                      </div>

                      {canGenerate && sel?.selected && (
                        <div className="mt-4 pt-4 border-t space-y-3 pl-8">
                          {p.maintenances.length > 0 && (
                            <div className="bg-orange-50/50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/50">
                              <div className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-1.5">
                                <Zap className="w-4 h-4" /> รายการซ่อมแซมค้างชำระ (Suggest & Select)
                              </div>
                              <div className="space-y-2">
                                {sel.maintenances.map((m: any, idx: number) => (
                                  <label key={idx} className="flex items-center justify-between text-sm cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-900/50 p-1.5 rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={m.selected} 
                                        onChange={e => {
                                          const newM = [...sel.maintenances];
                                          newM[idx].selected = e.target.checked;
                                          setInvoiceSelections(prev => ({
                                            ...prev, [p.room_id]: { ...prev[p.room_id], maintenances: newM }
                                          }));
                                        }}
                                      />
                                      <span>{m.title}</span>
                                    </div>
                                    <span className="font-medium text-orange-700 dark:text-orange-400">+฿{Number(m.cost).toLocaleString()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            {sel.manual_costs.map((mc: any, idx: number) => (
                              <div key={idx} className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="ชื่อรายการ เช่น ค่าปรับ" 
                                  value={mc.title}
                                  onChange={e => {
                                    const newMC = [...sel.manual_costs];
                                    newMC[idx].title = e.target.value;
                                    setInvoiceSelections(prev => ({ ...prev, [p.room_id]: { ...prev[p.room_id], manual_costs: newMC } }));
                                  }}
                                  className="flex-1 border rounded px-2 py-1 text-sm"
                                />
                                <input 
                                  type="number" 
                                  placeholder="จำนวนเงิน" 
                                  value={mc.cost}
                                  onChange={e => {
                                    const newMC = [...sel.manual_costs];
                                    newMC[idx].cost = e.target.value;
                                    setInvoiceSelections(prev => ({ ...prev, [p.room_id]: { ...prev[p.room_id], manual_costs: newMC } }));
                                  }}
                                  className="w-24 border rounded px-2 py-1 text-sm"
                                />
                                <Button variant="ghost" size="sm" onClick={() => {
                                  const newMC = sel.manual_costs.filter((_: any, i: number) => i !== idx);
                                  setInvoiceSelections(prev => ({ ...prev, [p.room_id]: { ...prev[p.room_id], manual_costs: newMC } }));
                                }} className="h-7 w-7 p-0 text-red-500"><Zap className="w-4 h-4" /></Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-dashed" onClick={() => {
                              const newMC = [...sel.manual_costs, { title: '', cost: '' }];
                              setInvoiceSelections(prev => ({ ...prev, [p.room_id]: { ...prev[p.room_id], manual_costs: newMC } }));
                            }}>
                              <Plus className="w-3 h-3 mr-1" /> เพิ่มรายการอื่น ๆ (เช่น ค่าปรับ)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-5 border-t bg-muted/30 flex justify-between items-center">
              <div className="text-sm font-medium">
                เลือกห้องที่พร้อมสร้างบิล: <span className="text-primary font-bold text-lg">{previewData.filter(p => invoiceSelections[p.room_id]?.selected).length}</span> ห้อง
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsPreviewOpen(false)}>{t('cancel') || 'ยกเลิก'}</Button>
                <Button type="button" onClick={handleConfirmGenerate} disabled={generating || previewData.filter(p => invoiceSelections[p.room_id]?.selected).length === 0} className="gradient-btn text-white">
                  {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  ยืนยันสร้างใบแจ้งหนี้
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Test Modal */}
      {isTestOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl w-full max-w-md shadow-2xl border flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                  ทดสอบคำนวณบิลค่าเช่า
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">ใช้เช็คพฤติกรรมการคำนวณยอดเงินและอัตราค่าน้ำ/ไฟจริง</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsTestOpen(false);
                  setTestResult(null);
                }} 
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleTestCalculate} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">หอพัก (Property)</label>
                <select 
                  value={propertyId} 
                  onChange={e => setPropertyId(e.target.value)} 
                  className="w-full border rounded-xl px-3 py-2 bg-background text-sm border-border focus:ring-2 focus:ring-primary/30 outline-none"
                >
                  <option value="">-- เลือกหอพัก --</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-semibold mb-1 block">ราคาห้องพักพื้นฐาน (บาท)</label>
                <input 
                  type="number" 
                  required 
                  value={testRoomPrice} 
                  onChange={e => setTestRoomPrice(e.target.value)} 
                  className="w-full border rounded-xl px-3 py-2 bg-background text-sm border-border focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="เช่น 3500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">จำนวนหน่วยน้ำที่ใช้</label>
                  <input 
                    type="number" 
                    required 
                    value={testWaterUnits} 
                    onChange={e => setTestWaterUnits(e.target.value)} 
                    className="w-full border rounded-xl px-3 py-2 bg-background text-sm border-border focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="เช่น 5"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">จำนวนหน่วยไฟที่ใช้</label>
                  <input 
                    type="number" 
                    required 
                    value={testElecUnits} 
                    onChange={e => setTestElecUnits(e.target.value)} 
                    className="w-full border rounded-xl px-3 py-2 bg-background text-sm border-border focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="เช่น 80"
                  />
                </div>
              </div>

              <Button type="submit" disabled={calculatingTest || !propertyId} className="w-full gradient-btn text-white py-2 rounded-xl">
                {calculatingTest && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                คำนวณยอดทดสอบ
              </Button>
            </form>

            {testResult && (
              <div className="p-5 border-t bg-muted/20 space-y-3">
                <h4 className="font-bold text-sm text-foreground">ผลการคำนวณเงินจำลอง ({testResult.property_name})</h4>
                <div className="text-xs space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>ค่าห้องพัก:</span>
                    <span className="font-semibold text-foreground">฿{parseFloat(testResult.room_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าน้ำประปา ({testResult.water_units} หน่วย × ฿{testResult.water_rate}/หน่วย):</span>
                    <span className="font-semibold text-foreground">฿{parseFloat(testResult.water_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าไฟฟ้า ({testResult.elec_units} หน่วย × ฿{testResult.elec_rate}/หน่วย):</span>
                    <span className="font-semibold text-foreground">฿{parseFloat(testResult.elec_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-dashed my-2 pt-2 flex justify-between text-sm font-bold text-foreground">
                    <span>ยอดรวมสุทธิ:</span>
                    <span className="text-primary text-base">฿{parseFloat(testResult.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
