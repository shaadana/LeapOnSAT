import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Lightbulb, Home as HomeIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  getOrCreatePalace,
  addRoom,
  deleteRoom,
  renameRoom,
  setActiveRoom,
  setRoomTheme,
  purchaseCatalogItem,
  addCustomUpload,
  placeItem,
  moveItem,
  removeItem,
  updateItemNote,
  setRoomPet,
} from '@/utils/memoryPalace';
import { getOrCreateGamificationProfile } from '@/utils/gamification';

import RoomCanvas from '@/components/memorypalace/RoomCanvas';
import PaletteShop from '@/components/memorypalace/PaletteShop';
import RoomManager from '@/components/memorypalace/RoomManager';
import NoteEditor from '@/components/memorypalace/NoteEditor';
import StudyMode from '@/components/memorypalace/StudyMode';
import CoinPill from '@/components/gamification/CoinPill';

export default function MemoryPalace() {
  const [user, setUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [studying, setStudying] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: palace, refetch: refetchPalace } = useQuery({
    queryKey: ['memoryPalace', user?.id],
    queryFn: () => getOrCreatePalace(user.id),
    enabled: !!user?.id,
  });

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['gamificationProfile', user?.id],
    queryFn: () => getOrCreateGamificationProfile(user.id),
    enabled: !!user?.id,
  });

  if (!palace || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const room = (palace.rooms || []).find(r => r.id === palace.active_room_id) || palace.rooms?.[0];
  const coins = profile.coins || 0;

  // ── Mutating helpers — refresh both palace and profile after coin spends ──
  const reload = async () => {
    await refetchPalace();
    await refetchProfile();
  };

  const handlePurchase = async (catalogId) => {
    try {
      await purchaseCatalogItem(palace, catalogId);
      toast.success('Purchased!');
      await reload();
    } catch (e) { toast.error(e.message); }
  };

  const handleChangeWallpaper = async (id) => {
    await setRoomTheme(palace, room.id, { wallpaper: id });
    await refetchPalace();
  };
  const handleChangeFloor = async (id) => {
    await setRoomTheme(palace, room.id, { floor: id });
    await refetchPalace();
  };

  const handleAddRoom = async (name) => {
    try {
      await addRoom(palace, name);
      toast.success(`New room built!`);
      await reload();
    } catch (e) { toast.error(e.message); }
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('Delete this room and all its items? This cannot be undone.')) return;
    try {
      await deleteRoom(palace, id);
      await refetchPalace();
    } catch (e) { toast.error(e.message); }
  };

  const handleRenameRoom = async (id, name, subject) => {
    await renameRoom(palace, id, name, subject);
    await refetchPalace();
  };

  const handleSelectRoom = async (id) => {
    await setActiveRoom(palace, id);
    await refetchPalace();
  };

  const handleDropItem = async (catalogId, x, y, customUrl) => {
    await placeItem(palace, room.id, catalogId, x, y, customUrl || null);
    await refetchPalace();
  };

  const handleMoveItem = async (instanceId, x, y) => {
    await moveItem(palace, room.id, instanceId, x, y);
    await refetchPalace();
  };

  const handleRemoveItem = async (instanceId) => {
    await removeItem(palace, room.id, instanceId);
    await refetchPalace();
  };

  const handleSaveNote = async (note) => {
    if (!selectedItem) return;
    await updateItemNote(palace, room.id, selectedItem.instance_id, note);
    toast.success('Note saved');
    await refetchPalace();
  };

  const handleChoosePet = async (petId) => {
    await setRoomPet(palace, room.id, petId);
    await refetchPalace();
  };

  const handleAddUpload = async (label, url) => {
    await addCustomUpload(palace, label, url);
    await refetchPalace();
  };

  const itemCount = (room?.items || []).length;
  const noteCount = (room?.items || []).filter(i => i.note?.title || i.note?.front || i.note?.back).length;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <Card className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 shadow-lg">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md">
            <HomeIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Righteous, sans-serif' }}>
              Your Memory Palace
            </h1>
            <p className="text-xs text-stone-500">
              Decorate rooms, attach notes to each item, and recall them by walking through your space.
            </p>
          </div>
          <CoinPill coins={coins} size="md" />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[260px_1fr_300px] gap-4">
        {/* LEFT — rooms */}
        <div className="space-y-4 lg:order-1 order-2">
          <RoomManager
            palace={palace}
            coins={coins}
            onSelect={handleSelectRoom}
            onAdd={handleAddRoom}
            onRename={handleRenameRoom}
            onDelete={handleDeleteRoom}
          />

          {/* Stats */}
          <Card className="border-2 border-stone-100">
            <CardContent className="p-3 space-y-1">
              <p className="text-xs text-stone-500">This room</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-emerald-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-emerald-700">{itemCount}</p>
                  <p className="text-[10px] text-stone-500">Items</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-amber-700">{noteCount}</p>
                  <p className="text-[10px] text-stone-500">Notes</p>
                </div>
              </div>
              <Button
                onClick={() => setStudying(true)}
                disabled={noteCount === 0}
                size="sm"
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 text-white rounded-full text-xs h-8 mt-2 gap-1"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Study This Room
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CENTER — canvas */}
        <div className="space-y-3 lg:order-2 order-1">
          <Card className="border-2 border-stone-100">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <p className="text-sm font-bold text-stone-800">{room?.name || 'Room'}</p>
                  {room?.subject && <p className="text-[10px] text-stone-500">{room.subject}</p>}
                </div>
                <p className="text-[10px] text-stone-400 italic flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Drag items in · Click placed items to add notes
                </p>
              </div>
              {room && (
                <RoomCanvas
                  room={room}
                  customUploads={palace.custom_uploads || []}
                  onMoveItem={handleMoveItem}
                  onRemoveItem={handleRemoveItem}
                  onSelectItem={(item) => setSelectedItem(item)}
                  onDropItem={handleDropItem}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — palette / shop */}
        <div className="lg:order-3 order-3">
          <PaletteShop
            palace={palace}
            coins={coins}
            onPurchase={handlePurchase}
            onChangeWallpaper={handleChangeWallpaper}
            onChangeFloor={handleChangeFloor}
            onChoosePet={handleChoosePet}
            onAddCustomUpload={handleAddUpload}
          />
        </div>
      </div>

      {/* Note editor modal */}
      <NoteEditor
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        customUploads={palace.custom_uploads || []}
        onSave={handleSaveNote}
        onStudyMode={() => { setSelectedItem(null); setStudying(true); }}
      />

      {/* Study mode modal */}
      <StudyMode
        open={studying}
        onClose={() => setStudying(false)}
        room={room}
        customUploads={palace.custom_uploads || []}
      />
    </div>
  );
}
