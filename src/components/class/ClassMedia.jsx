import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import MediaOrganizer from '../media/MediaOrganizer';

export default function ClassMedia({ classId }) {
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['classMessages', classId],
    queryFn: () => base44.entities.ClassMessage.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['announcements', classId],
    queryFn: () => base44.entities.ClassAnnouncement.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: () => base44.entities.Assignment.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
  });

  if (isLoadingMessages || isLoadingAnnouncements || isLoadingAssignments) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    );
  }

  // Extract all media
  const allMedia = [];

  messages.forEach(msg => {
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att, attIdx) => {
        allMedia.push({
          ...att,
          source: 'Chat',
          sender: msg.sender_name,
          date: msg.created_date,
          entityId: msg.id,
          entityType: 'ClassMessage',
          attIdx: attIdx,
          parentRecord: msg
        });
      });
    }
  });

  announcements.forEach(ann => {
    if (ann.attachments && ann.attachments.length > 0) {
      ann.attachments.forEach((att, attIdx) => {
        allMedia.push({
          ...att,
          source: 'Announcement',
          sender: 'Teacher',
          date: ann.created_date,
          entityId: ann.id,
          entityType: 'ClassAnnouncement',
          attIdx: attIdx,
          parentRecord: ann
        });
      });
    }
  });

  assignments.forEach(assign => {
    if (assign.attachments && assign.attachments.length > 0) {
      assign.attachments.forEach((att, attIdx) => {
        allMedia.push({
          ...att,
          source: 'Assignment',
          sender: 'Teacher',
          date: assign.created_date,
          entityId: assign.id,
          entityType: 'Assignment',
          attIdx: attIdx,
          parentRecord: assign
        });
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Media & Files</CardTitle>
      </CardHeader>
      <CardContent>
        <MediaOrganizer 
          mediaItems={allMedia} 
          queryKeysToInvalidate={[['classMessages', classId], ['announcements', classId], ['assignments', classId]]}
        />
      </CardContent>
    </Card>
  );
}
