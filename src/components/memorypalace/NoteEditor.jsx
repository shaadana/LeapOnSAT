import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Highlighter, StickyNote, Bold, Italic, Save, BookOpen, Hash, Lightbulb, Brain } from 'lucide-react';
import PaletteIcon from './PaletteIcon';
import { getCatalogItem } from '@/data/memoryPalaceCatalog';

const NOTE_TYPES = [
  { key: 'concept',   label: 'Concept',    icon: Brain },
  { key: 'vocab',     label: 'Vocab',      icon: BookOpen },
  { key: 'formula',   label: 'Formula',    icon: Hash },
  { key: 'flashcard', label: 'Flashcard',  icon: Lightbulb },
  { key: 'freeform',  label: 'Freeform',   icon: StickyNote },
];

const STICKY_COLORS = [
  '#fef3c7', // yellow
  '#bbf7d0', // mint
  '#fecaca', // pink
  '#bfdbfe', // blue
  '#e9d5ff', // lilac
  '#fed7aa', // peach
];

/**
 * Modal note editor.
 * Supports all 5 note types + emphasis tools (highlighter, bold, italic) for the
 * back/freeform body. Body is stored as HTML so highlighter colors persist.
 */
export default function NoteEditor({
  open,
  onClose,
  item,                // placed item with .note
  customUploads = [],
  onSave,              // (note) => void
  onStudyMode,         // optional — opens flashcard study from this room
}) {
  const [note, setNote] = useState({
    type: 'concept', title: '', front: '', back: '', example: '', tags: [], color: '#fef3c7',
  });
  const editorRef = useRef(null);

  // Seed editor state + DOM ONCE per item open. Do NOT rebind innerHTML on every keystroke
  // (that would reset the caret to the start and reverse what the user types).
  useEffect(() => {
    if (!open) return;
    const seed = item?.note || {};
    setNote({
      type: seed.type || 'concept',
      title: seed.title || '',
      front: seed.front || '',
      back: seed.back || '',
      example: seed.example || '',
      tags: seed.tags || [],
      color: seed.color || '#fef3c7',
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = seed.back || '';
    }
  }, [item?.instance_id, open]);

  if (!item) return null;

  const cat = getCatalogItem(item.catalog_id);
  const customUrl = item.custom_url || customUploads.find(c => c.id === item.catalog_id)?.url;
  const customLabel = customUploads.find(c => c.id === item.catalog_id)?.label;

  // ── EMPHASIS TOOLS ──
  // Wrap selected text inside the focused contentEditable in a tag/style.
  const applyEmphasis = (style) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement('span');
    if (style === 'highlight')      span.style.background = '#fef08a';
    else if (style === 'highlight2') span.style.background = '#bbf7d0';
    else if (style === 'highlight3') span.style.background = '#fbcfe8';
    else if (style === 'bold')       span.style.fontWeight = '700';
    else if (style === 'italic')     span.style.fontStyle = 'italic';
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
  };

  const handleBackInput = (e) => {
    setNote({ ...note, back: e.currentTarget.innerHTML });
  };

  const handleSave = () => {
    onSave(note);
    onClose();
  };

  const TypeIcon = NOTE_TYPES.find(t => t.key === note.type)?.icon || Brain;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-50 rounded-xl p-1 border border-stone-200">
              <PaletteIcon catalogId={item.catalog_id} customUrl={customUrl} className="w-full h-full" />
            </div>
            <div className="flex-1">
              <p className="text-base">{cat?.label || customLabel || 'Item'} — Memory Note</p>
              <p className="text-xs text-stone-500 font-normal">Attach a concept, term, or memory cue</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Note type */}
          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1 block">Note type</label>
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setNote({ ...note, type: t.key })}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 transition-all ${
                      note.type === t.key ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1 block">Title / Term</label>
            <Input
              value={note.title}
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              placeholder={
                note.type === 'vocab'    ? 'e.g. Ephemeral' :
                note.type === 'formula'  ? 'e.g. Quadratic Formula' :
                note.type === 'concept'  ? 'e.g. Slope-Intercept Form' :
                'Title for this note'
              }
            />
          </div>

          {/* Front (flashcard prompt or quick preview) */}
          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1 block">
              {note.type === 'flashcard' ? 'Front (prompt)' : 'Quick preview / Definition'}
            </label>
            <Input
              value={note.front}
              onChange={(e) => setNote({ ...note, front: e.target.value })}
              placeholder={
                note.type === 'flashcard' ? 'Question that shows on the front' :
                note.type === 'vocab'     ? 'Short definition' :
                'Quick summary'
              }
            />
          </div>

          {/* Back / detailed body — contentEditable with emphasis tools */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">
                {note.type === 'flashcard' ? 'Back (answer + reasoning)' : 'Full note'}
              </label>
              <div className="flex items-center gap-1">
                <button onClick={() => applyEmphasis('highlight')}  title="Yellow highlight" className="w-7 h-7 rounded hover:bg-stone-100 flex items-center justify-center"><span className="w-4 h-3 bg-yellow-200 rounded-sm" /></button>
                <button onClick={() => applyEmphasis('highlight2')} title="Mint highlight"   className="w-7 h-7 rounded hover:bg-stone-100 flex items-center justify-center"><span className="w-4 h-3 bg-emerald-200 rounded-sm" /></button>
                <button onClick={() => applyEmphasis('highlight3')} title="Pink highlight"   className="w-7 h-7 rounded hover:bg-stone-100 flex items-center justify-center"><span className="w-4 h-3 bg-pink-200 rounded-sm" /></button>
                <span className="w-px h-5 bg-stone-200 mx-1" />
                <button onClick={() => applyEmphasis('bold')}   title="Bold"   className="w-7 h-7 rounded hover:bg-stone-100 flex items-center justify-center"><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => applyEmphasis('italic')} title="Italic" className="w-7 h-7 rounded hover:bg-stone-100 flex items-center justify-center"><Italic className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleBackInput}
              className="min-h-[120px] w-full rounded-xl p-3 text-sm border-2 outline-none focus:border-emerald-400"
              style={{ background: note.color }}
            />
            <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
              <Highlighter className="w-3 h-3" /> Select text and click highlight or bold/italic to emphasize
            </p>
          </div>

          {/* Sticky color */}
          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1 block flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" /> Sticky note color
            </label>
            <div className="flex gap-1.5">
              {STICKY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNote({ ...note, color: c })}
                  className={`w-7 h-7 rounded-full border-2 ${note.color === c ? 'border-stone-800' : 'border-white'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Example (optional) */}
          {note.type !== 'flashcard' && note.type !== 'freeform' && (
            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1 block">Example (optional)</label>
              <Input
                value={note.example}
                onChange={(e) => setNote({ ...note, example: e.target.value })}
                placeholder="e.g. y = 2x + 3"
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1 block">Tags (comma separated)</label>
            <Input
              value={note.tags.join(', ')}
              onChange={(e) => setNote({ ...note, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="algebra, sat-math, week-3"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-full">Cancel</Button>
            {onStudyMode && (
              <Button variant="outline" onClick={onStudyMode} className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Lightbulb className="w-4 h-4 mr-1" /> Study Mode
              </Button>
            )}
            <Button onClick={handleSave} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
              <Save className="w-4 h-4 mr-1" /> Save Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
