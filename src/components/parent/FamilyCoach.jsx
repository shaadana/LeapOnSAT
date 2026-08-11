import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function FamilyCoach({ user }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childUsers, setChildUsers] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch all families for this parent
  const { data: familiesData = [] } = useQuery({
    queryKey: ['families', user?.id],
    queryFn: () => base44.entities.Family.filter({ parent_id: user?.id }),
    enabled: !!user?.id,
  });

  // Get all unique child IDs
  const allChildIds = [...new Set(familiesData.flatMap(f => f.child_ids || []))];

  // Fetch User records for all children to get their names
  useEffect(() => {
    const fetchChildUsers = async () => {
      if (allChildIds.length === 0) return;
      const users = await Promise.all(allChildIds.map(id => base44.entities.User.filter({ id })));
      setChildUsers(users.flat());
    };
    if (allChildIds.length > 0) fetchChildUsers();
  }, [familiesData.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    loadOrCreateConversation();
  }, [user?.id]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  const loadOrCreateConversation = async () => {
    const conversations = await base44.agents.listConversations({ agent_name: 'parent_coach' });
    if (conversations.length > 0) {
      const sorted = [...conversations].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      const fullConvo = await base44.agents.getConversation(sorted[0].id);
      setConversation(fullConvo);
      setMessages(fullConvo.messages || []);
    } else {
      const newConv = await base44.agents.createConversation({
        agent_name: 'parent_coach',
        metadata: { name: 'Family Coaching Session', user_id: user?.id, user_name: (user?.name || user?.full_name), user_email: user?.email }
      });
      setConversation(newConv);
      setMessages(newConv.messages || []);
    }
  };

  const handleClearHistory = async () => {
    if (!conversation) return;
    const newConv = await base44.agents.createConversation({
      agent_name: 'parent_coach',
      metadata: { name: 'Family Coaching Session', user_id: user?.id, user_name: (user?.name || user?.full_name), user_email: user?.email }
    });
    setConversation(newConv);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !conversation) return;

    const selectedChild = childUsers.find(u => u.id === selectedChildId);
    const messageContent = selectedChild
      ? `[Coaching about my child: ${selectedChild.full_name || selectedChild.email}]\n\n${input}`
      : input;

    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageContent
      });
      setInput('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-stone-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          Family Coach
        </h2>
        <p className="text-stone-600">Get personalized guidance for supporting your children's learning</p>
      </div>

      {allChildIds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Coaching Focus (Optional)
          </label>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-full bg-white border-2 border-emerald-200">
              <SelectValue placeholder="Select a child for personalized advice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>General family coaching</SelectItem>
              {childUsers.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {(child.name || child.full_name) || child.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="border-4 border-white shadow-2xl rounded-3xl bg-white">
        <CardHeader className="border-b bg-emerald-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display font-bold text-stone-900">
            {selectedChildId && childUsers.find(u => u.id === selectedChildId)
              ? `Coaching: ${childUsers.find(u => u.id === selectedChildId)?.full_name || 'Child'}`
              : 'Chat with Your Coach'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-stone-400 hover:text-red-500 gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.filter(m => m.role === 'user' || m.role === 'assistant').map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-900'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content?.replace(/^\[Coaching about my child:.*?\]\n\n/, '')}</p>
                  ) : (
                    <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 bg-stone-50">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about supporting your child's learning..."
                className="flex-1 resize-none"
                rows={2}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-full"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
