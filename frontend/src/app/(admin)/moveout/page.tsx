'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Clock, Zap, CheckCircle2, XCircle, Loader2,
  WifiOff, ArrowUpDown, MessageSquare, User, DoorOpen, LogOut, Check,
  ArrowLeft, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/loading-skeleton';

const STATUS_CFG = {
  pending: { label: 'รอดำเนินการ', icon: Clock, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'ยอมรับเรื่องแล้ว', icon: Clock, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  inspected: { label: 'ตรวจห้องเสร็จสิ้น', icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'ปฏิเสธคำขอ', icon: XCircle, badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
} as const;

const formatDate = (dateInput: any, includeTime = false) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    try {
      return d.toLocaleDateString('th-TH', {
        dateStyle: 'medium',
        ...(includeTime ? { timeStyle: 'short' } : {})
      });
    } catch (localeErr) {
      // Fallback for environments lacking full ICU / dateStyle support
      const y = d.getFullYear() + 543;
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${day}/${m}/${y}`;
      if (includeTime) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${dateStr} ${hh}:${mm}`;
      }
      return dateStr;
    }
  } catch (e) {
    return '-';
  }
};

export default function MoveOutPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters, Search & Sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);

  // Dialog State
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setOffline(false);
    try {
      const data = await fetchApi<any[]>('/moveouts');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.message?.includes('เชื่อมต่อเซิร์ฟเวอร์')) {
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !targetStatus) return;

    setSaving(true);
    try {
      await fetchApi(`/moveouts/${selectedRequest.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: targetStatus,
          notes: notes.trim(),
        }),
      });

      toast.success('อัปเดตสถานะการย้ายออกและส่ง LINE แจ้งเตือนสำเร็จ ✓');
      setSelectedRequest(null);
      setNotes('');
      setTargetStatus('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Processing, filtering & sorting data
  const validRequests = Array.isArray(requests) ? requests.filter(Boolean) : [];
  
  // Autocomplete Suggestions logic
  const suggestions = searchQuery.trim() === '' ? [] : (() => {
    const sMap = new Map<string, { label: string; value: string }>();
    validRequests.forEach((req) => {
      const roomNum = req.room?.room_number;
      const tName = req.tenant?.user ? `${req.tenant.user.first_name} ${req.tenant.user.last_name}` : null;
      const q = searchQuery.toLowerCase().trim();

      if (roomNum && roomNum.toLowerCase().includes(q)) {
        sMap.set(`room-${roomNum}`, { label: `ห้อง ${roomNum}`, value: roomNum });
      }
      if (tName && tName.toLowerCase().includes(q)) {
        sMap.set(`tenant-${tName}`, { label: `ผู้เช่า: ${tName}`, value: tName });
      }
    });
    return Array.from(sMap.values());
  })();

  const filteredRequests = validRequests.filter((req) => {
    // 1. Filter by Status Tab
    if (statusFilter !== 'all') {
      const reqStatus = String(req.status || 'pending').toLowerCase();
      const targetFilter = statusFilter.toLowerCase();
      if (reqStatus !== targetFilter) return false;
    }

    // 2. Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const roomNum = String(req.room?.room_number || '').toLowerCase();
      const firstName = String(req.tenant?.user?.first_name || '').toLowerCase();
      const lastName = String(req.tenant?.user?.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const phone = String(req.tenant?.user?.phone || '').toLowerCase();

      return (
        roomNum.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        fullName.includes(q) ||
        phone.includes(q)
      );
    }

    return true;
  });

  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  // Reset page if bounds change
  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [filteredRequests.length, totalPages, currentPage]);

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const dateA = a.request_date ? new Date(a.request_date).getTime() : 0;
    const dateB = b.request_date ? new Date(b.request_date).getTime() : 0;
    const valA = isNaN(dateA) ? 0 : dateA;
    const valB = isNaN(dateB) ? 0 : dateB;
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const paginatedRequests = sortedRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary counts
  const countPending = validRequests.filter((r) => r.status === 'pending').length;
  const countApproved = validRequests.filter((r) => r.status === 'approved').length;
  const countInspected = validRequests.filter((r) => r.status === 'inspected').length;

  return (
    <div className="space-y-5 page-enter">
      {/* ── Dialog Manage Status ── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">จัดการคำร้องขอแจ้งย้ายออก</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setNotes('');
                  setTargetStatus('');
                }}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Request Summary Info */}
            <div className="bg-muted/40 rounded-xl px-4 py-3.5 mb-5 text-sm space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <DoorOpen className="w-4 h-4 text-primary" />
                ห้อง {selectedRequest.room?.room_number}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                ผู้เช่า: {selectedRequest.tenant?.user?.first_name} {selectedRequest.tenant?.user?.last_name}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground" suppressHydrationWarning>
                <Clock className="w-4 h-4" />
                วันที่แจ้ง: {formatDate(selectedRequest.request_date)}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-5">
              {/* Select Status */}
              <div>
                <label className="text-sm font-semibold mb-2.5 block text-foreground">เลือกสถานะใหม่</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {(Object.entries(STATUS_CFG) as [string, typeof STATUS_CFG[keyof typeof STATUS_CFG]][])
                    .filter(([statusKey]) => statusKey !== 'pending') // Can't revert back to pending manually
                    .map(([statusKey, cfg]) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setTargetStatus(statusKey)}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all text-left w-full',
                          targetStatus === statusKey
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <cfg.icon className="w-4.5 h-4.5" />
                          <span>{cfg.label}</span>
                        </div>
                        {targetStatus === statusKey && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                </div>
              </div>

              {/* Notes input */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block text-foreground">
                  หมายเหตุ (ส่งแจ้งเตือนเข้า LINE ของผู้เช่า)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="พิมพ์ข้อความรายละเอียดที่นี่... (เช่น แอดมินรับเรื่องแล้วค่ะ / ตรวจห้องพักผ่านเรียบร้อยค่ะ)"
                  className="w-full border rounded-xl px-3.5 py-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none min-h-[90px] text-foreground border-border"
                />
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedRequest(null);
                    setNotes('');
                    setTargetStatus('');
                  }}
                  className="rounded-xl"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !targetStatus}
                  className="gradient-btn text-white gap-2 rounded-xl"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกสถานะและส่ง LINE
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Context Navigation Back Button ── */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>กลับไปหน้าแดชบอร์ด</span>
        </button>
      </div>

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold">จัดการการแจ้งย้ายออก</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          ตรวจสอบ ยอมรับคำขอ และบันทึกผลการตรวจสอบห้องพักเมื่อผู้เช่าขอย้ายออก
        </p>
      </div>

      {/* ── Summary Chips ── */}
      {!loading && !offline && (
        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              รอดำเนินการ {countPending} รายการ
            </span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              ยอมรับเรื่องแล้ว {countApproved} รายการ
            </span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              ตรวจห้องเรียบร้อย {countInspected} รายการ
            </span>
          </div>
        </div>
      )}

      {/* ── Controls (Filters & Search) ── */}
      {!loading && !offline && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex gap-1.5 bg-muted/40 p-1 rounded-xl max-w-fit border border-border">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'pending', label: 'รอดำเนินการ' },
              { id: 'approved', label: 'ยอมรับเรื่องแล้ว' },
              { id: 'inspected', label: 'ตรวจห้องแล้ว' },
              { id: 'rejected', label: 'ปฏิเสธ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                  statusFilter === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Autocomplete Search Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="ค้นหาผู้เช่า หรือห้องพัก..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setCurrentPage(1);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full border rounded-xl px-3.5 py-2 bg-background dark:bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground dark:text-zinc-100 border-border dark:border-zinc-800 placeholder-muted-foreground dark:placeholder-zinc-500 transition-all"
            />
            {showSuggestions && suggestions.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSuggestions(false)}
                />
                <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900 shadow-2xl z-20 py-1.5 scrollbar-thin">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(sug.value);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-foreground dark:text-zinc-300 hover:bg-muted dark:hover:bg-zinc-800 hover:text-primary dark:hover:text-white transition-colors font-medium cursor-pointer"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Table Content ── */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : offline ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถเชื่อมต่อ Backend ได้</h3>
          <p className="text-sm text-muted-foreground mb-5">
            กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือดูว่าเซิร์ฟเวอร์เปิดใช้งานอยู่หรือไม่
          </p>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={loadData}>
            ลองใหม่อีกครั้ง
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-5 py-3.5 font-bold text-muted-foreground text-xs uppercase tracking-wider text-left">
                  ห้องพัก
                </th>
                <th className="px-5 py-3.5 font-bold text-muted-foreground text-xs uppercase tracking-wider text-left">
                  ผู้เช่า
                </th>
                <th className="px-5 py-3.5 font-bold text-muted-foreground text-xs uppercase tracking-wider text-left">
                  <button
                    onClick={handleToggleSort}
                    className="flex items-center gap-1.5 hover:text-foreground font-bold transition-colors uppercase"
                  >
                    วันที่แจ้งออก
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </th>
                <th className="px-5 py-3.5 font-bold text-muted-foreground text-xs uppercase tracking-wider text-left">
                  สถานะ
                </th>
                <th className="px-5 py-3.5 font-bold text-muted-foreground text-xs uppercase tracking-wider text-left">
                  หมายเหตุ
                </th>
                <th className="px-5 py-3.5 font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">
                  การจัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <LogOut className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30 rotate-180" />
                    <p className="text-muted-foreground font-semibold">ไม่มีรายการแจ้งย้ายออก</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => {
                  const st = String(req.status || 'pending').toLowerCase();
                  const cfg = (st in STATUS_CFG) ? STATUS_CFG[st as keyof typeof STATUS_CFG] : STATUS_CFG.pending;
                  const Icon = cfg.icon;

                  return (
                    <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                      {/* Room Number */}
                      <td className="px-5 py-4 font-semibold text-foreground">
                        ห้อง {req.room?.room_number ?? '-'}
                      </td>

                      {/* Tenant name and phone */}
                      <td className="px-5 py-4">
                        {req.tenant?.user ? (
                          <div>
                            <div className="font-semibold text-foreground">
                              {req.tenant.user.first_name} {req.tenant.user.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              📞 {req.tenant.user.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Request Date */}
                      <td className="px-5 py-4 text-muted-foreground text-xs" suppressHydrationWarning>
                        {formatDate(req.request_date, true)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', cfg.badge)}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate">
                        {req.notes ? (
                          <div className="flex items-center gap-1.5" title={req.notes}>
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{req.notes}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs font-normal">ไม่มีหมายเหตุ</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(req);
                            setTargetStatus(req.status);
                            setNotes(req.notes || '');
                          }}
                          className="h-8 rounded-lg text-xs border border-border hover:border-primary/30 transition-colors"
                        >
                          จัดการ
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {!loading && !offline && filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-muted/20 border-t border-border">
              <div className="text-xs text-muted-foreground font-medium">
                แสดง {Math.min(filteredRequests.length, (currentPage - 1) * pageSize + 1)} ถึง {Math.min(filteredRequests.length, currentPage * pageSize)} จากทั้งหมด {filteredRequests.length} รายการ
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-lg border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        'h-8 w-8 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center',
                        currentPage === pageNum
                          ? 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 rounded-lg border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
