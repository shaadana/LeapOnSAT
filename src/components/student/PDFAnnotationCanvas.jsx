import React, { useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pen, Eraser, Undo, Save, Loader2, ChevronLeft, ChevronRight, Highlighter } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { base44 } from '@/api/base44Client';

import { SecureContentWrapper } from '@/components/media/AttachmentRenderer';

export default function PDFAnnotationCanvas({ pdfUrl, onSave, onCancel, isSaving, isLocked }) {
  const canvasRef = useRef(null);
  const [securePdfUrl, setSecurePdfUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const loadPdf = async () => {
      if (!isLocked) {
        setSecurePdfUrl(pdfUrl);
        return;
      }
      try {
        const proxyRes = await base44.functions.invoke('securePdfProxy', { url: pdfUrl });
        if (proxyRes.data && proxyRes.data.base64) {
          const base64Str = proxyRes.data.base64;
          const binaryString = window.atob(base64Str);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const newObjectUrl = URL.createObjectURL(blob);
          if (isMounted) {
            objectUrl = newObjectUrl;
            setSecurePdfUrl(newObjectUrl);
          } else {
            URL.revokeObjectURL(newObjectUrl);
          }
        } else {
          setSecurePdfUrl(pdfUrl);
        }
      } catch (err) {
        setSecurePdfUrl(pdfUrl);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl, isLocked]);
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [mode, setMode] = useState('draw'); // 'draw', 'erase', 'highlight'
  const [history, setHistory] = useState([]);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 800 });

  const handlePageLoadSuccess = (page) => {
    // Reset canvas when page loads
    setHistory([]);
    
    const viewport = page.getViewport({ scale: 600 / page.getViewport({ scale: 1 }).width });
    setCanvasSize({ width: viewport.width, height: viewport.height });
    
    setCanvasKey(prev => prev + 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    setCtx(context);
  }, [canvasKey]);

  const saveState = () => {
    if (!canvasRef.current) return;
    setHistory(prev => [...prev, canvasRef.current.toDataURL()]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);
    setCanvasKey(prev => prev + 1);
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

    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = lineWidth * 3;
    } else if (mode === 'highlight') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 2;
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 1;
    }

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && ctx) {
      ctx.closePath();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      setIsDrawing(false);
      saveState();
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

  const handleSave = async () => {
    if (!containerRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    } catch (err) {
      console.error("Failed to generate PDF canvas:", err);
      // Fallback
      if (canvasRef.current) {
        onSave(canvasRef.current.toDataURL('image/png'));
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-stone-200">
        <div className="flex gap-2 border-r border-stone-200 pr-3">
          <Button
            variant={mode === 'draw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('draw')}
            className={mode === 'draw' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
          >
            <Pen className="w-4 h-4 mr-2" /> Draw
          </Button>
          <Button
            variant={mode === 'highlight' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('highlight')}
            className={mode === 'highlight' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
          >
            <Highlighter className="w-4 h-4 mr-2" /> Highlight
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
          <div className="flex items-center gap-2 border-r border-stone-200 pr-3">
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

        <div className="flex items-center gap-2 border-r border-stone-200 pr-3 w-32">
          <span className="text-xs text-stone-500 font-medium">Size:</span>
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
            Submit
          </Button>
        </div>
      </div>

      {/* PDF Viewer with Canvas Overlay */}
      <SecureContentWrapper isLocked={isLocked}>
      <div className="relative bg-stone-100 rounded-lg border-2 border-dashed border-stone-300 overflow-auto" style={{ maxHeight: '70vh' }}>
        <div className="flex items-center justify-center">
          {securePdfUrl ? (
            <Document file={securePdfUrl} onLoadSuccess={handleDocumentLoadSuccess} loading={<Loader2 className="w-8 h-8 animate-spin text-stone-400" />}>
            <div className="relative inline-block" ref={containerRef}>
              <Page pageNumber={currentPage} width={600} onLoadSuccess={handlePageLoadSuccess} renderTextLayer={false} renderAnnotationLayer={false} />
              <canvas
                key={canvasKey}
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}

                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute top-0 left-0 cursor-crosshair touch-none"
              />
            </div>
          </Document>
          ) : (
            <div className="p-12"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>
          )}
        </div>
      </div>
      </SecureContentWrapper>

      {/* Page Navigation */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-gray-600">
            Page {currentPage} of {numPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} disabled={currentPage === numPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
