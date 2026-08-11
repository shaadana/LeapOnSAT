import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

export default function FamilyChat({ familyId, user, isParent }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['familyMessages', familyId],
    queryFn: () => base44.entities.FamilyMessage.filter({ family_id: familyId }, 'created_date'),
    enabled: !!familyId,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMessages', familyId]);
      setMessage('');
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({
      family_id: familyId,
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      message: message.trim(),
      is_parent: isParent,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family Chat</CardTitle>
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
                        : msg.is_parent
                        ? 'bg-purple-100 text-gray-900'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {msg.sender_name}
                        {msg.is_parent && ' (Parent)'}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
            />
            <Button onClick={handleSend} disabled={!message.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
