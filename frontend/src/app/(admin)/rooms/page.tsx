'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DoorOpen, Filter, Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function RoomsPage() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  // Form
  const [number, setNumber] = useState('');
  const [type, setType] = useState('Studio');
  const [price, setPrice] = useState('');
  const [floor, setFloor] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [roomsData, propsData] = await Promise.all([
        fetchApi('/rooms'),
        fetchApi('/properties')
      ]);
      setRooms(roomsData);
      setProperties(propsData);
      if (propsData.length > 0 && !propertyId) setPropertyId(propsData[0].id.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRoom = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/rooms', {
        method: 'POST',
        body: JSON.stringify({ 
          room_number: number, 
          room_type: type, 
          base_price: Number(price), 
          floor_number: Number(floor),
          property_id: Number(propertyId)
        })
      });
      toast.success(t('roomAdded') || 'เพิ่มห้องสำเร็จ');
      setIsDialogOpen(false);
      setNumber(''); setPrice(''); setFloor('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm(t('confirmDelete') || 'คุณแน่ใจหรือไม่ว่าต้องการลบห้องพักนี้?')) return;
    try {
      await fetchApi(`/rooms/${id}`, { method: 'DELETE' });
      toast.success(t('roomDeleted') || 'ลบห้องพักสำเร็จ');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('roomsTitle')}</h2>
          <p className="text-muted-foreground">{t('roomsDesc')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addRoom')}
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('addRoomTitle')}</h3>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('property')}</label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('roomNumber')}</label>
                  <input required value={number} onChange={e => setNumber(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" placeholder={t('egRoom')} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('floor')}</label>
                  <input required type="number" value={floor} onChange={e => setFloor(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('roomType')}</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                    <option>{t('standardRoom')}</option>
                    <option>{t('suiteRoom')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('priceThb')}</label>
                  <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveRoom')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border">
            <h3 className="text-lg font-bold mb-4">{t('editRoomTitle')}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await fetchApi(`/rooms/${editingRoom.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({ 
                    room_number: editingRoom.room_number,
                    status: editingRoom.status,
                    price_override: editingRoom.display_price !== undefined 
                      ? (editingRoom.display_price ? Number(editingRoom.display_price) : null) 
                      : editingRoom.price_override
                  })
                });
                toast.success('อัปเดตห้องสำเร็จ');
                setEditingRoom(null);
                loadData();
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setSaving(false);
              }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('roomNumber')}</label>
                  <input required value={editingRoom.room_number || ''} onChange={e => setEditingRoom({...editingRoom, room_number: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('status')}</label>
                  <select value={editingRoom.status || 'available'} onChange={e => setEditingRoom({...editingRoom, status: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background">
                    <option value="available">{t('available')}</option>
                    <option value="occupied">{t('occupied')}</option>
                    <option value="maintenance">{t('maintenanceStatus')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('roomType')}</label>
                  <div className="text-base mt-2">{editingRoom.RoomType?.name || t('standardRoom')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('price')}</label>
                  <input type="number" required value={editingRoom.display_price || editingRoom.price_override || editingRoom.RoomType?.base_price || 0} onChange={e => setEditingRoom({...editingRoom, display_price: e.target.value})} className="w-full mt-1 border rounded-md px-3 py-2 bg-background" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="ghost" onClick={() => setEditingRoom(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveData')}
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
                <th className="px-6 py-4 font-medium">{t('roomNumber')}</th>
                <th className="px-6 py-4 font-medium">{t('roomType')}</th>
                <th className="px-6 py-4 font-medium">{t('floor')}</th>
                <th className="px-6 py-4 font-medium">{t('price')}</th>
                <th className="px-6 py-4 font-medium">{t('status')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('manage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : rooms.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('noRooms')}</td></tr>
              ) : rooms.map((room) => (
                <tr key={room.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <DoorOpen className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-base">{room.room_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{room.RoomType?.name || '-'}</td>
                  <td className="px-6 py-4">{t('floorLabel')} {room.Floor?.floor_number || room.floor_number || '-'}</td>
                  <td className="px-6 py-4 font-medium">฿{parseFloat(room.price_override || room.RoomType?.base_price || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      room.status === 'available' ? 'bg-green-100 text-green-700' :
                      room.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {room.status === 'available' ? t('statusAvailable') : 
                       room.status === 'occupied' ? t('statusOccupied') : t('statusMaintenance')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingRoom(room)}>{t('manage')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoom(room.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
