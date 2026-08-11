import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GripHorizontal } from 'lucide-react';

/**
 * DraggablePanel — wraps any content in a draggable + resizable floating window.
 * Props:
 *   defaultPos   { x, y }       — initial position (px from top-left of viewport)
 *   defaultSize  { w, h }       — initial size in px
 *   minSize      { w, h }
 *   maxSize      { w, h }
 *   zIndex       number
 *   title        string         — shown in drag handle
 *   headerSlot   ReactNode      — extra controls beside the title (e.g. close button)
 *   headerBg     string         — tailwind bg class for header
 *   children
 */
export default function DraggablePanel({
  defaultPos = { x: 80, y: 88 },
  defaultSize = { w: 400, h: 500 },
  minSize = { w: 260, h: 200 },
  maxSize = { w: 1200, h: 900 },
  zIndex = 9999,
  title,
  headerSlot,
  headerBg = 'bg-slate-800',
  children,
}) {
  const [pos, setPos] = useState(defaultPos);
  const [size, setSize] = useState(defaultSize);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const startRef = useRef({});
  const panelRef = useRef(null);

  // ── Drag ──────────────────────────────────────────
  const onDragMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const dx = ev.clientX - startRef.current.mx;
      const dy = ev.clientY - startRef.current.my;
      setPos({
        x: Math.max(0, startRef.current.px + dx),
        y: Math.max(0, startRef.current.py + dy),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  // ── Resize ────────────────────────────────────────
  const onResizeMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, sw: size.w, sh: size.h };

    const onMove = (ev) => {
      if (!resizing.current) return;
      const dw = ev.clientX - startRef.current.mx;
      const dh = ev.clientY - startRef.current.my;
      setSize({
        w: Math.min(maxSize.w, Math.max(minSize.w, startRef.current.sw + dw)),
        h: Math.min(maxSize.h, Math.max(minSize.h, startRef.current.sh + dh)),
      });
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size, minSize, maxSize]);

  return (
    <div
      ref={panelRef}
      className="fixed flex flex-col rounded-2xl shadow-2xl overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex }}
    >
      {/* Drag handle / header */}
      <div
        className={`flex items-center justify-between px-3 py-2 ${headerBg} border-b border-slate-700 flex-shrink-0 cursor-grab active:cursor-grabbing`}
        onMouseDown={onDragMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
          {title && <span className="text-white text-xs font-semibold tracking-wide">{title}</span>}
        </div>
        <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
          {headerSlot}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {children}
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
        onMouseDown={onResizeMouseDown}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(148,163,184,0.5) 50%)',
          borderBottomRightRadius: '0.5rem',
        }}
      />
    </div>
  );
}
