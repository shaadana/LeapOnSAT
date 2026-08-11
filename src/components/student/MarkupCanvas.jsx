import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pen, Eraser, Undo, Save, Loader2 } from 'lucide-react';

import { SecureContentWrapper } from '@/components/media/AttachmentRenderer';

export default function MarkupCanvas({ imageUrl, onSave, onCancel, isSaving, isLocked }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444'); // Default red pen
  const [lineWidth, setLineWidth] = useState(3);
  const [mode, setMode] = useState('draw'); // 'draw' or 'erase'
  const [history, setHistory] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    setCtx(context);

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for uploading back
    img.onload = () => {
      // Scale canvas to fit container but keep aspect ratio
      const container = containerRef.current;
      const maxWidth = container.clientWidth;
      const maxHeight = window.innerHeight * 0.6; // max 60% of viewport height
      
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      
      context.drawImage(img, 0, 0, width, height);
      saveState(canvas); // Save initial state
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const saveState = (canvasEl) => {
    setHistory((prev) => [...prev, canvasEl.toDataURL()]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // remove current state
    const previousState = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    ctx.beginPath();
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const { offsetX, offsetY } = getCoordinates(e);
    
    ctx.strokeStyle = mode === 'erase' ? '#ffffff' : color;
    ctx.lineWidth = mode === 'erase' ? lineWidth * 3 : lineWidth; // bigger eraser
    
    // For proper erasing on top of an image, we can use destination-out, but that makes it transparent.
    // White is simpler if the image has a white background. Let's just use destination-out for real erasing.
    if (mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && ctx) {
      ctx.closePath();
      setIsDrawing(false);
      saveState(canvasRef.current);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary canvas to draw a white background if there are transparent parts
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(canvasRef.current, 0, 0);
    
    const dataUrl = tempCanvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-stone-200">
        <div className="flex gap-2 border-r border-stone-200 pr-4">
          <Button
            variant={mode === 'draw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('draw')}
            className={mode === 'draw' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
          >
            <Pen className="w-4 h-4 mr-2" /> Draw
          </Button>
          <Button
            variant={mode === 'erase' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('erase')}
            className={mode === 'erase' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
          >
            <Eraser className="w-4 h-4 mr-2" /> Erase
          </Button>
        </div>

        {mode === 'draw' && (
          <div className="flex items-center gap-2 border-r border-stone-200 pr-4">
            {['#ef4444', '#3b82f6', '#10b981', '#1f2937', '#f59e0b'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-emerald-500' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 w-32 border-r border-stone-200 pr-4">
          <span className="text-xs text-stone-500 font-medium whitespace-nowrap">Size:</span>
          <Slider
            value={[lineWidth]}
            onValueChange={(v) => setLineWidth(v[0])}
            min={1}
            max={20}
            step={1}
          />
        </div>

        <Button variant="ghost" size="sm" onClick={undo} disabled={history.length <= 1}>
          <Undo className="w-4 h-4 mr-2" /> Undo
        </Button>
        
        <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
                Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Submit Markup
            </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <SecureContentWrapper isLocked={isLocked}>
      <div 
        ref={containerRef} 
        className="w-full bg-stone-100 rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden touch-none"
        style={{ minHeight: '400px' }}
      >
        {!imageLoaded && <Loader2 className="w-8 h-8 animate-spin text-stone-400" />}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`bg-white shadow-md ${!imageLoaded ? 'hidden' : 'block'}`}
          style={{ cursor: mode === 'erase' ? 'cell' : 'crosshair' }}
        />
      </div>
      </SecureContentWrapper>
    </div>
  );
}
