import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Sparkles, CheckCircle, Flame, Pause, Play, Trash2,
  Loader2, ArrowRight, Target, BookOpen, PenTool,
  Trophy, Bell, ChevronRight, Plus, Zap
} from 'lucide-react';

// LEAP Framework definitions
const LEAP_STEPS = [
  {
    key: 'L',
    label: 'Link',
    color: 'emerald',
    desc: 'Connect to a desire & existing routine',
    question: "Let's start with **Link**. What's a goal or aspiration that matters to you right now — and what's something you already do every day that we can attach a new habit to?"
  },
  {
    key: 'E',
    label: 'Ease',
    color: 'stone',
    desc: 'Make the behavior frictionless',
    question: "Now let's **Ease** it. What's the tiniest possible action — something you could do in 30 seconds or less — that moves you toward that goal? The smaller, the better."
  },
  {
    key: 'A',
    label: 'Acknowledge',
    color: 'amber',
    desc: 'Affirm the win immediately',
    question: "Time to **Acknowledge**. What's an instant celebration you can do right after the behavior — something that makes you feel genuinely good? A fist pump, a smile, saying 'I did it!'"
  },
  {
    key: 'P',
    label: 'Progress',
    color: 'emerald',
    desc: 'Define how this grows',
    question: "Finally, **Progress**. Where does this tiny habit lead? What bigger behavior or milestone does it grow into over 30–90 days? And would you like a daily reminder, a streak tracker, or a direct shortcut to practice on the site?"
  }
];

const SITE_ACTIONS = {
  sat_math: { label: 'Open SAT Math Practice', path: 'SATPractice', icon: Target },
  sat_reading: { label: 'Open SAT English Practice', path: 'SATEnglishPractice', icon: PenTool },
  general_study: { label: 'Open Independent Study', path: 'IndependentStudy', icon: BookOpen },
  homework: { label: 'Open Dashboard', path: 'Dashboard', icon: Target },
  other: { label: 'Open Dashboard', path: 'Dashboard', icon: Sparkles },
};

