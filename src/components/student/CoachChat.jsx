import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function CoachChat({ user }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadOrCreateConversation();
  }, [user?.id]);

  useEffect(() => {
    if (conversation?.id) {
      const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages || []);
        scrollToBottom();
      });
      return unsubscribe;
    }
  }, [conversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOrCreateConversation = async () => {
    if (!user?.id) return;
    
    const conversations = await base44.agents.listConversations({
      agent_name: 'student_coach'
    });
    
    if (conversations?.length > 0) {
      const sorted = [...conversations].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      const fullConvo = await base44.agents.getConversation(sorted[0].id);
      setConversation(fullConvo);
      setMessages(fullConvo.messages || []);
    } else {
      const newConvo = await base44.agents.createConversation({
        agent_name: 'student_coach',
        metadata: { name: 'My Coach', active: true, user_id: user?.id, user_name: (user?.name || user?.full_name), user_email: user?.email }
      });
      setConversation(newConvo);
      setMessages(newConvo.messages || []);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || isSending) return;
    
    setIsSending(true);
    const userMessage = input.trim();
    setInput('');
    
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="bg-white border-4 border-white shadow-2xl rounded-[2rem] h-[600px] flex flex-col">
      <CardHeader className="bg-emerald-50/50 border-b-2 border-emerald-100">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-emerald-900">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              Your Personal Coach
            </CardTitle>
            <p className="text-sm text-stone-600 mt-1">Here to help you build habits and reach your goals</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const newConvo = await base44.agents.createConversation({
                agent_name: 'student_coach',
                metadata: { name: 'My Coach', active: true, user_id: user?.id, user_name: (user?.name || user?.full_name), user_email: user?.email }
              });
              setConversation(newConvo);
              setMessages([]);
            }}
            className="text-stone-400 hover:text-red-500 gap-1 mt-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-stone-100 text-stone-900 border-2 border-stone-200'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <ReactMarkdown 
                    className="text-sm prose prose-sm prose-stone max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-emerald-800">{children}</strong>,
                      code: ({ children }) => <code className="px-1 py-0.5 rounded bg-stone-200 text-xs">{children}</code>
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
                
                {msg.tool_calls?.map((toolCall, i) => (
                  <div key={i} className="mt-2 text-xs text-stone-600 bg-white/50 rounded px-2 py-1">
                    🔧 {toolCall.name?.split('.').pop()}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </CardContent>
      
      <div className="p-4 border-t-2 border-emerald-100 bg-emerald-50/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your coach anything..."
            disabled={isSending}
            className="flex-1 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
