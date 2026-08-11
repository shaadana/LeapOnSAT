import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Highlighter, MessageSquare, StickyNote, X, Loader2, Wand2, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuestionDissector({ question, onClose }) {
  const [highlights, setHighlights] = useState([]);
  const [activeColor, setActiveColor] = useState('bg-yellow-200');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [chat, setChat] = useState([
    { role: 'assistant', content: "Welcome to the Question Dissector. Highlight text to analyze it, add sticky notes, or ask me to find the evidence for the correct answer!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const contentRef = useRef(null);

  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text) return;

    if (isAddingNote) {
      const note = prompt("Enter your sticky note for this text:");
      if (note) {
        setHighlights(prev => [...prev, { text, color: 'bg-blue-200', note }]);
      }
      setIsAddingNote(false);
    } else if (activeColor) {
      setHighlights(prev => [...prev, { text, color: activeColor }]);
    }
    selection.removeAllRanges();
  };

  const askAIToHighlight = async () => {
    setIsAiLoading(true);
    try {
      const prompt = `
Given this SAT English question and passage:
Passage: """${question.question_text}"""
Correct Answer: ${question.correct_answer}

Find the EXACT exact substring (verbatim, word for word, no ellipses) from the passage that provides the evidence for the correct answer. Also explain why.
Respond in JSON format:
{
  "exact_substring": "...",
  "explanation": "..."
}
      `;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            exact_substring: { type: "string" },
            explanation: { type: "string" }
          }
        }
      });
      
      if (res && res.exact_substring) {
        setHighlights(prev => [...prev, { text: res.exact_substring, color: 'bg-emerald-300', note: 'AI Evidence' }]);
        setChat(prev => [...prev, { role: 'assistant', content: `I've highlighted the evidence in green.\n\n${res.explanation}` }]);
      }
    } catch (e) {
      console.error(e);
      setChat(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't find the exact evidence automatically." }]);
    }
    setIsAiLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const newChat = [...chat, { role: 'user', content: chatInput }];
    setChat(newChat);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const prompt = `
You are an SAT English AI Tutor. The student is dissecting a question.
Question/Passage: ${question.question_text}
Correct Answer: ${question.correct_answer}
Student highlights so far: ${JSON.stringify(highlights.map(h => h.text))}

Student asks: ${chatInput}
`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setChat(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (e) {
      setChat(prev => [...prev, { role: 'assistant', content: "Error getting response." }]);
    }
    setIsAiLoading(false);
  };

  const renderText = () => {
    let result = [question.question_text];
    highlights.forEach((h, idx) => {
      const nextResult = [];
      result.forEach((chunk, cIdx) => {
        if (typeof chunk === 'string') {
          const parts = chunk.split(h.text);
          for (let i = 0; i < parts.length; i++) {
            nextResult.push(parts[i]);
            if (i < parts.length - 1) {
              nextResult.push(
                <mark key={`${idx}-${cIdx}-${i}`} className={`${h.color} px-1 rounded cursor-pointer relative group transition-colors hover:brightness-95`}>
                  {h.text}
                  {h.note && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-stone-800 text-white text-xs rounded-lg shadow-xl z-50">
                      <div className="font-bold mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3"/> Note</div>
                      {h.note}
                    </div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setHighlights(prev => prev.filter((_, i2) => i2 !== idx)); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hidden group-hover:block shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </mark>
              );
            }
          }
        } else {
          nextResult.push(chunk);
        }
      });
      result = nextResult;
    });
    return result;
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm p-4 md:p-8 flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl flex-1 flex flex-col overflow-hidden max-w-[90rem] mx-auto w-full border border-stone-200"
      >
        {/* Header toolbar */}
        <div className="h-16 border-b border-stone-200 px-6 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Highlighter className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800">Question Dissector</h2>
              <p className="text-xs text-stone-500">Analyze, highlight, and understand</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-stone-200 shadow-sm">
            <div className="w-px h-6 bg-stone-200 mx-2 hidden sm:block" />
            <Button 
              size="sm" 
              variant={activeColor === 'bg-yellow-200' && !isAddingNote ? 'default' : 'ghost'} 
              className={activeColor === 'bg-yellow-200' && !isAddingNote ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
              onClick={() => { setActiveColor('bg-yellow-200'); setIsAddingNote(false); }}
            >
              <div className="w-4 h-4 rounded-full bg-yellow-300 mr-2 border border-yellow-400" /> <span className="hidden sm:inline">Yellow</span>
            </Button>
            <Button 
              size="sm" 
              variant={activeColor === 'bg-pink-200' && !isAddingNote ? 'default' : 'ghost'} 
              className={activeColor === 'bg-pink-200' && !isAddingNote ? 'bg-pink-100 text-pink-800 hover:bg-pink-200' : ''}
              onClick={() => { setActiveColor('bg-pink-200'); setIsAddingNote(false); }}
            >
              <div className="w-4 h-4 rounded-full bg-pink-300 mr-2 border border-pink-400" /> <span className="hidden sm:inline">Pink</span>
            </Button>
            <Button 
              size="sm" 
              variant={isAddingNote ? 'default' : 'ghost'} 
              className={isAddingNote ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : ''}
              onClick={() => { setIsAddingNote(true); setActiveColor(''); }}
            >
              <StickyNote className="w-4 h-4 mr-2 text-blue-500" /> <span className="hidden sm:inline">Add Note</span>
            </Button>
            
            <div className="w-px h-6 bg-stone-200 mx-2 hidden sm:block" />
            
            <Button 
              size="sm" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={askAIToHighlight}
              disabled={isAiLoading}
            >
              <Wand2 className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Find Evidence (AI)</span>
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white shadow-sm border border-stone-200 hover:bg-stone-100">
            <X className="w-5 h-5 text-stone-500" />
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Left: Passage & Question */}
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white" onMouseUp={handleSelection}>
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm text-stone-600 flex items-center gap-2">
                <Highlighter className="w-4 h-4" /> 
                {isAddingNote ? 'Select text in the passage below to add a sticky note.' : 'Select text in the passage below to highlight it.'}
              </div>

              <div 
                ref={contentRef}
                className="text-lg leading-loose text-stone-800 whitespace-pre-line font-medium"
              >
                {renderText()}
              </div>

              <div className="border-t border-stone-200 pt-8 space-y-4">
                <h3 className="font-bold text-stone-800 text-lg">Answer Choices</h3>
                {question.options?.map(opt => (
                  <div key={opt.label} className={`p-5 rounded-2xl border-2 ${opt.label === question.correct_answer ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                    <span className="font-bold mr-2 text-lg">{opt.label})</span>
                    <span className="text-stone-700 leading-relaxed">{opt.text}</span>
                    {opt.label === question.correct_answer && <span className="ml-3 text-emerald-600 font-bold bg-emerald-100 px-2 py-1 rounded text-sm">(Correct Answer)</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: AI Chat & Notes Panel */}
          <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-stone-200 bg-stone-50 flex flex-col shrink-0">
            <div className="p-5 border-b border-stone-200 bg-white">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" /> Dissector AI
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-stone-800 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-stone-700 shadow-sm rounded-tl-sm'}`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-3 text-sm text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    Analyzing...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-stone-200">
              <div className="flex gap-2">
                <Input 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask a question..."
                  className="bg-stone-50 border-stone-200 focus-visible:ring-emerald-500"
                />
                <Button size="icon" onClick={sendChatMessage} className="bg-emerald-500 hover:bg-emerald-600 shrink-0 shadow-sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
