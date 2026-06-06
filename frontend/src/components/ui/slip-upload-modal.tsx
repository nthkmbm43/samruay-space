'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload, X, CheckCircle2, AlertCircle, Clock, FileImage,
  Loader2, ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

type VerifyStatus = 'idle' | 'uploading' | 'verifying' | 'verified' | 'failed' | 'manual';

interface SlipData {
  amount?: number;
  date?: string;
  referenceNo?: string;
  senderBank?: string;
  receiverBank?: string;
}

interface SlipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (slipData: SlipData, slipFile: File | null, method: string) => void;
  expectedAmount?: number;
  invoiceNo?: string;
}

const STATUS_CONFIG: Record<VerifyStatus, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
}> = {
  idle:      { icon: <FileImage className="w-4 h-4" />, label: 'รอสลิป', color: 'text-muted-foreground', bg: 'bg-muted/50' },
  uploading: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'กำลังอัปโหลด...', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  verifying: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'กำลังตรวจสอบ...', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  verified:  { icon: <CheckCircle2 className="w-4 h-4" />, label: 'ยืนยันสำเร็จ', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  failed:    { icon: <AlertCircle className="w-4 h-4" />, label: 'ตรวจสอบไม่ผ่าน', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  manual:    { icon: <Clock className="w-4 h-4" />, label: 'รอตรวจสอบด้วยตนเอง', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

export function SlipVerificationBadge({ status }: { status: VerifyStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function SlipUploadModal({
  isOpen, onClose, onConfirm, expectedAmount, invoiceNo,
}: SlipUploadModalProps) {
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [slipData, setSlipData] = useState<SlipData>({});
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'qr' | 'cash'>('transfer');
  const [isDragging, setIsDragging] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSlipFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);

    if (siteConfig.features.easySlip) {
      // Real EasySlip API call
      setStatus('uploading');
      await new Promise((r) => setTimeout(r, 800));
      setStatus('verifying');
      try {
        const form = new FormData();
        form.append('slip', file);
        const res = await fetch('/api/verify-slip', { method: 'POST', body: form });
        const data = await res.json();
        if (data.verified) {
          setSlipData(data);
          setStatus('verified');
        } else {
          setStatus('failed');
        }
      } catch {
        setStatus('failed');
      }
    } else {
      // Mock mode: simulate verification
      setStatus('uploading');
      await new Promise((r) => setTimeout(r, 1000));
      setStatus('verifying');
      await new Promise((r) => setTimeout(r, 1200));
      // Simulate success with mock data
      setSlipData({
        amount: expectedAmount,
        date: new Date().toLocaleDateString('th-TH'),
        referenceNo: `REF${Date.now().toString().slice(-8)}`,
        senderBank: 'กสิกรไทย',
        receiverBank: 'กรุงเทพ',
      });
      setStatus('verified');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    onConfirm(slipData, slipFile, paymentMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        style={{ animation: 'fade-in-up 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">แนบสลิปการชำระเงิน</h2>
            {invoiceNo && (
              <p className="text-xs text-muted-foreground mt-0.5">ใบแจ้งหนี้: {invoiceNo}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Payment Method Tabs */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">วิธีชำระเงิน</label>
            <div className="flex gap-2">
              {([
                { value: 'transfer', label: '🏦 โอนธนาคาร' },
                { value: 'qr',       label: '📱 QR Code' },
                { value: 'cash',     label: '💵 เงินสด' },
              ] as const).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all duration-150',
                    paymentMethod === m.value
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-muted/50 border-transparent hover:border-border'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expected Amount */}
          {expectedAmount && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <span className="text-sm text-muted-foreground">ยอดที่ต้องชำระ</span>
              <span className="font-bold text-primary text-lg">
                ฿{expectedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Drop Zone (hidden for cash) */}
          {paymentMethod !== 'cash' && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                สลิปการโอนเงิน
                {siteConfig.features.easySlip && (
                  <span className="ml-2 text-xs text-emerald-600 font-normal">✓ ตรวจสอบด้วย EasySlip</span>
                )}
              </label>

              {!preview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
                    isDragging
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-muted hover:border-primary/50 hover:bg-muted/30'
                  )}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium text-sm">ลากวางสลิปหรือคลิกเพื่อเลือกไฟล์</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (สูงสุด 10MB)</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border bg-muted/30">
                  {/* Preview Image */}
                  <div
                    className="relative cursor-zoom-in"
                    onClick={() => setPreviewZoom(true)}
                  >
                    <Image
                      src={preview}
                      alt="Slip preview"
                      width={400}
                      height={300}
                      className="w-full object-contain max-h-56"
                      unoptimized
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(true); }}
                        className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSlipFile(null);
                          setPreview(null);
                          setStatus('idle');
                          setSlipData({});
                        }}
                        className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-rose-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="p-3 flex items-center justify-between border-t">
                    <SlipVerificationBadge status={status} />
                    {status === 'failed' && (
                      <button
                        onClick={() => setStatus('manual')}
                        className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                      >
                        ตรวจสอบด้วยตนเอง
                      </button>
                    )}
                  </div>

                  {/* Extracted Data */}
                  {status === 'verified' && Object.keys(slipData).length > 0 && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-xs">
                      {slipData.amount && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                          <div className="text-muted-foreground">ยอดเงิน</div>
                          <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                            ฿{slipData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {slipData.referenceNo && (
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="text-muted-foreground">เลขอ้างอิง</div>
                          <div className="font-semibold truncate">{slipData.referenceNo}</div>
                        </div>
                      )}
                      {slipData.date && (
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="text-muted-foreground">วันที่</div>
                          <div className="font-semibold">{slipData.date}</div>
                        </div>
                      )}
                      {slipData.senderBank && (
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="text-muted-foreground">ธนาคาร</div>
                          <div className="font-semibold">{slipData.senderBank}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cash: just confirm */}
          {paymentMethod === 'cash' && (
            <div className="bg-muted/30 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">💵</div>
              <p className="font-medium">รับชำระเงินสด</p>
              <p className="text-sm text-muted-foreground mt-1">กดยืนยันเพื่อบันทึกการรับเงินสด</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t bg-muted/10">
          <Button onClick={onClose} variant="outline" className="flex-1">
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 gradient-btn text-white"
            disabled={
              paymentMethod !== 'cash' &&
              !slipFile &&
              status !== 'manual'
            }
          >
            {status === 'verifying' || status === 'uploading' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />กำลังตรวจสอบ...</>
            ) : (
              '✓ ยืนยันการชำระเงิน'
            )}
          </Button>
        </div>
      </div>

      {/* Zoom modal */}
      {previewZoom && preview && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewZoom(false)}
        >
          <Image
            src={preview}
            alt="Slip zoom"
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain rounded-lg"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
