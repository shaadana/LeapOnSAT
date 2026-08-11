import React from 'react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Paperclip, Image as ImageIcon, FileText, Pin, Flag, Lock, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function useScreenshotProtection(isLocked) {
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    if (!isLocked) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    const handleVisibilityChange = () => setIsFocused(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleKeyEvent = (e) => {
      // Intercept PrintScreen and Cmd/Ctrl + Shift + 3/4/5/S (common screenshot shortcuts)
      if (
        e.key === 'PrintScreen' || 
        ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5', 's', 'S', '#', '$', '%'].includes(e.key))
      ) {
        setIsFocused(false);
        try { navigator.clipboard.writeText('Screenshots are disabled.'); } catch (err) {}
        
        const restoreFocus = () => {
          setIsFocused(true);
          document.removeEventListener('mousedown', restoreFocus);
          document.removeEventListener('keydown', restoreFocusKey);
        };
        const restoreFocusKey = (e2) => {
          if (!((e2.metaKey || e2.ctrlKey) && e2.shiftKey)) {
             restoreFocus();
          }
        };
        
        setTimeout(() => {
           document.addEventListener('mousedown', restoreFocus);
           document.addEventListener('keydown', restoreFocusKey);
        }, 500);
      }
    };
    
    window.addEventListener('keydown', handleKeyEvent);
    window.addEventListener('keyup', handleKeyEvent);

    // Initial check
    if (!document.hasFocus()) {
      setIsFocused(false);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyEvent);
      window.removeEventListener('keyup', handleKeyEvent);
    };
  }, [isLocked]);

  return isFocused;
}

