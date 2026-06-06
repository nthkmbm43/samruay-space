'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Loader2, Save, ChevronLeft, Droplet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function MeterReaderPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadRooms = async () => {
    try {
      const data = await fetchApi('/rooms') as any;
      // Sort by room number
      const sorted = data.sort((a: any, b: any) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
      setRooms(sorted);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูลห้องได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleSaveMeter = async (roomId: number, water: string, elec: string) => {
    setSavingId(roomId);
    try {
      await fetchApi(`/rooms/${roomId}`, {
        method: 'PUT',
        body: JSON.stringify({
          water_meter_start: water ? Number(water) : 0,
          elec_meter_start: elec ? Number(elec) : 0
        })
      });
      toast.success('บันทึกมิเตอร์สำเร็จ');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-primary-foreground/80 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold">บันทึกมิเตอร์น้ำ-ไฟ</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {rooms.map(room => (
          <MeterCard 
            key={room.id} 
            room={room} 
            onSave={handleSaveMeter} 
            isSaving={savingId === room.id} 
          />
        ))}
        {rooms.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">ไม่มีข้อมูลห้องพัก</div>
        )}
      </main>
    </div>
  );
}

function MeterCard({ room, onSave, isSaving }: { room: any, onSave: any, isSaving: boolean }) {
  const [water, setWater] = useState(room.water_meter_start || '');
  const [elec, setElec] = useState(room.elec_meter_start || '');

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 bg-muted/30 border-b">
        <CardTitle className="text-base flex justify-between items-center">
          <span>ห้อง {room.room_number}</span>
          <span className="text-xs font-normal px-2 py-1 bg-primary/10 text-primary rounded-full">
            {room.status === 'occupied' ? 'มีผู้เช่า' : 'ว่าง'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Droplet className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">มิเตอร์น้ำ</label>
            <Input 
              type="number" 
              value={water} 
              onChange={e => setWater(e.target.value)} 
              placeholder="0.00" 
              className="text-lg"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">มิเตอร์ไฟ</label>
            <Input 
              type="number" 
              value={elec} 
              onChange={e => setElec(e.target.value)} 
              placeholder="0.00" 
              className="text-lg"
            />
          </div>
        </div>

        <Button 
          onClick={() => onSave(room.id, water, elec)} 
          disabled={isSaving} 
          className="w-full mt-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          บันทึก
        </Button>
      </CardContent>
    </Card>
  );
}
