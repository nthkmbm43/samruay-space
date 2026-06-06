'use client';

import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SaaSMaintenancePage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleMaintenance = async () => {
    setLoading(true);
    try {
      await fetchApi('/admin/system/maintenance', {
        method: 'PUT',
        body: JSON.stringify({ is_active: !maintenanceMode })
      });
      setMaintenanceMode(!maintenanceMode);
      toast.success(!maintenanceMode ? 'เปิดโหมดปิดปรับปรุงระบบแล้ว' : 'ปิดโหมดปรับปรุงระบบแล้ว (ใช้งานปกติ)');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-2">ตั้งค่าการทำงานรวมของระบบ</p>
      </div>

      <div className="bg-card border border-rose-200 dark:border-rose-900 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-600">Maintenance Mode (โหมดปิดปรับปรุงระบบ)</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                เมื่อเปิดโหมดนี้ ผู้ใช้งานทั่วไปและ Admin จะไม่สามารถเข้าใช้งานระบบได้ จะมีเพียง Super Admin เท่านั้นที่สามารถเข้าใช้งานได้เพื่อทำการตรวจสอบ
              </p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              maintenanceMode 
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20' 
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {maintenanceMode ? 'ระบบกำลังปรับปรุง (ปิดใช้งานเพื่อกลับสู่ปกติ)' : 'คลิกเพื่อเปิดโหมดปรับปรุงระบบ'}
          </button>
        </div>
      </div>
    </div>
  );
}
