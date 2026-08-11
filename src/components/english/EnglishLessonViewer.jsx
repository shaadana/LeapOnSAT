import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, CheckCircle, XCircle, Loader2, RotateCcw, ArrowLeft, Lightbulb, Pencil, Star, Brain, Send, Sparkles } from 'lucide-react';
import { awardForSession } from '@/utils/gamification';
import SessionRewardModal from '@/components/gamification/SessionRewardModal';

const DOMAIN_LABELS = {
  'Information and Ideas': 'Information and Ideas',
  'Craft and Structure': 'Craft and Structure',
  'Expression of Ideas': 'Expression of Ideas',
  'Standard English Conventions': 'Standard English Conventions',
};

const DOMAIN_SUBTOPICS = {
  'Information and Ideas': [
    'Active reading strategy for SAT passages', 'Central idea vs. supporting details',
    'Drawing inferences without over-reading', 'Locating textual evidence for a claim',
    'Using quantitative data (graphs/tables) to support a claim',
    "Identifying the author's purpose", "Identifying the author's perspective and bias",
    'Argument structure: claim, evidence, reasoning', 'Claim vs. counterclaim',
    'Logical flaws and assumptions in arguments', 'Strengthen/weaken argument questions',
    'Function of a paragraph within a passage', 'Paired passage synthesis questions',
    'Evidence pair two-part questions', 'Avoiding wrong-answer traps (too broad, too narrow, extreme)',
    'Reading science passages: experiments and hypotheses',
    'Reading humanities passages: rhetorical purpose',
    'Reading social science passages: study scope and claims',
  ],
  'Craft and Structure': [
    'Words in context: choosing the best word based on surrounding text',
    'Connotation and nuance: distinguishing close synonyms',
    'Register and formality: matching tone to context',
    'Metaphor and simile in SAT passages',
    'Irony, sarcasm, and satire: literal vs. intended meaning',
    'Personification, hyperbole, and understatement',
    'Identifying the author\'s tone in a single passage',
    'Tone shifts within a passage',
    'Comparing tone across two paired passages',
    'Passage structure patterns: compare/contrast, cause/effect, problem/solution',
    'Function of a specific paragraph or sentence',
    'Rhetorical devices: ethos, pathos, logos, anaphora',
    'Effect of specific word choices vs. alternatives',
    'Point of view and its effect on the reader',
    'Cross-text synthesis: comparing two authors\' approaches',
    'Extended metaphors and analogies across a passage',
    'Diction analysis: word choice revealing bias or emphasis',
    'Organizational choices: why the author opens or closes this way',
  ],
  'Expression of Ideas': [
    'Rhetorical synthesis: writing one sentence that achieves a specific goal',
    'Synthesis for emphasis: highlighting a key detail',
    'Synthesis for contrast: highlighting a difference',
    'Synthesis to support a stated claim',
    'Choosing the right transition word (however, therefore, furthermore)',
    'Cause-and-effect transitions: consequently, as a result',
    'Contrast and concession transitions: although, nevertheless, even so',
    'Sequential and additive transitions: first, additionally, moreover',
    'Combining sentences for clarity and concision',
    'Add/delete a sentence: evaluating relevance',
    'Sentence placement for logical flow',
    'Effective introduction and conclusion sentences',
    'Eliminating redundancy and wordiness',
    'Clarifying ambiguous pronoun references in revision',
    'Emphasis through sentence structure: end-focus principle',
    'Topic sentences and paragraph unity',
    'Tonal consistency across a revised passage',
    'Reorganizing paragraphs for logical essay structure',
    'Fixing wordy and awkward constructions',
  ],
  'Standard English Conventions': [
    'Run-on sentences: how to fix them',
    'Comma splices: identifying and correcting',
    'Sentence fragments: completing incomplete sentences',
    'Semicolons: joining two independent clauses',
    'Colons: introducing a list, explanation, or quotation',
    'Commas in a series (Oxford comma)',
    'Commas after introductory elements',
    'Commas with non-essential (parenthetical) clauses',
    'Commas with coordinating conjunctions (FANBOYS)',
    'Em dashes and parentheses for non-essential inserts',
    'Apostrophes for possessives (singular and plural)',
    'Apostrophes for contractions vs. possessive pronouns (its vs. it\'s)',
    'Subject-verb agreement: basic rules',
    'Subject-verb agreement: tricky cases (each, everyone, inverted sentences)',
    'Subject-verb agreement with collective nouns',
    'Pronoun-antecedent agreement in number',
    'Pronoun case: subject (I, he) vs. object (me, him); who vs. whom',
    'Clear pronoun reference: avoiding ambiguous "it" and "they"',
    'Verb tense consistency within a passage',
    'Perfect tenses: present perfect, past perfect, future perfect',
    'Subjunctive mood: "if I were" and "it is important that he be"',
    'Dangling modifiers: modifier must be next to what it describes',
    'Misplaced modifiers: "only" and "almost" placement',
    'Parallel structure in lists',
    'Parallel structure with correlative conjunctions (not only...but also)',
    'Conciseness: eliminating redundant words and phrases',
    'Commonly confused words: effect/affect, lie/lay, fewer/less, comprise/compose',
  ],
};

