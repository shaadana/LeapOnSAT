import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import PaletteIcon from './PaletteIcon';
import { WALLPAPERS, FLOORS, getCatalogItem, PETS } from '@/data/memoryPalaceCatalog';

/**
 * Snap-to-grid top-down room canvas. Drag items to reposition them.
 * Click an item to open its note editor.
 *
 * Drop new items by dragging from the palette (uses HTML5 drag-and-drop
 * with a `data-catalog-id` payload).
 */
export default function RoomCanvas({
  room,
  onMoveItem,
  onSelectItem,
  onDropItem,        // (catalogId, x, y) — adds new placement
  onRemoveItem,      // (instanceId)
  customUploads = [],
}) {
  const wallpaper = WALLPAPERS.find(w => w.id === room.wallpaper) || WALLPAPERS[0];
  const floor = FLOORS.find(f => f.id === room.floor) || FLOORS[0];
  const pet = room.pet_id ? PETS.find(p => p.id === room.pet_id) : null;

  const cols = room.grid_cols || 10;
  const rows = room.grid_rows || 8;
  const canvasRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const cellPct = { w: 100 / cols, h: 100 / rows };

  const cellFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    const x = Math.max(0, Math.min(cols - 1, Math.floor((cx / rect.width) * cols)));
    const y = Math.max(0, Math.min(rows - 1, Math.floor((cy / rect.height) * rows)));
    return { x, y };
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    const catalogId = e.dataTransfer.getData('catalog-id');
    const customUrl = e.dataTransfer.getData('custom-url');
    if (!catalogId && !customUrl) return;
    const { x, y } = cellFromEvent(e);
    onDropItem(catalogId, x, y, customUrl);
  };

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-full rounded-3xl shadow-xl border-4 border-white overflow-hidden select-none"
      style={{ aspectRatio: `${cols} / ${rows}` }}
    >
      {/* Walls (top 60%) */}
      <div className="absolute inset-x-0 top-0 h-[60%]" style={{ background: wallpaper.css }} />
      {/* Floor (bottom 40%) */}
      <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ background: floor.css }} />

      {/* Subtle grid overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        {[...Array(cols + 1)].map((_, i) => (
          <line key={`v${i}`} x1={`${(i / cols) * 100}%`} y1="0" x2={`${(i / cols) * 100}%`} y2="100%" stroke="#1c1917" strokeWidth="0.5" />
        ))}
        {[...Array(rows + 1)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${(i / rows) * 100}%`} x2="100%" y2={`${(i / rows) * 100}%`} stroke="#1c1917" strokeWidth="0.5" />
        ))}
      </svg>

      {/* Placed items */}
      {(room.items || []).map(item => {
        const cat = getCatalogItem(item.catalog_id);
        const customLabel = customUploads.find(c => c.id === item.catalog_id)?.label;
        const label = cat?.label || customLabel || 'Item';
        const hasNote = !!(item.note?.title || item.note?.front || item.note?.back);

        return (
          <motion.div
            key={item.instance_id}
            drag
            dragMomentum={false}
            onDragStart={() => setDraggingId(item.instance_id)}
            onDragEnd={(e) => {
              setDraggingId(null);
              const { x, y } = cellFromEvent(e);
              onMoveItem(item.instance_id, x, y);
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="absolute group cursor-grab active:cursor-grabbing"
            style={{
              left: `${item.x * cellPct.w}%`,
              top: `${item.y * cellPct.h}%`,
              width: `${cellPct.w}%`,
              height: `${cellPct.h}%`,
              zIndex: draggingId === item.instance_id ? 50 : 10 + item.y,
            }}
            onClick={(e) => {
              if (e.detail === 0) return; // ignore programmatic clicks after drag
              onSelectItem(item);
            }}
          >
            <div className="relative w-full h-full p-1">
              <PaletteIcon
                catalogId={item.catalog_id}
                customUrl={item.custom_url || customUploads.find(c => c.id === item.catalog_id)?.url}
                className="w-full h-full drop-shadow-md"
              />
              {hasNote && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white"
                  title="Has note"
                />
              )}
              {/* Hover label */}
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-stone-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                {label}
              </span>
              {/* Delete button (shows on hover) */}
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveItem(item.instance_id); }}
                className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-lg"
                title="Remove"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        );
      })}

      {/* Pet (decorative) */}
      {pet && (
        <motion.div
          animate={{ x: [0, 8, -8, 0], y: [0, -4, 0, 4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute"
          style={{
            left: `${(room.pet_x ?? 1) * cellPct.w}%`,
            top: `${(room.pet_y ?? rows - 2) * cellPct.h}%`,
            width: `${cellPct.w}%`,
            height: `${cellPct.h}%`,
            zIndex: 100,
          }}
        >
          <img src={pet.url} alt={pet.label} className="w-full h-full object-contain drop-shadow-lg" title={pet.label} />
        </motion.div>
      )}
    </div>
  );
}
