import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  FURNITURE,
  WALLPAPERS,
  FLOORS,
  PETS,
  FURNITURE_CATEGORIES,
} from '@/data/memoryPalaceCatalog';
import PaletteIcon from './PaletteIcon';
import { base44 } from '@/api/base44Client';

/**
 * Side panel that lets the user buy and drag items into the room.
 *
 * Tabs: Furniture (filtered by category) | Wallpaper | Floor | Pets | My Uploads
 */
export default function PaletteShop({
  palace,
  coins,
  onPurchase,            // (catalogId)
  onChangeWallpaper,     // (id)
  onChangeFloor,         // (id)
  onChoosePet,           // (id) — placed in the active room
  onAddCustomUpload,     // (label, url)
}) {
  const [tab, setTab] = useState('furniture');
  const [category, setCategory] = useState('study');
  const fileRef = useRef(null);
  const [uploadingLabel, setUploadingLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  const owned = new Set(palace.owned_catalog_ids || []);
  const room = (palace.rooms || []).find(r => r.id === palace.active_room_id) || palace.rooms?.[0];

  const handleDragStart = (e, item, customUrl = null) => {
    if (!owned.has(item.id) && !customUrl) return; // can't drag unowned
    e.dataTransfer.setData('catalog-id', item.id);
    if (customUrl) e.dataTransfer.setData('custom-url', customUrl);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onAddCustomUpload(uploadingLabel || file.name, file_url);
      setUploadingLabel('');
      toast.success('Custom decoration added!');
    } catch (err) {
      toast.error('Upload failed');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── FURNITURE TAB ──
  const renderFurniture = () => {
    const items = FURNITURE.filter(i => i.category === category);
    return (
      <>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {FURNITURE_CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-all ${
                category === c.key
                  ? 'bg-emerald-500 text-white shadow'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span className="mr-0.5">{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map(item => {
            const isOwned = owned.has(item.id);
            const canAfford = coins >= item.cost;
            return (
              <div
                key={item.id}
                draggable={isOwned}
                onDragStart={(e) => handleDragStart(e, item)}
                className={`p-2 rounded-xl border-2 text-center transition-all ${
                  isOwned
                    ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-500 cursor-grab active:cursor-grabbing'
                    : canAfford
                    ? 'border-stone-200 bg-white hover:border-emerald-300'
                    : 'border-stone-200 bg-stone-50 opacity-70'
                }`}
              >
                <div className="w-10 h-10 mx-auto"><PaletteIcon catalogId={item.id} className="w-full h-full" /></div>
                <p className="text-[10px] font-semibold text-stone-700 truncate mt-1">{item.label}</p>
                {isOwned ? (
                  <p className="text-[9px] text-emerald-600 font-bold mt-0.5">↕ Drag in</p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onPurchase(item.id)}
                    disabled={!canAfford}
                    className="w-full text-[10px] h-6 mt-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-full"
                  >
                    {canAfford ? `🪙 ${item.cost}` : <><Lock className="w-2.5 h-2.5 mr-0.5" />🪙 {item.cost}</>}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // ── WALLPAPER / FLOOR ──
  const renderSurfaces = (list, onApply, currentId) => (
    <div className="grid grid-cols-2 gap-2">
      {list.map(s => {
        const isOwned = owned.has(s.id) || s.default;
        const canAfford = coins >= s.cost;
        const equipped = currentId === s.id;
        return (
          <div
            key={s.id}
            className={`rounded-xl border-2 overflow-hidden transition-all ${
              equipped ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-stone-200'
            }`}
          >
            <div className="h-16 w-full" style={{ background: s.css }} />
            <div className="p-2 text-center bg-white">
              <p className="text-[11px] font-semibold text-stone-700 truncate">{s.label}</p>
              {equipped ? (
                <p className="text-[9px] text-emerald-600 font-bold">✓ Active</p>
              ) : isOwned ? (
                <Button size="sm" onClick={() => onApply(s.id)} className="w-full text-[10px] h-6 mt-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
                  Apply
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onPurchase(s.id)}
                  disabled={!canAfford}
                  className="w-full text-[10px] h-6 mt-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-full"
                >
                  🪙 {s.cost}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── PETS ──
  const renderPets = () => (
    <div className="grid grid-cols-2 gap-2">
      {PETS.map(p => {
        const isOwned = owned.has(p.id);
        const canAfford = coins >= p.cost;
        const isActive = room?.pet_id === p.id;
        return (
          <div key={p.id} className={`rounded-xl border-2 p-2 text-center transition-all ${
            isActive ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'
          }`}>
            <div className="w-14 h-14 mx-auto rounded-full bg-stone-50 p-1">
              <img src={p.url} alt={p.label} className="w-full h-full object-contain" />
            </div>
            <p className="text-[11px] font-semibold text-stone-700 truncate mt-1">{p.label}</p>
            {isActive ? (
              <p className="text-[9px] text-emerald-600 font-bold mt-0.5">✓ In Room</p>
            ) : isOwned ? (
              <Button size="sm" onClick={() => onChoosePet(p.id)} className="w-full text-[10px] h-6 mt-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
                Place
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onPurchase(p.id)}
                disabled={!canAfford}
                className="w-full text-[10px] h-6 mt-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-full"
              >
                🪙 {p.cost}
              </Button>
            )}
          </div>
        );
      })}
      {room?.pet_id && (
        <div className="col-span-2">
          <Button size="sm" variant="outline" onClick={() => onChoosePet('')} className="w-full text-xs rounded-full border-stone-300 text-stone-600">
            Remove pet from this room
          </Button>
        </div>
      )}
    </div>
  );

  // ── UPLOADS ──
  const renderUploads = () => (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-emerald-300 p-3 bg-emerald-50/40">
        <p className="text-xs font-semibold text-stone-700 mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Upload your own decoration
        </p>
        <Input
          placeholder="Decoration name (optional)"
          value={uploadingLabel}
          onChange={(e) => setUploadingLabel(e.target.value)}
          className="text-xs h-8 mb-2"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.svg"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs h-7 gap-1"
        >
          <Upload className="w-3 h-3" />
          {uploading ? 'Uploading…' : 'Choose Image'}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(palace.custom_uploads || []).length === 0 ? (
          <p className="col-span-3 text-xs text-stone-400 italic text-center py-4">No uploads yet</p>
        ) : palace.custom_uploads.map(u => (
          <div
            key={u.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('catalog-id', u.id);
              e.dataTransfer.setData('custom-url', u.url);
            }}
            className="p-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 cursor-grab active:cursor-grabbing text-center hover:border-emerald-500"
          >
            <img src={u.url} alt={u.label} className="w-10 h-10 mx-auto object-contain" />
            <p className="text-[10px] font-semibold text-stone-700 truncate mt-1">{u.label}</p>
            <p className="text-[9px] text-emerald-600 font-bold">↕ Drag in</p>
          </div>
        ))}
      </div>
    </div>
  );

  const TABS = [
    { key: 'furniture',  label: 'Furniture' },
    { key: 'wallpaper',  label: 'Walls' },
    { key: 'floor',      label: 'Floor' },
    { key: 'pets',       label: 'Pets' },
    { key: 'uploads',    label: 'Uploads' },
  ];

  return (
    <Card className="border-2 border-emerald-100 bg-white shadow-md">
      <CardContent className="p-3 space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                tab === t.key ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'furniture' && renderFurniture()}
        {tab === 'wallpaper' && renderSurfaces(WALLPAPERS, onChangeWallpaper, room?.wallpaper)}
        {tab === 'floor'     && renderSurfaces(FLOORS, onChangeFloor, room?.floor)}
        {tab === 'pets'      && renderPets()}
        {tab === 'uploads'   && renderUploads()}
      </CardContent>
    </Card>
  );
}
