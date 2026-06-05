'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LiffRegisterPage() {
  const [profile, setProfile] = useState<any>(null);
  const [liffError, setLiffError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  useEffect(() => {
    const initLiff = async () => {
      try {
        // Use a mock LIFF ID for development if needed, or real one from env
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '1661168128-EXAMPLE'; // Replace with real LIFF ID later
        await liff.init({ liffId });
        
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const userProfile = await liff.getProfile();
        setProfile(userProfile);
      } catch (err: any) {
        console.error('LIFF Init Error:', err);
        setLiffError(err.message || 'LIFF Initialization failed');
      }
    };

    const loadRooms = async () => {
      try {
        const rooms = await fetchApi('/rooms?status=available');
        // Sort rooms by room_number
        setAvailableRooms(rooms.sort((a: any, b: any) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })));
      } catch (err: any) {
        console.error('Failed to load rooms:', err);
        toast.error('โหลดข้อมูลห้องพักไม่สำเร็จ');
      }
    };

    Promise.all([initLiff(), loadRooms()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      toast.error('กรุณาเลือกห้องพัก');
      return;
    }
    
    setSaving(true);
    try {
      await fetchApi('/auth/register-tenant', {
        method: 'POST',
        body: JSON.stringify({
          line_uid: profile?.userId || 'test-uid-' + Date.now(),
          first_name: firstName,
          last_name: lastName,
          phone,
          room_id: Number(roomId)
        })
      });
      
      toast.success('ลงทะเบียนสำเร็จ!');
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">กำลังเชื่อมต่อกับ LINE...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">ลงทะเบียนสำเร็จ!</h2>
            <p className="text-muted-foreground text-sm px-4">
              ข้อมูลของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว ห้องพักถูกจองและสถานะเปลี่ยนเป็น "มีผู้เช่า" ทันที
            </p>
            <p className="text-muted-foreground text-sm">
              คุณสามารถปิดหน้านี้และเริ่มใช้งานระบบผ่านเมนูใน LINE ได้เลยครับ
            </p>
            <Button onClick={handleClose} className="w-full mt-6 py-6 text-lg font-medium rounded-xl">
              ปิดหน้าต่างนี้
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-10">
      <header className="bg-primary text-primary-foreground p-6 shadow-md text-center rounded-b-3xl">
        <h1 className="text-xl font-bold">ลงทะเบียนผู้เช่าใหม่</h1>
        <p className="text-sm opacity-90 mt-1">กรุณากรอกข้อมูลส่วนตัวเพื่อเข้าสู่ระบบหอพัก</p>
      </header>

      <main className="p-4 -mt-4 max-w-md mx-auto">
        <Card className="shadow-lg border-none">
          <CardHeader className="pb-4">
            {profile && (
              <div className="flex items-center gap-3 mb-2 bg-muted/50 p-3 rounded-lg border">
                <img src={profile.pictureUrl} alt="LINE Profile" className="w-12 h-12 rounded-full shadow-sm" />
                <div>
                  <p className="text-xs text-muted-foreground">เข้าสู่ระบบด้วย LINE</p>
                  <p className="text-sm font-semibold">{profile.displayName}</p>
                </div>
              </div>
            )}
            {liffError && <p className="text-red-500 text-xs text-center">{liffError}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">ชื่อจริง</label>
                  <Input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="เช่น สมชาย" className="h-12" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">นามสกุล</label>
                  <Input required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="เช่น ใจดี" className="h-12" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">เบอร์โทรศัพท์</label>
                <Input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxx" className="h-12" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">เลือกห้องพัก (เฉพาะห้องว่าง)</label>
                <select 
                  required 
                  value={roomId} 
                  onChange={e => setRoomId(e.target.value)} 
                  className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>-- กรุณาเลือกห้อง --</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>ห้อง {room.room_number}</option>
                  ))}
                </select>
                {availableRooms.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">ขณะนี้ไม่มีห้องว่างให้ลงทะเบียน</p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={saving || availableRooms.length === 0} 
                className="w-full h-14 text-base font-bold rounded-xl mt-6 shadow-md"
              >
                {saving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                ยืนยันการลงทะเบียน
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