const LEAP_LABELS = { L: 'Link', E: 'Ease', A: 'Acknowledge', P: 'Progress' };
const LEAP_COLORS = {
  L: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  E: 'bg-stone-100 text-stone-800 border-stone-300',
  A: 'bg-stone-100 text-stone-800 border-stone-300',
  P: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export default function StudyHabits() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('pathways'); // 'pathways' | 'chat'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [leapStep, setLeapStep] = useState(0); // 0-3 = L,E,A,P; 4 = finalizing
  const [leapData, setLeapData] = useState({ L: '', E: '', A: '', P: '', title: '', subject: 'sat_math', full_behavior_goal: '', notes: '' });
  const [pathwayReady, setPathwayReady] = useState(null);
  const chatEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { data: habits, isLoading } = useQuery({
    queryKey: ['studyHabits', user?.id],
    queryFn: () => base44.entities.StudyHabit.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StudyHabit.create(data),
    onSuccess: () => queryClient.invalidateQueries(['studyHabits']),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudyHabit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['studyHabits']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StudyHabit.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['studyHabits']),
  });

  const startChat = () => {
    const userProfile = profile?.[0];
    const efContext = userProfile?.executive_functioning
      ? `Student EF profile: task initiation ${userProfile.executive_functioning.task_initiation > 10 ? 'strong' : 'needs support'}, sustained attention ${userProfile.executive_functioning.sustained_attention > 10 ? 'strong' : 'needs support'}.`
      : '';
    setLeapData({ L: '', E: '', A: '', P: '', title: '', subject: 'sat_math', full_behavior_goal: '', notes: '' });
    setLeapStep(0);
    setPathwayReady(null);
    setMessages([
      {
        role: 'assistant',
        content: `Hey ${user?.full_name?.split(' ')[0] || 'there'}! I'm your LEAP Pathway coach. Together we'll design a behavior pathway that's actually built to stick.\n\nThe LEAP framework means:\nLink - connect to what you already care about\nEase - make the action ridiculously simple\nAcknowledge - celebrate every win immediately\nProgress - define where it leads\n\n${LEAP_STEPS[0].question}`,
        step: null
      }
    ]);
    setView('chat');
  };

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsThinking(true);

    const stepKey = ['L', 'E', 'A', 'P'][leapStep];
    const newLeapData = { ...leapData, [stepKey]: userMsg };
    setLeapData(newLeapData);

    const nextStep = leapStep + 1;

    if (nextStep < 4) {
      // Acknowledge current input and ask next question
      try {
        const prompt = `You are a supportive LEAP habit coach. The student just answered the "${LEAP_STEPS[leapStep].label}" step.

Their answer: "${userMsg}"

LEAP step context:
- L (Link): ${newLeapData.L || 'not yet'}
- E (Ease): ${newLeapData.E || 'not yet'}
- A (Acknowledge): ${newLeapData.A || 'not yet'}
- P (Progress): ${newLeapData.P || 'not yet'}

Write a warm, brief (2-3 sentences) acknowledgment of their answer — affirm what's good about it, gently suggest a refinement if needed. Then naturally lead into asking: "${LEAP_STEPS[nextStep].question}"

Keep it conversational, encouraging, and concise. Do NOT use any emojis.`;

        const result = await base44.integrations.Core.InvokeLLM({ prompt });
        setMessages(prev => [...prev, { role: 'assistant', content: result, step: LEAP_STEPS[leapStep].key }]);
        setLeapStep(nextStep);
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: LEAP_STEPS[nextStep].question, step: stepKey }]);
        setLeapStep(nextStep);
      }
    } else {
      // All 4 steps collected — finalize pathway
      try {
        const prompt = `You are a LEAP habit coach finalizing a student's behavior pathway. Here is what they shared:

L (Link — desire & routine): "${newLeapData.L}"
E (Ease — tiny behavior): "${newLeapData.E}"  
A (Acknowledge — celebration): "${newLeapData.A}"
P (Progress — bigger goal & preferences): "${newLeapData.P}"

Create a complete, polished LEAP pathway for this student. Return ONLY valid JSON with this structure:
{
  "title": "short catchy name for this pathway (5 words max)",
  "anchor_moment": "refined version of when/what triggers this (start with 'After I...')",
  "tiny_behavior": "refined tiny behavior (start with 'I will...')",
  "celebration": "refined celebration (start with 'Then I...')",
  "full_behavior_goal": "the bigger 30-90 day vision",
  "subject": "sat_math OR sat_reading OR general_study OR homework OR other",
  "summary_message": "a warm 2-3 sentence message confirming the pathway and why it will work for them - no emojis",
  "site_action_hint": "one of: sat_math, sat_reading, general_study, homework, other — based on their goal"
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              anchor_moment: { type: 'string' },
              tiny_behavior: { type: 'string' },
              celebration: { type: 'string' },
              full_behavior_goal: { type: 'string' },
              subject: { type: 'string' },
              summary_message: { type: 'string' },
              site_action_hint: { type: 'string' }
            }
          }
        });

        const pathway = {
          title: result.title || 'My LEAP Pathway',
          anchor_moment: result.anchor_moment || newLeapData.L,
          tiny_behavior: result.tiny_behavior || newLeapData.E,
          celebration: result.celebration || newLeapData.A,
          full_behavior_goal: result.full_behavior_goal || newLeapData.P,
          subject: result.subject || 'general_study',
          notes: JSON.stringify({ leap: newLeapData, site_action: result.site_action_hint || 'general_study' })
        };

        setPathwayReady(pathway);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.summary_message || "Your LEAP pathway is ready! Here's what we built together:",
          step: 'P',
          isFinale: true
        }]);
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Your pathway is ready! Let me put it together for you." }]);
      }
    }

    setIsThinking(false);
  };

  const savePathway = () => {
    if (!pathwayReady || !user) return;
    createMutation.mutate({
      ...pathwayReady,
      user_id: user.id,
      status: 'active',
      streak_count: 0,
      total_completions: 0
    }, {
      onSuccess: () => {
        setView('pathways');
        setPathwayReady(null);
        setMessages([]);
        setLeapStep(0);
      }
    });
  };

  const activeHabits = (habits || []).filter(h => h.status === 'active');
  const pausedHabits = (habits || []).filter(h => h.status === 'paused');

  const getSiteAction = (habit) => {
    let actionKey = habit.subject || 'general_study';
    try {
      const parsed = JSON.parse(habit.notes || '{}');
      if (parsed.site_action) actionKey = parsed.site_action;
    } catch (e) {}
    return SITE_ACTIONS[actionKey] || SITE_ACTIONS['general_study'];
  };

  const getLeapFromHabit = (habit) => {
    return {
      L: habit.anchor_moment,
      E: habit.tiny_behavior,
      A: habit.celebration,
      P: habit.full_behavior_goal,
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-4 border-white rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">LEAP Pathways</h1>
              <p className="text-white/80 text-sm">Link · Ease · Acknowledge · Progress</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setView('pathways')}
              variant={view === 'pathways' ? 'secondary' : 'ghost'}
              className={view === 'pathways' ? 'bg-white text-emerald-700 font-semibold' : 'text-white border-white/40 border'}
            >
              My Pathways
            </Button>
            <Button
              onClick={startChat}
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Pathway
            </Button>
          </div>
        </div>

        {/* LEAP pills */}
        <div className="relative z-10 flex gap-2 mt-4 flex-wrap">
          {['L — Link', 'E — Ease', 'A — Acknowledge', 'P — Progress'].map((label, i) => (
            <span key={i} className="px-3 py-1 bg-white/15 text-white/90 rounded-full text-xs font-semibold border border-white/20">
              {label}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* CHAT VIEW */}
        {view === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* LEAP Progress */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {LEAP_STEPS.map((s, i) => (
                <div key={s.key} className={`rounded-2xl p-3 text-center border-2 transition-all ${
                  i < leapStep ? 'bg-emerald-500 border-emerald-500 text-white' :
                  i === leapStep ? 'bg-white border-emerald-500 text-emerald-700 shadow-lg' :
                  'bg-white border-stone-200 text-stone-400'
                }`}>
                  <div className="text-lg font-bold" style={{ fontFamily: 'Righteous, sans-serif' }}>{s.key}</div>
                  <div className="text-xs font-medium">{s.label}</div>
                  {i < leapStep && <CheckCircle className="w-3 h-3 mx-auto mt-1" />}
                </div>
              ))}
            </div>

            {/* Chat Messages */}
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto p-5 space-y-4">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-1">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 text-stone-800'
                      }`}>
                        {msg.content}
                        {msg.step && (
                          <span className={`inline-block mt-2 ml-1 px-2 py-0.5 rounded-full text-xs font-bold border ${LEAP_COLORS[msg.step]}`}>
                            {msg.step} — {LEAP_LABELS[msg.step]}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isThinking && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                      <div className="bg-stone-100 rounded-2xl px-4 py-3 text-sm text-stone-400">Thinking...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Pathway Preview */}
                {pathwayReady && (
                  <div className="mx-5 mb-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Your LEAP Pathway</p>
                    <p className="font-bold text-stone-900 mb-3 text-base">{pathwayReady.title}</p>
                    <div className="space-y-2 text-sm mb-4">
                      {[
                        { key: 'L', label: 'Link', value: pathwayReady.anchor_moment },
                        { key: 'E', label: 'Ease', value: pathwayReady.tiny_behavior },
                        { key: 'A', label: 'Acknowledge', value: pathwayReady.celebration },
                        { key: 'P', label: 'Progress', value: pathwayReady.full_behavior_goal },
                      ].map(item => (
                        <div key={item.key} className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border flex-shrink-0 ${LEAP_COLORS[item.key]}`}>{item.key}</span>
                          <span className="text-stone-700">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={savePathway}
                      disabled={createMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Save This Pathway & Activate It
                    </Button>
                  </div>
                )}

                {/* Input */}
                {!pathwayReady && (
                  <div className="p-4 border-t border-stone-100 flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder={leapStep < 4 ? `Share your thoughts on ${LEAP_STEPS[leapStep]?.label}...` : 'Describe your goals...'}
                      className="flex-1 rounded-xl"
                      disabled={isThinking}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || isThinking}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-5"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* PATHWAYS LIST VIEW */}
        {view === 'pathways' && (
          <motion.div key="pathways" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Empty state */}
            {!isLoading && activeHabits.length === 0 && (
              <Card className="border-4 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/50">
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-xl font-bold text-stone-800 mb-2">No pathways yet</h3>
                  <p className="text-stone-500 text-sm mb-5 max-w-xs mx-auto">Chat with your LEAP coach to collaboratively design a behavior pathway that sticks.</p>
                  <Button onClick={startChat} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold px-8">
                    <Plus className="w-4 h-4 mr-2" />
                    Create My First Pathway
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Active Pathways */}
            {activeHabits.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Righteous, sans-serif' }}>
                  <Flame className="w-5 h-5 text-emerald-500" />
                  Active Pathways ({activeHabits.length})
                </h2>
                <div className="grid gap-4">
                  {activeHabits.map((habit) => {
                    const siteAction = getSiteAction(habit);
                    const ActionIcon = siteAction.icon;
                    const leap = getLeapFromHabit(habit);
                    const streakLevel = habit.streak_count >= 30 ? 'expert' : habit.streak_count >= 14 ? 'hot' : habit.streak_count >= 7 ? 'going' : 'starting';
                    const streakColors = { expert: 'text-purple-600', hot: 'text-orange-500', going: 'text-emerald-600', starting: 'text-stone-500' };

                    return (
                      <motion.div key={habit.id} layout whileHover={{ scale: 1.005 }}>
                        <Card className="bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl overflow-hidden">
                          {/* Streak bar */}
                          <div className="h-1.5 bg-stone-100">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                              style={{ width: `${Math.min((habit.streak_count || 0) / 30 * 100, 100)}%` }}
                            />
                          </div>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-bold text-stone-900 text-base">{habit.title}</h3>
                                <Badge variant="outline" className="text-xs mt-1 capitalize">
                                  {habit.subject?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div className="text-center bg-stone-50 rounded-2xl px-4 py-2 border border-stone-200">
                                <p className={`text-2xl font-bold ${streakColors[streakLevel]}`}>{habit.streak_count || 0}</p>
                                <p className="text-xs text-stone-500">day streak</p>
                              </div>
                            </div>

                            {/* LEAP breakdown */}
                            <div className="space-y-2 mb-4">
                              {Object.entries(leap).map(([key, value]) => value ? (
                                <div key={key} className="flex items-start gap-2 text-sm">
                                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold border flex-shrink-0 mt-0.5 ${LEAP_COLORS[key]}`}>{key}</span>
                                  <span className="text-stone-600 leading-snug">{value}</span>
                                </div>
                              ) : null)}
                            </div>

                            {/* Gamification mini-stats */}
                            <div className="flex gap-3 mb-4 text-xs text-stone-500">
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-emerald-500" />
                                {habit.total_completions || 0} total completions
                              </span>
                              {habit.streak_count >= 7 && (
                                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                  {habit.streak_count >= 30 ? 'Habit Master!' : habit.streak_count >= 14 ? 'On Fire!' : 'Building Momentum!'}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-stone-100 gap-2 flex-wrap">
                              <div className="flex gap-2">
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => updateMutation.mutate({ id: habit.id, data: { status: 'paused' } })}
                                  className="text-stone-400 hover:text-stone-600"
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => deleteMutation.mutate(habit.id)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Link to={createPageUrl(siteAction.path)}>
                                  <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl">
                                    <ActionIcon className="w-3.5 h-3.5 mr-1.5" />
                                    {siteAction.label}
                                    <ChevronRight className="w-3 h-3 ml-1" />
                                  </Button>
                                </Link>
                                <Button
                                  onClick={() => updateMutation.mutate({
                                    id: habit.id,
                                    data: {
                                      streak_count: (habit.streak_count || 0) + 1,
                                      total_completions: (habit.total_completions || 0) + 1
                                    }
                                  })}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                                  size="sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1.5" />
                                  Done Today
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paused Pathways */}
            {pausedHabits.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-stone-400 mb-3 flex items-center gap-2">
                  <Pause className="w-4 h-4" /> Paused ({pausedHabits.length})
                </h2>
                <div className="grid gap-2">
                  {pausedHabits.map((habit) => (
                    <Card key={habit.id} className="bg-stone-50 border-stone-200 opacity-60 rounded-2xl">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-stone-600 text-sm">{habit.title}</p>
                          <p className="text-xs text-stone-400">{habit.tiny_behavior}</p>
                        </div>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => updateMutation.mutate({ id: habit.id, data: { status: 'active' } })}
                          className="rounded-xl"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* LEAP info card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-stone-50 border-2 border-emerald-100 rounded-3xl">
              <CardContent className="p-5">
                <h3 className="font-bold text-stone-800 mb-3 text-sm" style={{ fontFamily: 'Righteous, sans-serif' }}>How LEAP Works</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'L', label: 'Link', desc: 'Attach to an existing desire & daily routine', color: 'bg-emerald-100 border-emerald-200 text-emerald-800' },
                    { key: 'E', label: 'Ease', desc: 'Design the tiniest possible version of the behavior', color: 'bg-stone-100 border-stone-200 text-stone-700' },
                    { key: 'A', label: 'Acknowledge', desc: 'Celebrate every completion immediately', color: 'bg-stone-100 border-stone-200 text-stone-700' },
                    { key: 'P', label: 'Progress', desc: 'Define the growth path & track momentum', color: 'bg-emerald-100 border-emerald-200 text-emerald-800' },
                  ].map(item => (
                    <div key={item.key} className={`rounded-2xl p-3 border ${item.color}`}>
                      <div className="font-black text-lg" style={{ fontFamily: 'Righteous, sans-serif' }}>{item.key}</div>
                      <div className="font-semibold text-xs">{item.label}</div>
                      <div className="text-xs opacity-80 mt-1">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
