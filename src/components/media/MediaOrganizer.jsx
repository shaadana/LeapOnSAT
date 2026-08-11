import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, FileText, Paperclip, Pin, Flag, Tag as TagIcon, MoreVertical, Edit2, Search, Filter, Lock } from 'lucide-react';
import { SecureContentWrapper, LockedPdfViewer } from './AttachmentRenderer';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function MediaOrganizer({ mediaItems, queryKeysToInvalidate }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', pinned: false, flagged: false, tagInput: '', tags: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ entityType, entityId, parentRecord, attIdx, updates }) => {
      const newAttachments = [...parentRecord.attachments];
      newAttachments[attIdx] = { ...newAttachments[attIdx], ...updates };
      return base44.entities[entityType].update(entityId, { attachments: newAttachments });
    },
    onSuccess: () => {
      queryKeysToInvalidate.forEach(key => queryClient.invalidateQueries(key));
      setEditingItem(null);
      toast.success('Media updated successfully');
    },
  });

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      pinned: item.pinned || false,
      flagged: item.flagged || false,
      tagInput: '',
      tags: item.tags || []
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      entityType: editingItem.entityType,
      entityId: editingItem.entityId,
      parentRecord: editingItem.parentRecord,
      attIdx: editingItem.attIdx,
      updates: {
        name: editForm.name,
        pinned: editForm.pinned,
        flagged: editForm.flagged,
        tags: editForm.tags
      }
    });
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && editForm.tagInput.trim()) {
      e.preventDefault();
      if (!editForm.tags.includes(editForm.tagInput.trim())) {
        setEditForm(prev => ({
          ...prev,
          tags: [...prev.tags, prev.tagInput.trim()],
          tagInput: ''
        }));
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  if (mediaItems.length === 0) {
    return <p className="text-center text-gray-500 py-12">No media shared yet.</p>;
  }

  const filteredMedia = mediaItems.filter(media => {
    if (filterPinned && !media.pinned) return false;
    if (filterFlagged && !media.flagged) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = media.name?.toLowerCase().includes(query);
      const matchTags = media.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchName && !matchTags) return false;
    }
    return true;
  });

  // Sort: pinned first, then by date descending
  const sortedMedia = [...filteredMedia].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by name or tag..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterPinned ? "default" : "outline"} 
            className={filterPinned ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            onClick={() => setFilterPinned(!filterPinned)}
          >
            <Pin className={`w-4 h-4 mr-2 ${filterPinned ? "fill-white" : ""}`} /> 
            Pinned
          </Button>
          <Button 
            variant={filterFlagged ? "default" : "outline"} 
            className={filterFlagged ? "bg-red-500 hover:bg-red-600" : ""}
            onClick={() => setFilterFlagged(!filterFlagged)}
          >
            <Flag className={`w-4 h-4 mr-2 ${filterFlagged ? "fill-white" : ""}`} /> 
            Flagged
          </Button>
        </div>
      </div>

      {sortedMedia.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No files match your search criteria.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMedia.map((media, idx) => {
          const isImage = media.type?.startsWith('image/') || media.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
          
          return (
            <div key={`${media.entityId}-${idx}`} className="border rounded-lg overflow-hidden bg-gray-50 flex flex-col hover:shadow-md transition-shadow relative group">
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                {media.pinned && <div className="bg-white/90 p-1 rounded-full shadow-sm"><Pin className="w-4 h-4 text-emerald-600 fill-emerald-600" /></div>}
                {media.flagged && <div className="bg-white/90 p-1 rounded-full shadow-sm"><Flag className="w-4 h-4 text-red-500 fill-red-500" /></div>}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/90 shadow-sm rounded-full">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(media)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Organize
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {isImage ? (
                media.locked ? (
                  <div onClick={() => setFullscreenMedia(media)} className="block h-40 bg-gray-200 cursor-pointer relative">
                    <img src={media.url} alt={media.name} className="w-full h-full object-cover select-none pointer-events-none" onContextMenu={e => e.preventDefault()} draggable="false" />
                    <div className="absolute inset-0 z-20 bg-transparent" onContextMenu={e => e.preventDefault()} />
                    <div className="absolute top-2 left-2 bg-white/90 p-1 rounded-full shadow-sm z-30">
                      <Lock className="w-4 h-4 text-stone-500" />
                    </div>
                  </div>
                ) : (
                  <a href={media.url} target="_blank" rel="noopener noreferrer" className="block h-40 bg-gray-200">
                    <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                  </a>
                )
              ) : (
                <a 
                  href={media.locked ? undefined : media.url} 
                  target={media.locked ? undefined : "_blank"} 
                  rel={media.locked ? undefined : "noopener noreferrer"} 
                  className={`flex-1 flex flex-col items-center justify-center h-40 p-4 transition-colors relative ${media.locked ? 'cursor-pointer bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-100'}`}
                  onClick={(e) => {
                    if (media.locked) {
                      e.preventDefault();
                      setFullscreenMedia(media);
                    }
                  }}
                >
                  {media.locked && (
                    <div className="absolute top-2 left-2 bg-white/90 p-1 rounded-full shadow-sm z-10">
                      <Lock className="w-4 h-4 text-stone-500" />
                    </div>
                  )}
                  {media.type?.startsWith('application/pdf') || media.url?.endsWith('.pdf') ? (
                    <FileText className="w-12 h-12 text-red-500 mb-2" />
                  ) : (
                    <Paperclip className="w-12 h-12 text-gray-500 mb-2" />
                  )}
                  <span className="text-sm font-medium text-center line-clamp-2 w-full">{media.name || 'Document'}</span>
                </a>
              )}
              
              <div className="p-3 bg-white border-t flex flex-col gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-900 truncate" title={media.name}>{media.name || 'Attachment'}</p>
                  <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                    <span className="truncate pr-2">{media.sender} ({media.source})</span>
                    <span className="shrink-0">{format(new Date(media.date), 'MMM d, yy')}</span>
                  </div>
                </div>
                {media.tags && media.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {media.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organize Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">File Name</label>
              <Input 
                value={editForm.name} 
                onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))} 
              />
            </div>
            
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant={editForm.pinned ? "default" : "outline"} 
                className={editForm.pinned ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                onClick={() => setEditForm(prev => ({...prev, pinned: !prev.pinned}))}
              >
                <Pin className={`w-4 h-4 mr-2 ${editForm.pinned ? "fill-white" : ""}`} /> 
                {editForm.pinned ? "Pinned" : "Pin"}
              </Button>
              <Button 
                type="button" 
                variant={editForm.flagged ? "default" : "outline"}
                className={editForm.flagged ? "bg-red-500 hover:bg-red-600" : ""}
                onClick={() => setEditForm(prev => ({...prev, flagged: !prev.flagged}))}
              >
                <Flag className={`w-4 h-4 mr-2 ${editForm.flagged ? "fill-white" : ""}`} /> 
                {editForm.flagged ? "Flagged" : "Flag"}
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                <TagIcon className="w-4 h-4" /> Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editForm.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-gray-900 ml-1">×</button>
                  </Badge>
                ))}
              </div>
              <Input 
                placeholder="Type tag and press Enter..." 
                value={editForm.tagInput}
                onChange={(e) => setEditForm(prev => ({...prev, tagInput: e.target.value}))}
                onKeyDown={handleAddTag}
              />
            </div>

            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4" 
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fullscreenMedia} onOpenChange={(open) => !open && setFullscreenMedia(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden bg-stone-950/95 border-stone-800 flex flex-col">
          {fullscreenMedia && (
            <div className="relative w-full h-full flex flex-col">
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-40 flex items-center justify-between pointer-events-none">
                <span className="text-white font-medium text-sm drop-shadow-md">
                  {fullscreenMedia.name || 'Attachment'} {fullscreenMedia.locked && '(Locked)'}
                </span>
              </div>
              
              <div className="flex-1 w-full h-full flex items-center justify-center p-4">
                <SecureContentWrapper isLocked={fullscreenMedia.locked} className="w-full h-full max-w-full max-h-full">
                  {fullscreenMedia.type?.startsWith('image/') || fullscreenMedia.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                      <img 
                        src={fullscreenMedia.url} 
                        alt={fullscreenMedia.name} 
                        className="max-w-full max-h-full object-contain select-none pointer-events-none"
                        onContextMenu={e => fullscreenMedia.locked && e.preventDefault()}
                        draggable="false"
                      />
                      {fullscreenMedia.locked && (
                        <div className="absolute inset-0 z-20 bg-transparent" onContextMenu={e => e.preventDefault()} />
                      )}
                    </div>
                  ) : (
                    fullscreenMedia.locked ? (
                      <div className="w-full h-full pt-12 pb-4 px-4">
                        <LockedPdfViewer url={fullscreenMedia.url} isFullscreen={true} />
                      </div>
                    ) : (
                      <iframe 
                        src={fullscreenMedia.url} 
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
