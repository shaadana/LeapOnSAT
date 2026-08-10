import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, FileText, Plus, Pin, X, Lock, Unlock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import FileUploader from '../media/FileUploader';
import AttachmentRenderer from '../media/AttachmentRenderer';

export default function ClassAnnouncements({ classId, isTeacher, user }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'general',
    due_date: '',
    publish_at: '',
    priority: 'normal',
    pinned: false,
    attachments: [],
  });

  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', classId],
    queryFn: () => base44.entities.ClassAnnouncement.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassAnnouncement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements', classId]);
      toast.success('Announcement deleted');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassAnnouncement.create({
      ...data,
      class_id: classId,
      teacher_id: user.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements', classId]);
      setShowDialog(false);
      setFormData({
        title: '',
        content: '',
        announcement_type: 'general',
        due_date: '',
        publish_at: '',
        priority: 'normal',
        pinned: false,
        attachments: [],
      });
      toast.success('Announcement posted!');
    },
  });

  const typeIcons = {
    general: FileText,
    assignment: FileText,
    test: AlertCircle,
    reminder: Calendar,
    resource: FileText,
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-red-100 text-red-700',
  };

  const visibleAnnouncements = announcements.filter(a => {
    if (isTeacher) return true;
    if (!a.publish_at) return true;
    return new Date(a.publish_at) <= new Date();
  });

  const sortedAnnouncements = [...visibleAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Announcement details"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.announcement_type} onValueChange={(value) => setFormData({ ...formData, announcement_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="resource">Resource</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(formData.announcement_type === 'assignment' || formData.announcement_type === 'test') && (
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              )}
              {isTeacher && (
                <div>
                  <Label>Schedule Post Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.publish_at}
                    onChange={(e) => setFormData({ ...formData, publish_at: e.target.value })}
                  />
                  <p className="text-xs text-stone-500 mt-1">Leave empty to post immediately.</p>
                </div>
              )}
              <div>
                <Label>Attachments</Label>
                {formData.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 mt-1 p-2 border rounded-lg bg-gray-50">
                    {formData.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white px-2 py-1 rounded-md text-sm border shadow-sm">
                        {att.locked && <Lock className="w-3 h-3 text-amber-500" />}
                        <span className="truncate max-w-[200px]">{att.name}</span>
                        <button type="button" onClick={() => {
                          const newAtt = [...formData.attachments];
                          newAtt[idx] = { ...newAtt[idx], locked: !newAtt[idx].locked };
                          setFormData({ ...formData, attachments: newAtt });
                        }} className="text-amber-500 hover:text-amber-700 ml-1" title={att.locked ? "Unlock" : "Lock"}>
                          {att.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                        <button type="button" onClick={() => setFormData({ ...formData, attachments: formData.attachments.filter((_, i) => i !== idx) })} className="text-red-500 hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <FileUploader onUploadComplete={(file) => setFormData({ ...formData, attachments: [...formData.attachments, file] })} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="pinned" className="cursor-pointer">Pin to top</Label>
              </div>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.title || !formData.content}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Post Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-4">
        {sortedAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No announcements yet
            </CardContent>
          </Card>
        ) : (
          sortedAnnouncements.map((announcement) => {
            const Icon = typeIcons[announcement.announcement_type];
            return (
              <Card key={announcement.id} className={announcement.pinned ? 'border-emerald-500 border-2' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {announcement.pinned && <Pin className="w-4 h-4 text-emerald-600" />}
                        <Icon className="w-5 h-5" />
                        {announcement.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={priorityColors[announcement.priority]}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant="outline">
                          {announcement.announcement_type}
                        </Badge>
                        {announcement.publish_at && new Date(announcement.publish_at) > new Date() && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            Scheduled: {format(new Date(announcement.publish_at), 'MMM d, h:mm a')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {announcement.due_date && (
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {format(new Date(announcement.due_date), 'MMM d, h:mm a')}
                        </div>
                      )}
                      {isTeacher && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate(announcement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                  <AttachmentRenderer attachments={announcement.attachments} />
                  <p className="text-xs text-gray-500 mt-4">
                    Posted {format(new Date(announcement.created_date), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
