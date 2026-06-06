'use client';

import { useState, useEffect } from 'react';
import { Building2, Power, PowerOff, ShieldAlert, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

export default function SaaSDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    try {
      const data = await fetchApi('/admin/properties') as any;
      setProperties(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProperties(); }, []);

  const togglePropertyStatus = async (id: number, currentStatus: boolean) => {
    try {
      await fetchApi(`/admin/properties/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      toast.success(currentStatus ? 'ระงับการใช้งานสำเร็จ' : 'เปิดการใช้งานสำเร็จ');
      loadProperties();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImpersonate = (property: any) => {
    localStorage.setItem('impersonated_property', JSON.stringify({ id: property.id, name: property.name, logo_url: property.logo_url }));
    toast.success(`กำลังเข้าสู่โหมดสวมสิทธิ์: ${property.name}`);
    window.location.href = '/dashboard';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">SaaS Properties</h1>
        <p className="text-muted-foreground mt-2">จัดการหอพักและอพาร์ตเมนต์ทั้งหมดในระบบ</p>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">ชื่อหอพัก</th>
                <th className="px-6 py-4 font-semibold">เจ้าของ (Owner)</th>
                <th className="px-6 py-4 font-semibold">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {properties.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="font-semibold text-base">{p.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{p.owner?.first_name} {p.owner?.last_name}</div>
                    <div className="text-muted-foreground text-xs">{p.owner?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {p.is_active ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">ใช้งานปกติ</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">ถูกระงับ (Suspended)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleImpersonate(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <LogIn className="w-3.5 h-3.5" /> สวมสิทธิ์
                      </button>
                      <button
                        onClick={() => togglePropertyStatus(p.id, p.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          p.is_active ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {p.is_active ? <><PowerOff className="w-3.5 h-3.5" /> ระงับ</> : <><Power className="w-3.5 h-3.5" /> เปิดใช้งาน</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
