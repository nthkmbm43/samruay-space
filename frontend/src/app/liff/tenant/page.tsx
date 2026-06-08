'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Wrench, Home, CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TenantLiffPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liffError, setLiffError] = useState<string>('');

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '1661168128-EXAMPLE';
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const userProfile = await liff.getProfile();
        setProfile(userProfile);

        // Fetch bill details
        try {
          const data = await fetchApi<any>(`/auth/liff-bill?line_uid=${userProfile.userId}`);
          setTenantInfo(data.tenant);
          setBill(data.bill);
        } catch (apiErr: any) {
          console.error('API Error:', apiErr);
          toast.error(apiErr.message || 'โหลดข้อมูลบิลไม่สำเร็จ');
        }
      } catch (err: any) {
        console.error('LIFF Init Error:', err);
        setLiffError(err.message || 'LIFF Initialization failed');
        
        // Fallback for local browser testing / development
        setTenantInfo({
          first_name: 'Somchai (Dev Fallback)',
          room_number: '302'
        });
        setBill({
          period_month: 8,
          period_year: 2026,
          total: 5200,
          due_date: '2026-08-05'
        });
      } finally {
        setLoading(false);
      }
    };

    initLiff();
  }, []);

  const handlePayNow = async () => {
    if (liff.isInClient()) {
      try {
        await liff.sendMessages([
          {
            type: 'text',
            text: 'ขอ QR Code สแกนจ่าย'
          }
        ]);
        liff.closeWindow();
      } catch (err) {
        console.error('Failed to send message:', err);
        toast.error('ไม่สามารถส่งคำขอชำระเงินได้');
      }
    } else {
      toast.error('กรุณาใช้งานผ่านแอปพลิเคชัน LINE (LIFF) เพื่อชำระเงิน');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // Format month name in Thai
  const getThaiMonthName = (monthNum: number) => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[monthNum - 1] || '';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* User Info Header */}
      <div className="bg-primary px-6 pt-12 pb-8 rounded-b-3xl shadow-sm text-primary-foreground">
        <h1 className="text-2xl font-bold">สวัสดีคุณ {tenantInfo?.first_name || 'ผู้เช่า'}!</h1>
        <p className="opacity-90 mt-1 flex items-center text-sm">
          <Home className="w-4 h-4 mr-1.5" />
          ห้อง {tenantInfo?.room_number || '-'} • SAMRUAY SPACE
        </p>
      </div>

      <div className="flex-1 px-6 pt-6 space-y-6">
        {/* Bill Section */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg text-foreground">ยอดชำระเงินค่าเช่า</h2>
            {bill && (
              <span className="text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-3 py-1 rounded-full">
                กำหนดชำระ: {new Date(bill.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          
          {bill ? (
            <Card className="border-primary/20 shadow-lg bg-card text-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  รอบบิลเดือน {getThaiMonthName(bill.period_month)} {bill.period_year + 543}
                </CardTitle>
                <div className="text-3xl font-extrabold text-foreground mt-1.5">
                  ฿{bill.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <Button className="w-full mt-2 gradient-btn text-white" size="lg" onClick={handlePayNow}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  ชำระเงินทันที (ขอ QR Code)
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-500/20 shadow-md bg-card text-foreground">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground">เดือนนี้ไม่มียอดค้างชำระค่ะ</h3>
                  <p className="text-xs text-muted-foreground">ยอดเงินทั้งหมดได้รับการจัดการเสร็จสิ้นเรียบร้อยแล้วค่ะ</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Services Section */}
        <section>
          <h2 className="font-semibold text-lg text-foreground mb-4">บริการอื่นๆ</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200 bg-card border">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-foreground">ประวัติการชำระเงิน</span>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200 bg-card border">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-foreground">แจ้งซ่อมแซม</span>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
