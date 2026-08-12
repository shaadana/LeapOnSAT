import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, User, MessageSquare, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import FileUploader from '../components/media/FileUploader';
import AttachmentRenderer from '../components/media/AttachmentRenderer';
import MediaOrganizer from '../components/media/MediaOrganizer';

export default function PrivateChat() {
  const [user, setUser] = useState(null);
  const [otherId, setOtherId] = useState(null);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();

    const urlParams = new URLSearchParams(window.location.search);
    setOtherId(urlParams.get('student_id') || urlParams.get('teacher_id'));
  }, []);

  const { data: otherUser } = useQuery({
    queryKey: ['otherUser', otherId],
    queryFn: async () => {
      const [userData] = await base44.entities.User.filter({ id: otherId });
      return userData;
    },
    enabled: !!otherId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['privateMessages', user?.id, otherId],
    queryFn: async () => {
      const msgs = await base44.entities.PrivateMessage.filter(
        { 
          $or: [
            { teacher_id: user.id, student_id: otherId },
            { teacher_id: otherId, student_id: user.id }
          ]
        },
        'created_date'
      );
      return msgs;
    },
    enabled: !!user && !!otherId,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.PrivateMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['privateMessages', user?.id, otherId]);
      setMessage('');
      setAttachments([]);
    },
  });

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    const isTeacher = user?.user_type === 'teacher';
    sendMutation.mutate({
      teacher_id: isTeacher ? user.id : otherId,
      student_id: isTeacher ? otherId : user.id,
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

  if (!user) return null;

  const otherName = otherUser?.name || otherUser?.full_name || (user?.user_type === 'teacher' ? 'Student' : 'Teacher');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{otherName}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Private conversation
              </p>
            </div>
          </div>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Media
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Chat Media & Files</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <MediaOrganizer 
                mediaItems={messages.flatMap(msg => 
                  (msg.attachments || []).map((att, attIdx) => ({
                    ...att,
                    source: 'Private Chat',
                    sender: msg.sender_name,
                    date: msg.created_date,
                    entityId: msg.id,
                    entityType: 'PrivateMessage',
                    attIdx: attIdx,
                    parentRecord: msg
                  }))
                )}
                queryKeysToInvalidate={[['privateMessages', user?.id, otherId]]}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="h-96 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50 mb-4">
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
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {msg.sender_name}
                      </span>
                    </div>
                    {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                    <AttachmentRenderer attachments={msg.attachments} />
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_date), 'MMM d, h:mm a')}
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
        </CardContent>
      </Card>
    </div>
  );
}
