import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { ROOM_SLOT_COST, MAX_ROOMS } from '@/data/memoryPalaceCatalog';

export default function RoomManager({
  palace,
  coins,
  onSelect,
  onAdd,        // (name) => void
  onRename,     // (id, name, subject) => void
  onDelete,     // (id) => void
}) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const rooms = palace.rooms || [];
  const canAfford = coins >= ROOM_SLOT_COST;
  const roomsLeft = MAX_ROOMS - rooms.length;

  const startEdit = (r) => {
    setEditingId(r.id);
    setName(r.name);
    setSubject(r.subject || '');
  };

  const saveEdit = () => {
    onRename(editingId, name.trim() || 'Untitled Room', subject.trim());
    setEditingId(null);
  };

  return (
    <Card className="border-2 border-emerald-100 bg-white shadow-md">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-700">My Rooms ({rooms.length}/{MAX_ROOMS})</h3>
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {rooms.map(r => {
            const isActive = r.id === palace.active_room_id;
            const isEditing = editingId === r.id;
            return (
              <div
                key={r.id}
                className={`rounded-xl border-2 p-2 transition-all ${
                  isActive ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white hover:border-emerald-300'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-1.5">
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs h-7" placeholder="Room name" />
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="text-xs h-7" placeholder="Subject (optional)" />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={saveEdit} className="flex-1 h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-6 text-[10px] rounded-full">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => onSelect(r.id)} className="flex-1 text-left min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-800' : 'text-stone-700'}`}>{r.name}</p>
                      <p className="text-[10px] text-stone-500 truncate">
                        {r.subject ? `${r.subject} · ` : ''}{(r.items || []).length} items
                      </p>
                    </button>
                    <button onClick={() => startEdit(r)} className="p-1 text-stone-400 hover:text-emerald-600">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {rooms.length > 1 && (
                      <button onClick={() => onDelete(r.id)} className="p-1 text-stone-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add a room */}
        {roomsLeft > 0 && (
          adding ? (
            <div className="space-y-1.5 pt-1 border-t border-stone-100">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Room name (e.g. Vocabulary Hall)"
                className="text-xs h-7"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  disabled={!canAfford}
                  onClick={() => { onAdd(newName); setAdding(false); setNewName(''); }}
                  className="flex-1 h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-full"
                >
                  {canAfford ? `Build 🪙 ${ROOM_SLOT_COST}` : <><Lock className="w-2.5 h-2.5 mr-0.5" />🪙 {ROOM_SLOT_COST}</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="h-6 text-[10px] rounded-full">Cancel</Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setAdding(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs h-7 gap-1"
            >
              <Plus className="w-3 h-3" /> Build New Room ({ROOM_SLOT_COST} coins)
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
