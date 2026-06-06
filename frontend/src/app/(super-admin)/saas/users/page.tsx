'use client';

import { useState, useEffect } from 'react';
import { Users, Loader2, Search } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SaaSUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await fetchApi('/admin/users') as any;
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await fetchApi(`/admin/users/${editingUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      toast.success('อัปเดตสิทธิ์การใช้งานสำเร็จ');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Users</h1>
          <p className="text-muted-foreground mt-2">จัดการผู้ใช้งานทั้งหมดในระบบ</p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ หรืออีเมล..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/40 bg-background"
          />
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">ชื่อ - นามสกุล</th>
                <th className="px-6 py-4 font-semibold">อีเมล</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทร</th>
                <th className="px-6 py-4 font-semibold">บทบาท (Role)</th>
                <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                        {u.first_name?.[0] || 'U'}
                      </div>
                      <div className="font-semibold text-base">{u.first_name} {u.last_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4 text-muted-foreground">{u.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setNewRole(u.role);
                      }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      แก้ไขสิทธิ์
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold mb-4">แก้ไขสิทธิ์การใช้งาน</h2>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">ผู้ใช้งาน: <span className="font-semibold text-foreground">{editingUser.first_name} {editingUser.last_name}</span></p>
              <p className="text-sm text-muted-foreground">อีเมล: {editingUser.email}</p>
            </div>
            
            <div className="space-y-3 mt-6">
              <label className="text-sm font-medium">เลือกบทบาท (Role)</label>
              <select 
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="tenant">Tenant (ผู้เช่าทั่วไป)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ/นิติบุคคล)</option>
                <option value="super_admin">Super Admin (เจ้าของระบบ)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                type="button" 
                onClick={() => setEditingUser(null)}
                className="px-5 py-2.5 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
                disabled={isSaving}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={handleUpdateRole}
                disabled={isSaving || newRole === editingUser.role}
                className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
