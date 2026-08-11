import React, { useState } from 'react';
import { X } from 'lucide-react';
import DraggablePanel from './DraggablePanel';

export default function ScientificCalculator({ onClose }) {
  const [loaded, setLoaded] = useState(false);

  const headerSlot = (
    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
      <X className="w-4 h-4" />
    </button>
  );

  return (
    <DraggablePanel
      defaultPos={{ x: window.innerWidth - 420, y: 88 }}
      defaultSize={{ w: 390, h: 680 }}
      minSize={{ w: 280, h: 400 }}
      maxSize={{ w: 600, h: 950 }}
      zIndex={9999}
      title="TI-84 Plus CE Calculator"
      headerSlot={headerSlot}
      headerBg="bg-slate-800"
    >
      <div className="bg-slate-900 w-full h-full relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading TI-84 Plus CE...</p>
            </div>
          </div>
        )}
        <iframe
          src="https://ti84hub.com?embed=true"
          width="100%"
          height="100%"
          frameBorder="0"
          title="TI-84 Plus CE Graphing Calculator"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{ border: 'none', display: 'block', width: '100%', height: '100%' }}
        />
      </div>
    </DraggablePanel>
  );
}
