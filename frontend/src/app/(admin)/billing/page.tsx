'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Receipt, Loader2, Image as ImageIcon, Zap, Droplet } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function BillingPage() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'booking' | 'monthly'>('all');

  // Generation Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  const [meterReadings, setMeterReadings] = useState<{room_id: number, water_units?: number, elec_units?: number}[]>([]);
  const [savingMeters, setSavingMeters] = useState(false);

  const loadData = async () => {
    try {
      const [invData, propData, roomData] = await Promise.all([
        fetchApi('/billing/invoices'),
        fetchApi('/properties'),
        fetchApi('/rooms')
      ]);
      setInvoices(invData);
      setProperties(propData);
      setRooms(roomData);
      if (propData.length > 0 && !propertyId) setPropertyId(propData[0].id.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
      toast.success(t('invoiceCreated') || 'สร้างใบแจ้งหนี้สำเร็จ!');
      setIsDialogOpen(false);
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

  const openMeterModal = () => {
    // Filter only occupied rooms for metering
    const occupiedRooms = rooms.filter((r: any) => r.status === 'occupied');
    setMeterReadings(occupiedRooms.map((r: any) => ({ room_id: r.id, water_units: undefined, elec_units: undefined })));
    setIsMeterOpen(true);
  };

  const handleMeterChange = (roomId: number, field: 'water_units' | 'elec_units', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    setMeterReadings(prev => prev.map(m => m.room_id === roomId ? { ...m, [field]: numValue } : m));
  };

  const saveMeters = async () => {
    setSavingMeters(true);
    try {
      // Filter out empty readings
      const validReadings = meterReadings.filter(m => m.water_units !== undefined || m.elec_units !== undefined);
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingMeters(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (activeTab === 'all') return true;
    const isBooking = inv.notes === 'ค่ามัดจำและค่าเช่าล่วงหน้า (จองห้อง)';
    if (activeTab === 'booking') return isBooking;
    if (activeTab === 'monthly') return !isBooking;
    return true;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">จ่ายแล้ว</span>;
    if (status === 'partial') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">โอนไม่ครบ</span>;
    if (status === 'awaiting_verification') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">รอตรวจสลิป</span>;
    if (status === 'pending') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">รอชำระ</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">ค้างชำระ</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('billingTitle') || 'ใบแจ้งหนี้และบิลค่าเช่า'}</h2>
          <p className="text-muted-foreground">{t('billingDesc') || 'จัดการใบแจ้งหนี้ ตรวจสอบสลิปโอนเงิน และจดมิเตอร์'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openMeterModal}>จดมิเตอร์น้ำ/ไฟ</Button>
          <Button className="shrink-0" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            สร้างใบแจ้งหนี้
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-max">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}>ทั้งหมด</button>
        <button onClick={() => setActiveTab('booking')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'booking' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}>โอนจองห้อง</button>
        <button onClick={() => setActiveTab('monthly')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}>บิลรายเดือน</button>
      </div>

      <Card>
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
                    ) : inv.Payments && inv.Payments.length > 0 ? (
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
      </Card>

      {/* Verify Slip Modal */}
      {isVerifyOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-2xl shadow-xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex-1 bg-muted/30 rounded-lg border flex items-center justify-center p-2 min-h-[300px]">
              {selectedInvoice.Payments && selectedInvoice.Payments.length > 0 ? (
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${selectedInvoice.Payments[0].slip_image}`} 
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
                    const room = rooms.find((r: any) => r.id === m.room_id) as any;
                    return (
                      <tr key={m.room_id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">ห้อง {room?.room_number}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={m.water_units || ''} 
                            onChange={e => handleMeterChange(m.room_id, 'water_units', e.target.value)}
                            placeholder="กรอกเลขมิเตอร์"
                            className="border rounded-md px-3 py-1.5 w-full max-w-[150px] focus:border-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={m.elec_units || ''} 
                            onChange={e => handleMeterChange(m.room_id, 'elec_units', e.target.value)}
                            placeholder="กรอกเลขมิเตอร์"
                            className="border rounded-md px-3 py-1.5 w-full max-w-[150px] focus:border-yellow-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {meterReadings.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">ไม่มีห้องที่มีผู้เช่าอยู่เลย</td></tr>
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
                <Button onClick={saveMeters} disabled={savingMeters || meterReadings.length === 0}>
                  {savingMeters && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึกข้อมูลมิเตอร์
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal (Keep existing) */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('generateInvoicesTitle') || 'สร้างใบแจ้งหนี้รายเดือน'}</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
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
                <Button type="submit" disabled={generating}>
                  {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('generateBtn') || 'สร้างบิล'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
