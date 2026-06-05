'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, Wrench, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function MaintenancePage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rooms, setRooms] = useState([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [reqData, roomsData] = await Promise.all([
        fetchApi('/maintenance'),
        fetchApi('/rooms')
      ]);
      setRequests(reqData);
      setRooms(roomsData);
      if (roomsData.length > 0 && !roomId) setRoomId(roomsData[0].id.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/maintenance', {
        method: 'POST',
        body: JSON.stringify({ room_id: Number(roomId), title, description })
      });
      toast.success(t('requestSubmitted') || 'แจ้งซ่อมสำเร็จ');
      setIsDialogOpen(false);
      setTitle(''); setDescription('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('maintTitle')}</h2>
          <p className="text-muted-foreground">{t('maintDesc')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('newTicket')}
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('createTicketTitle')}</h3>
            <form onSubmit={handleAddRequest} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('room')}</label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{t('room')} {r.room_number}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('issueTitle')}</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" placeholder={t('issueTitlePlaceholder')} />
              </div>
              <div>
                <label className="text-sm font-medium">{t('description')}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" rows={3}></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('submitTicket')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">{t('issue')}</th>
                <th className="px-6 py-4 font-medium">{t('room')}</th>
                <th className="px-6 py-4 font-medium">{t('dateReported')}</th>
                <th className="px-6 py-4 font-medium">{t('priority')}</th>
                <th className="px-6 py-4 font-medium">{t('status')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('noTickets')}</td></tr>
              ) : requests.map((req: any) => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-base">{req.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{t('room')} {req.Room?.room_number}</td>
                  <td className="px-6 py-4">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      req.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.priority === 'high' ? t('priorityHigh') : t('priorityNormal')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      req.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                      req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {req.status === 'pending' ? t('maintPending') : 
                       req.status === 'in_progress' ? t('maintInProgress') :
                       req.status === 'completed' ? t('maintCompleted') : t('maintCancelled')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8">{t('update')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