export function SecureContentWrapper({ isLocked, children, className = "" }) {
  const isFocused = useScreenshotProtection(isLocked);
  
  if (!isLocked) return children;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <div className={`w-full h-full transition-opacity duration-75 ${!isFocused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {children}
      </div>
      {!isFocused && (
        <div className="absolute inset-0 bg-stone-950 z-50 flex items-center justify-center">
          <span className="text-white/70 text-sm select-none px-4 text-center pointer-events-none">
            Content protected.<br/>Focus window to view.
          </span>
        </div>
      )}
    </div>
  );
}

export function LockedPdfViewer({ url, isFullscreen }) {
  const [numPages, setNumPages] = useState(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [pdfData, setPdfData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const loadPdf = async () => {
      setFetchError(null);
      
      try {
        // Attempt 1: Highly reliable secure backend proxy (bypasses all CORS/adblocker issues)
        const proxyRes = await base44.functions.invoke('securePdfProxy', { url });
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
            setPdfData(newObjectUrl);
          } else {
            URL.revokeObjectURL(newObjectUrl);
          }
          return;
        }
        throw new Error(proxyRes.data?.error || "Proxy failed to return base64");
      } catch (backendErr) {
        console.warn("Backend proxy failed, trying direct fetch...", backendErr);
        
        try {
          // Attempt 2: Direct fetch fallback
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          
          const buffer = await res.arrayBuffer();
          const header = String.fromCharCode(...new Uint8Array(buffer).subarray(0, 5));
          if (header !== '%PDF-') {
            throw new Error("Invalid PDF format received");
          }
          
          const blob = new Blob([buffer], { type: 'application/pdf' });
          const newObjectUrl = URL.createObjectURL(blob);
          if (isMounted) {
            objectUrl = newObjectUrl;
            setPdfData(newObjectUrl);
          } else {
            URL.revokeObjectURL(newObjectUrl);
          }
        } catch (directErr) {
          console.error("All secure load attempts failed:", directErr);
          if (isMounted) setFetchError("Unable to securely load the document. Please check your network connection or adblocker.");
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <div 
      className={`w-full overflow-y-auto bg-stone-200/50 flex flex-col items-center py-6 relative ${isFullscreen ? 'h-full rounded-md' : 'h-[500px]'}`}
      onContextMenu={e => e.preventDefault()}
    >
      {fetchError ? (
        <div className="p-4 text-red-500 text-center">
          Failed to securely load document.<br/>
          <span className="text-xs opacity-70">{fetchError}</span>
        </div>
      ) : !pdfData ? (
        <div className="p-4 text-stone-500 animate-pulse">Downloading secure document...</div>
      ) : (
        <Document
          file={pdfData}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="p-4 text-stone-500 animate-pulse">Rendering document...</div>}
          error={(err) => <div className="p-4 text-red-500 text-center">Failed to render PDF.<br/><span className="text-xs opacity-70">{err?.message || 'Unknown render error'}</span></div>}
          className="flex flex-col items-center w-full"
        >
          {Array.from(new Array(numPages || 0), (el, index) => (
            <div key={`page_${index + 1}`} className="mb-6 relative shadow-lg bg-white">
              <Page 
                pageNumber={index + 1} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                width={isFullscreen ? Math.min(width - 64, 1200) : Math.min(width - 64, 700)}
              />
              {/* Transparent overlay to block right clicks on the canvas */}
              <div className="absolute inset-0 z-10" onContextMenu={e => e.preventDefault()} />
            </div>
          ))}
        </Document>
      )}
    </div>
  );
}

export default function AttachmentRenderer({ attachments }) {
  const [fullscreenAtt, setFullscreenAtt] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="mt-2 space-y-2">
        {attachments.map((att, idx) => {
          const isImage = att.type?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
          const isPdf = att.type?.startsWith('application/pdf') || att.url?.endsWith('.pdf');
          
          return (
            <div key={idx} className="relative inline-block max-w-full">
              <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                {att.pinned && <div className="bg-white p-1 rounded-full shadow-sm"><Pin className="w-3 h-3 text-emerald-600 fill-emerald-600" /></div>}
                {att.flagged && <div className="bg-white p-1 rounded-full shadow-sm"><Flag className="w-3 h-3 text-red-500 fill-red-500" /></div>}
              </div>
              
              {isImage ? (
                <div className="rounded-lg overflow-hidden border bg-black/5 max-w-sm relative group cursor-pointer" onClick={() => setFullscreenAtt(att)}>
                  {att.locked ? (
                    <SecureContentWrapper isLocked={true} className="w-full h-full">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={att.url} 
                          alt={att.name || 'Attachment'} 
                          className="max-w-full h-auto max-h-48 object-cover select-none pointer-events-none" 
                          onContextMenu={e => e.preventDefault()} 
                          draggable="false" 
                        />
                        <div className="absolute inset-0 z-20 bg-transparent" onContextMenu={e => e.preventDefault()} />
                      </div>
                    </SecureContentWrapper>
                  ) : (
                    <img src={att.url} alt={att.name || 'Attachment'} className="max-w-full h-auto max-h-48 object-cover" />
                  )}
                  <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                att.locked && isPdf ? (
                   <div className="mt-2 border rounded-lg overflow-hidden bg-white w-full max-w-3xl relative group">
                      <SecureContentWrapper isLocked={true} className="w-full h-full">
                        <LockedPdfViewer url={att.url} isFullscreen={false} />
                      </SecureContentWrapper>
                      <button 
                        onClick={() => setFullscreenAtt(att)}
                        className="absolute top-4 right-4 p-2 bg-stone-800/80 hover:bg-stone-800 rounded-md text-white shadow-sm z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
                      >
                        <Maximize2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Full Screen</span>
                      </button>
                   </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href={att.locked ? undefined : att.url}
                      target={att.locked ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors w-fit max-w-full text-gray-800 ${att.locked ? 'cursor-not-allowed opacity-80' : ''}`}
                      onClick={(e) => att.locked && e.preventDefault()}
                    >
                      {isPdf ? (
                        <FileText className="w-4 h-4 text-red-500" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">{att.name || 'Document'}</span>
                      {att.locked && <Lock className="w-3 h-3 text-stone-400 ml-1" />}
                    </a>
                    {!att.locked && isPdf && (
                      <button 
                        onClick={() => setFullscreenAtt(att)}
                        className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors border border-transparent"
                        title="View Full Screen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              )}

              {att.tags && att.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {att.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">#{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!fullscreenAtt} onOpenChange={(open) => !open && setFullscreenAtt(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden bg-stone-950/95 border-stone-800 flex flex-col">
          {fullscreenAtt && (
            <div className="relative w-full h-full flex flex-col">
              {/* Header bar with title */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-40 flex items-center justify-between pointer-events-none">
                <span className="text-white font-medium text-sm drop-shadow-md">
                  {fullscreenAtt.name || 'Attachment'} {fullscreenAtt.locked && '(Locked)'}
                </span>
              </div>
              
              <div className="flex-1 w-full h-full flex items-center justify-center p-4">
                <SecureContentWrapper isLocked={fullscreenAtt.locked} className="w-full h-full max-w-full max-h-full">
                  {fullscreenAtt.type?.startsWith('image/') || fullscreenAtt.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                      <img 
                        src={fullscreenAtt.url} 
                        alt={fullscreenAtt.name} 
                        className="max-w-full max-h-full object-contain select-none pointer-events-none"
                        onContextMenu={e => fullscreenAtt.locked && e.preventDefault()}
                        draggable="false"
                      />
                      {fullscreenAtt.locked && (
                        <div className="absolute inset-0 z-20 bg-transparent" onContextMenu={e => e.preventDefault()} />
                      )}
                    </div>
                  ) : (
                    fullscreenAtt.locked ? (
                      <div className="w-full h-full pt-12 pb-4 px-4">
                        <LockedPdfViewer url={fullscreenAtt.url} isFullscreen={true} />
                      </div>
                    ) : (
                      <iframe 
                        src={fullscreenAtt.url} 
                        className="w-full h-full rounded-md bg-white mt-12" 
                      />
                    )
                  )}
                </SecureContentWrapper>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
