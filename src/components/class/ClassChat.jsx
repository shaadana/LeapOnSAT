import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X } from 'lucide-react';
import { format } from 'date-fns';
import FileUploader from '../media/FileUploader';
import AttachmentRenderer from '../media/AttachmentRenderer';

export default function ClassChat({ classId, user, isTeacher }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['classMessages', classId],
    queryFn: () => base44.entities.ClassMessage.filter({ class_id: classId }, 'created_date'),
    enabled: !!classId,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classMessages', classId]);
      setMessage('');
      setAttachments([]);
    },
  });

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    sendMutation.mutate({
      class_id: classId,
      sender_id: user.id,
      sender_name: user.name || user.full_name || user.email,
      message: message.trim(),
      is_teacher: isTeacher,
      attachments: attachments,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-96 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      msg.sender_id === user.id
                        ? 'bg-emerald-600 text-white'
                        : msg.is_teacher
                        ? 'bg-blue-100 text-gray-900'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {msg.sender_name}
                        {msg.is_teacher && ' (Teacher)'}
                      </span>
                    </div>
                    {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                    <AttachmentRenderer attachments={msg.attachments} />
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-lg bg-gray-50">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white px-2 py-1 rounded-md text-sm border shadow-sm">
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button onClick={() => setAttachments(a => a.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <FileUploader onUploadComplete={(file) => setAttachments([...attachments, file])} />
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim() && attachments.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