export default function EnglishLessonViewer({ domain, subtopic: initialSubtopic, onBack, onLessonComplete }) {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('picker');
  const [selectedSubtopic, setSelectedSubtopic] = useState(initialSubtopic || '');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionReward, setSessionReward] = useState(null);

  // Chat state
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Tracking
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        if (profiles[0]) setProfile(profiles[0]);
      }
    }).catch(() => {});
  }, []);

  // Auto-start the lesson if an initial subtopic was provided via URL
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!user) return; // need user loaded before starting agent conversation
    if (initialSubtopic && initialSubtopic.trim()) {
      autoStartedRef.current = true;
      startInteractiveLesson(initialSubtopic);
    }
  }, [initialSubtopic, user]);

  const logLessonSession = async (finalScore, totalProblems) => {
    if (!user) return;
    const accuracy = totalProblems > 0 ? Math.round((finalScore / totalProblems) * 100) : 100;
    
    const endTime = new Date();
    const durationMinutes = sessionStartTime ? Math.round((endTime.getTime() - sessionStartTime) / 60000) : 0;

    await base44.entities.EnglishPracticeSession.create({
      user_id: user.id,
      session_type: 'lesson',
      status: 'completed',
      from_study_plan: searchParams.get('studyPlan') === 'true',
      start_time: sessionStartTime ? new Date(sessionStartTime).toISOString() : new Date().toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: Math.max(1, durationMinutes),
      questions_attempted: totalProblems,
      questions_correct: finalScore,
      domains_covered: [domain],
      performance_summary: { accuracy_percentage: accuracy },
    });

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles[0]) {
      const engPerf = profiles[0].english_performance || {};
      const domainScores = engPerf.domain_scores || {};
      const domainKey = domain.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const prev = domainScores[domainKey];
      const newScore = prev != null ? Math.round((prev + accuracy) / 2) : accuracy;
      await base44.entities.UserProfile.update(profiles[0].id, {
        english_performance: {
          ...engPerf,
          domain_scores: { ...domainScores, [domainKey]: newScore },
          total_questions_attempted: (engPerf.total_questions_attempted || 0) + totalProblems,
          total_correct: (engPerf.total_correct || 0) + finalScore,
          last_session_date: new Date().toISOString(),
        },
      });
      
      try {
        const ef = profiles[0]?.executive_functioning || null;
        const reward = await awardForSession(user.id, {
          questions_correct: finalScore,
          questions_attempted: totalProblems,
          current_difficulty: 'medium',
        }, ef);
        if (reward) setSessionReward(reward);
      } catch (e) { /* silent fail */ }
    }
  };

  const startInteractiveLesson = async (topic) => {
    setSelectedSubtopic(topic);
    setSessionStartTime(Date.now());
    setPhase('loading');
    
    try {
      const convo = await base44.agents.createConversation({
        agent_name: 'lesson_tutor',
        metadata: { topic, domain }
      });
      setConversationId(convo.id);
      
      const domainLabel = DOMAIN_LABELS[domain] || domain;
      await base44.agents.addMessage({ id: convo.id }, {
        role: 'user',
        content: `I'm ready to learn about "${topic}" in ${domainLabel}. Please give a brief 1-2 sentence welcome and ask me how I want to begin. (I can choose between getting tips/tricks, a concept breakdown, a worked example, a practice problem, predict next step, or find the mistake). Remember to format any multiple choice options as [OPTION_A], [OPTION_B], [OPTION_C], [OPTION_D], [OPTION_E], and [OPTION_F] at the very end.`
      });
      
      setPhase('interactive');
    } catch (e) {
      console.error(e);
      setPhase('picker');
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages);
      
      // Update score tracking
      let correct = 0;
      let attempts = 0;
      data.messages.forEach(m => {
        if (m.role === 'assistant' && m.content) {
          if (m.content.includes('[RESULT: CORRECT]')) correct++;
          if (m.content.includes('[RESULT: CORRECT]') || m.content.includes('[RESULT: INCORRECT]')) attempts++;
        }
      });
      setCorrectCount(correct);
      setAttemptCount(attempts);
      
      // Auto-scroll
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, [conversationId]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    const val = text.trim();
    setInputValue('');
    setIsTyping(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, {
        role: 'user',
        content: val
      });
    } catch (e) {
      console.error(e);
    }
    setIsTyping(false);
  };

  const finishLesson = () => {
    logLessonSession(correctCount, Math.max(attemptCount, 1));
    setPhase('complete');
  };

  const parseContent = (content) => {
    if (!content) return { displayContent: '', options: [] };
    const options = [];
    
    let cleanContent = content
      .replace(/\[RESULT:\s*CORRECT\]/gi, '')
      .replace(/\[RESULT:\s*INCORRECT\]/gi, '');
    
    const optionRegex = /\[OPTION_([A-F])\](.*)/gi;
    let match;
    while ((match = optionRegex.exec(cleanContent)) !== null) {
      options.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
    }
    
    cleanContent = cleanContent.replace(/\[OPTION_[A-F]\].*/gi, '').trim();
    return { displayContent: cleanContent, options };
  };

  const MessageBubble = ({ message, isLast }) => {
    const isUser = message.role === 'user';
    const { displayContent, options } = parseContent(message.content);
    
    // Hide the initial system-like prompt from the user
    if (isUser && displayContent.includes("Please give a brief 1-2 sentence welcome")) {
      return null;
    }

    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border border-emerald-200">
            <Brain className="w-5 h-5 text-emerald-600" />
          </div>
        )}
        <div className={`max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
          <div className={`rounded-2xl px-5 py-4 ${
            isUser ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-emerald-100 shadow-sm'
          }`}>
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
            ) : (
              <div className="text-sm prose prose-emerald max-w-none text-stone-700 space-y-3">
                {displayContent.split('\n').map((line, i) => {
                  const t = line.trim();
                  if (!t) return <div key={i} className="h-2" />;
                  return <div key={i} className="leading-relaxed">{t}</div>;
                })}
              </div>
            )}
          </div>
          
          {!isUser && options.length > 0 && isLast && (
            <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-md">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(`I choose option ${opt.letter}: ${opt.text}`)}
                  disabled={isTyping}
                  className="text-left p-3 rounded-xl border-2 border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    {opt.letter}
                  </span>
                  <span className="text-sm font-medium text-stone-700">{opt.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (phase === 'picker') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-stone-900">{DOMAIN_LABELS[domain] || domain} Lessons</h2>
            <p className="text-sm text-stone-500">Interactive AI Tutor</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {(DOMAIN_SUBTOPICS[domain] || []).map(topic => (
            <button
              key={topic}
              onClick={() => startInteractiveLesson(topic)}
              className="text-left p-4 rounded-2xl border-2 border-emerald-100 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-stone-800 group-hover:text-emerald-700">{topic}</span>
                <ChevronRight className="w-4 h-4 text-stone-300 ml-auto group-hover:text-emerald-500" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center shadow-inner border border-emerald-200">
          <Brain className="w-10 h-10 text-emerald-500 animate-pulse" />
        </div>
        <p className="text-xl font-bold text-stone-800 mb-2">Connecting to AI Tutor...</p>
        <p className="text-sm text-stone-500">Preparing your personalized interactive lesson</p>
      </div>
    );
  }

  if (phase === 'interactive') {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] bg-[#fcfcfc] rounded-3xl border-2 border-emerald-100 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-white border-b border-emerald-100 p-3 md:p-4 flex flex-col gap-3 z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => setPhase('picker')} className="text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 p-2 rounded-full hover:bg-stone-100 flex-shrink-0 mt-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-stone-800 leading-tight truncate" title={selectedSubtopic}>{selectedSubtopic}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0">
                  {DOMAIN_LABELS[domain] || domain}
                </Badge>
                <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
                  {correctCount} correct / {attemptCount} attempts
                </span>
              </div>
            </div>
            <Button onClick={finishLesson} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm h-9 md:h-10 px-4 md:px-5 shadow-sm flex-shrink-0 whitespace-nowrap">
              Finish <span className="hidden md:inline">Lesson</span> <CheckCircle className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          )}
          
          {messages.map((m, idx) => (
            <MessageBubble 
              key={m.id || idx} 
              message={m} 
              isLast={idx === messages.length - 1} 
            />
          ))}
          
          {isTyping && (
            <div className="flex gap-3 justify-start mb-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-200 shadow-sm">
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="bg-white border-2 border-emerald-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-emerald-100 shadow-[0_-4px_15px_rgba(0,0,0,0.02)] flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Give me some tips and tricks")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Tips &amp; Tricks</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Give me a concept breakdown")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Concept Breakdown</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Show me a worked example")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Worked Example</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Give me a practice problem")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Practice Problem</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Let's do a 'Predict Next Step' exercise: break down a problem step-by-step, pausing after each step for me to predict what comes next.")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Predict Next Step</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Let's do a 'Find the Mistake' exercise: give me a solution with an intentional mistake and ask me to find it.")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Find the Mistake</Button>
          </div>
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
            className="flex gap-2 max-w-4xl mx-auto relative w-full"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer, or ask for a hint..."
              className="flex-1 rounded-full border-2 border-stone-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 pl-5 pr-14 h-12 text-[15px] shadow-inner bg-stone-50"
              disabled={isTyping}
            />
            <Button 
              type="submit" 
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-1.5 top-1.5 bottom-1.5 rounded-full w-9 h-9 p-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all disabled:opacity-50 disabled:scale-95"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Powered by LeapOn AI Tutor
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const pct = attemptCount > 0 ? Math.round((correctCount / Math.max(attemptCount, 1)) * 100) : 100;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-8">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl border-4 border-emerald-100">
          <Star className="w-12 h-12 text-white fill-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-stone-900 mb-2">Lesson Complete!</h2>
          <p className="text-lg text-stone-500 font-medium">{selectedSubtopic}</p>
        </div>
        <div className="inline-block bg-white border-2 border-emerald-100 rounded-3xl px-10 py-6 shadow-sm">
          <p className="text-5xl font-bold text-emerald-600 mb-2">{pct}%</p>
          <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">{correctCount} correct of {attemptCount} attempts</p>
        </div>
        <div className="flex gap-4 justify-center flex-wrap mt-8">
          <Button variant="outline" onClick={() => startInteractiveLesson(selectedSubtopic)} className="rounded-full border-stone-300 gap-2 h-12 px-6">
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Button>
          <Button onClick={() => setPhase('picker')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-12 px-6 shadow-md">
            New Topic <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          {onLessonComplete && (
            <Button onClick={onLessonComplete} className="bg-stone-800 hover:bg-stone-900 text-white rounded-full h-12 px-8 shadow-md">
              Return to Practice <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
        {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
      </motion.div>
    );
  }

  return null;
}
