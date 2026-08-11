import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Trash2, Pencil, Minus, Plus, X } from 'lucide-react';
import DraggablePanel from './DraggablePanel';

const COLORS = ['#1e293b', '#dc2626', '#16a34a', '#2563eb', '#9333ea', '#ea580c'];

export default function ScratchPad({ onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [color, setColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(2);

  // Initialize canvas with white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Resize canvas when panel changes size — keep drawing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const { offsetWidth, offsetHeight } = container;
    if (canvas.width === offsetWidth && canvas.height === offsetHeight) return;

    // Snapshot current drawing
    const img = new Image();
    img.src = canvas.toDataURL();
    canvas.width = offsetWidth;
    canvas.height = offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    img.onload = () => ctx.drawImage(img, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 6 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => { drawing.current = false; lastPos.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const headerSlot = (
    <>
      <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors" title="Close">
        <X className="w-4 h-4" />
      </button>
    </>
  );

  return (
    <DraggablePanel
      defaultPos={{ x: Math.max(20, window.innerWidth - 580), y: 110 }}
      defaultSize={{ w: 520, h: 420 }}
      minSize={{ w: 300, h: 260 }}
      maxSize={{ w: 1100, h: 800 }}
      zIndex={9998}
      title="Scratch Pad"
      headerSlot={headerSlot}
      headerBg="bg-stone-700"
    >
      <div className="flex flex-col h-full bg-white">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border-b border-stone-200 flex-shrink-0 flex-wrap">
          {/* Pen / Eraser */}
          <div className="flex gap-1">
            <button
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded-lg transition-all ${tool === 'pen' ? 'bg-stone-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              title="Pen"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-1.5 rounded-lg transition-all ${tool === 'eraser' ? 'bg-stone-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-5 bg-stone-300" />

          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen'); }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c && tool === 'pen' ? 'border-stone-900 scale-125' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-stone-300" />

          {/* Line width */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLineWidth(w => Math.max(1, w - 1))}
              className="p-1 text-stone-600 hover:bg-stone-100 rounded"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs text-stone-600 w-4 text-center font-medium">{lineWidth}</span>
            <button
              onClick={() => setLineWidth(w => Math.min(16, w + 1))}
              className="p-1 text-stone-600 hover:bg-stone-100 rounded"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-5 bg-stone-300" />

          {/* Clear */}
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          {/* Cursor indicator */}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-stone-500">
            <div
              className="rounded-full border border-stone-400"
              style={{
                width: Math.max(8, tool === 'eraser' ? lineWidth * 3 : lineWidth * 2),
                height: Math.max(8, tool === 'eraser' ? lineWidth * 3 : lineWidth * 2),
                backgroundColor: tool === 'eraser' ? 'transparent' : color,
              }}
            />
            {tool === 'eraser' ? 'Erasing' : 'Drawing'}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>
    </DraggablePanel>
  );
}
