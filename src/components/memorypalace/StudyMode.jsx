import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from 'lucide-react';
import PaletteIcon from './PaletteIcon';
import { getCatalogItem } from '@/data/memoryPalaceCatalog';

/**
 * Quiz-from-the-room: cycles through every item with a note in the active room
 * and presents it as a flashcard.
 */
export default function StudyMode({ open, onClose, room, customUploads = [] }) {
  const cards = useMemo(() => {
    return (room?.items || []).filter(i =>
      i.note?.title || i.note?.front || i.note?.back
    );
  }, [room]);

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!cards.length) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Study Mode</DialogTitle></DialogHeader>
          <div className="text-center py-8 space-y-2">
            <p className="text-stone-600 text-sm">No notes in this room yet.</p>
            <p className="text-stone-400 text-xs">Click any item in your room and add a note to start studying.</p>
            <Button onClick={onClose} className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const card = cards[idx];
  const cat = getCatalogItem(card.catalog_id);
  const customUrl = card.custom_url || customUploads.find(c => c.id === card.catalog_id)?.url;
  const next = () => { setIdx((idx + 1) % cards.length); setRevealed(false); };
  const prev = () => { setIdx((idx - 1 + cards.length) % cards.length); setRevealed(false); };
  const reset = () => { setIdx(0); setRevealed(false); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Study {room?.name} ({idx + 1} / {cards.length})</DialogTitle>
        </DialogHeader>

        <div
          className="rounded-3xl border-4 border-emerald-200 p-5 min-h-[280px] cursor-pointer transition-all"
          style={{ background: card.note?.color || '#fef3c7' }}
          onClick={() => setRevealed(!revealed)}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 bg-white/60 rounded-xl p-1 flex-shrink-0">
              <PaletteIcon catalogId={card.catalog_id} customUrl={customUrl} className="w-full h-full" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                {card.note?.type || 'concept'}
              </p>
              <h3 className="text-xl font-bold text-stone-800">{card.note?.title || 'Untitled'}</h3>
              {card.note?.front && (
                <p className="text-sm text-stone-700 mt-1">{card.note.front}</p>
              )}
            </div>
          </div>

          {revealed ? (
            <div className="space-y-2 pt-2 border-t border-stone-300/60">
              {card.note?.back && (
                <div
                  className="text-sm text-stone-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: card.note.back }}
                />
              )}
              {card.note?.example && (
                <p className="text-xs text-stone-600 italic">e.g. {card.note.example}</p>
              )}
              {card.note?.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {card.note.tags.map(t => (
                    <span key={t} className="text-[10px] bg-white/70 text-stone-600 px-2 py-0.5 rounded-full">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-stone-500 text-xs italic mt-6 flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" /> Tap card to reveal
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button onClick={prev} variant="outline" size="sm" className="rounded-full">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-2 flex-1 justify-center">
            <Button onClick={() => setRevealed(!revealed)} size="sm" variant="outline" className="rounded-full">
              {revealed ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Reveal</>}
            </Button>
            <Button onClick={reset} size="sm" variant="outline" className="rounded-full">
              <RotateCcw className="w-3 h-3 mr-1" /> Restart
            </Button>
          </div>
          <Button onClick={next} size="sm" className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white">
            Next <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
