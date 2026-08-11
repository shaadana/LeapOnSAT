import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Send, Plus, MessageSquare, Pencil, Check, X, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

function defaultConversationName() {
  return `Chat · ${format(new Date(), 'MMM d, h:mm a')}`;
}

// Strips the injected [TEACHER CONTEXT]/[STUDENT CONTEXT] block (and any leading
// [Context: ...] tag) from a message so teachers only see their actual question.
function stripContextBlock(content) {
  if (!content) return content;
  return content
    .replace(/^\[(TEACHER|STUDENT) CONTEXT\][\s\S]*?\n---\n/, '')
    .replace(/^\[Context:[^\]]*\]\s*/, '')
    .trim();
}

function summarizeForName(messages) {
  const firstUser = messages?.find(m => m.role === 'user')?.content;
  if (!firstUser) return null;
  const cleaned = firstUser.replace(/^\[(TEACHER|STUDENT) CONTEXT\][\s\S]*?(?=\n\n|\n$|$)/g, '').replace(/^\[Context:[^\]]*\]\s*/, '').trim();
  return cleaned.length > 48 ? cleaned.slice(0, 45) + '…' : cleaned;
}

// Builds a structured context block from the getComentorContext snapshot so
// the agent has the teacher's profile AND the selected student's full data
// without needing to fetch it itself.
function buildContextBlock(ctx) {
  if (!ctx) return '';
  const lines = [];

  // ── Teacher context ──
  const tp = ctx.teacher_profile || {};
  lines.push('[TEACHER CONTEXT]');
  lines.push(`Teacher: ${tp.name || 'Unknown'} (${tp.email || ''})`);
  if (tp.teaching_background?.total_years != null) lines.push(`Experience: ${tp.teaching_background.total_years} years, role: ${tp.teaching_background.teaching_role || 'N/A'}`);
  const mb = tp.mindset_beliefs || {};
  if (mb.mentor_mindset_score != null) lines.push(`Mindset — mentor: ${mb.mentor_mindset_score}, enforcer: ${mb.enforcer_tendencies}, protector: ${mb.protector_tendencies}, growth: ${mb.growth_mindset_score}`);
  const wb = tp.wellbeing || {};
  if (wb.stress_frequency) lines.push(`Wellbeing — stress: ${wb.stress_frequency}, coping: ${wb.coping_ability || 'N/A'}`);
  if (tp.strengths?.length) lines.push(`Teacher strengths: ${tp.strengths.join(', ')}`);
  if (tp.growth_areas?.length) lines.push(`Teacher growth areas: ${tp.growth_areas.join(', ')}`);
  if (tp.personalized_advice) lines.push(`Prior personalized advice: ${tp.personalized_advice.slice(0, 300)}`);

  // ── Student context ──
  const sd = ctx.student_data;
  if (sd) {
    lines.push('');
    lines.push('[STUDENT CONTEXT]');
    lines.push(`Student: ${sd.user?.name || 'Unknown'} (${sd.user?.email || ''})`);
    if (sd.grade_level) lines.push(`Grade: ${sd.grade_level}`);
    if (sd.sat_target_date) lines.push(`SAT target date: ${sd.sat_target_date}`);
    if (sd.sat_performance?.sat_math_score) lines.push(`SAT Math score: ${sd.sat_performance.sat_math_score}`);
    if (sd.sat_performance?.sat_english_score) lines.push(`SAT English score: ${sd.sat_performance.sat_english_score}`);

    // Executive functioning
    const ef = sd.executive_functioning || {};
    const efEntries = Object.entries(ef).filter(([, v]) => typeof v === 'number');
    if (efEntries.length) {
      const efLow = efEntries.filter(([, v]) => v < 10).map(([k]) => k.replace(/_/g, ' '));
      const efHigh = efEntries.filter(([, v]) => v >= 14).map(([k]) => k.replace(/_/g, ' '));
      if (efLow.length) lines.push(`EF weaknesses: ${efLow.join(', ')}`);
      if (efHigh.length) lines.push(`EF strengths: ${efHigh.join(', ')}`);
    }

    // Mindset & motivation
    const ms = sd.mindset_appraisal || {};
    if (ms.mentor_mindset_score != null) lines.push(`Student mentor mindset: ${ms.mentor_mindset_score}`);
    const mo = sd.motivation_assessment || {};
    if (mo.intrinsic_motivation != null) lines.push(`Motivation — intrinsic: ${mo.intrinsic_motivation}, extrinsic: ${mo.extrinsic_motivation}`);

    if (sd.strengths?.length) lines.push(`Student strengths: ${sd.strengths.join(', ')}`);
    if (sd.growth_areas?.length) lines.push(`Student growth areas: ${sd.growth_areas.join(', ')}`);

    // Math practice
    const mp = sd.math_practice || {};
    if (mp.total_completed_sessions != null) {
      lines.push(`SAT Math: ${mp.overall_accuracy != null ? mp.overall_accuracy + '%' : 'no data'} accuracy over ${mp.total_completed_sessions} sessions (${mp.total_correct}/${mp.total_attempted} questions)`);
      const weak = (mp.domain_breakdown || []).filter(d => d.accuracy < 60).slice(0, 5);
      if (weak.length) lines.push(`Weakest math domains: ${weak.map(d => `${d.domain} (${d.accuracy}%)`).join(', ')}`);
      const recent = (mp.recent_sessions || []).slice(0, 3);
      if (recent.length) lines.push(`Recent math sessions: ${recent.map(s => `${s.type} ${s.accuracy != null ? s.accuracy + '%' : '?'}`).join(', ')}`);
    }

    // English practice
    const ep = sd.english_practice || {};
    if (ep.total_completed_sessions != null) {
      lines.push(`SAT English: ${ep.overall_accuracy != null ? ep.overall_accuracy + '%' : 'no data'} accuracy over ${ep.total_completed_sessions} sessions`);
      const recent = (ep.recent_sessions || []).slice(0, 3);
      if (recent.length) lines.push(`Recent English sessions: ${recent.map(s => `${s.type} ${s.accuracy != null ? s.accuracy + '%' : '?'}`).join(', ')}`);
    }

    // Assignments
    const ap = sd.assignments || {};
    lines.push(`Assignments: ${ap.completed_count || 0} completed, ${ap.pending_count || 0} pending (of last 10)`);

    // Streak
    const st = sd.streak;
    if (st) lines.push(`Streak: ${st.current} current, ${st.longest} longest, last studied ${st.last_study_date || 'N/A'}`);

    // Habits
    const habits = sd.active_habits || [];
    if (habits.length) lines.push(`Active LEAP habits: ${habits.map(h => `"${h.title}" (${h.streak} day streak)`).join('; ')}`);

    // Gamification
    const g = sd.gamification;
    if (g) lines.push(`Engagement: Level ${g.level}, ${g.xp} XP, ${g.coins} coins${g.earned_badges?.length ? `, ${g.earned_badges.length} badges` : ''}`);

    // Concept mastery
    const cm = sd.concept_mastery || {};
    if (cm.total_tracked != null) lines.push(`Concept mastery: ${cm.mastered_count || 0} mastered, ${cm.learning_count || 0} in progress (of ${cm.total_tracked})`);
    if (cm.weak_topics?.length) lines.push(`Weak topics: ${cm.weak_topics.join(', ')}`);
  }

  return lines.join('\n');
}

export default function CoMentor({ user, classes }) {
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef(null);

  const queryClient = useQueryClient();
  const { data: teacherProfile } = useQuery({
    queryKey: ['teacherProfile', user?.id],
    queryFn: async () => (await base44.entities.TeacherProfile.filter({ user_id: user?.id }))[0],
    enabled: !!user?.id,
  });
  const [hiddenChatIds, setHiddenChatIds] = useState([]);
  useEffect(() => {
    if (teacherProfile?.hidden_chat_ids) setHiddenChatIds(teacherProfile.hidden_chat_ids);
  }, [teacherProfile?.hidden_chat_ids]);

  const { data: allStudents } = useQuery({
    queryKey: ['allClassStudents', user?.id],
    queryFn: async () => {
      const studentProfiles = [];
      for (const cls of classes) {
        if (cls.student_ids?.length) {
          for (const studentId of cls.student_ids) {
            const [studentUser] = await base44.entities.User.filter({ id: studentId });
            const [profile] = await base44.entities.UserProfile.filter({ user_id: studentId });
            studentProfiles.push({ user: studentUser, profile, className: cls.class_name });
          }
        }
      }
      return studentProfiles;
    },
    enabled: !!classes?.length
  });

  // Fetch combined teacher + student context snapshot when a student is selected
  const { data: comentorContext, isLoading: isLoadingContext } = useQuery({
    queryKey: ['comentorContext', user?.id, selectedStudent?.user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getComentorContext', { student_id: selectedStudent?.user?.id });
      return res.data;
    },
    enabled: !!user?.id && !!selectedStudent?.user?.id,
  });

  useEffect(() => {
    if (user?.id) refreshConversations(true);
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

  const refreshConversations = async (selectLatest = false) => {
    if (!user?.id) return;
    setIsLoadingList(true);
    const list = await base44.agents.listConversations({ agent_name: 'teacher_comentor' });
    // Filter to this teacher's conversations only
    const mine = (list || []).filter(c => c.metadata?.user_id === user.id);
    const sorted = [...mine].sort(
      (a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0)
    );
    setConversations(sorted);
    setIsLoadingList(false);

    if (selectLatest) {
      if (sorted.length > 0) {
        await openConversation(sorted[0].id);
      } else {
        await startNewConversation();
      }
    }
  };

  const openConversation = async (id) => {
    const full = await base44.agents.getConversation(id);
    setConversation(full);
    setMessages(full.messages || []);
  };

  const startNewConversation = async () => {
    if (!user?.id) return;
    const newConvo = await base44.agents.createConversation({
      agent_name: 'teacher_comentor',
      metadata: {
        name: defaultConversationName(),
        user_id: user.id,
        user_name: user.name || user.full_name,
        user_email: user.email,
      }
    });
    setConversation(newConvo);
    setMessages(newConvo.messages || []);
    refreshConversations(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || isSending) return;

    setIsSending(true);
    const userMessage = input.trim();
    setInput('');

    let messageContent = userMessage;
    if (comentorContext) {
      const contextBlock = buildContextBlock(comentorContext);
      if (contextBlock) {
        messageContent = `${contextBlock}\n\n---\n\n${userMessage}`;
      }
    }

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageContent
      });

      // If this conversation is still using a default name, set it from the first user message
      const isDefaultName = !conversation.metadata?.name || /^Chat · /.test(conversation.metadata.name);
      if (isDefaultName) {
        const summary = summarizeForName([{ role: 'user', content: userMessage }]);
        if (summary) {
          await base44.agents.updateConversation(conversation.id, {
            metadata: { ...conversation.metadata, name: summary }
          });
          refreshConversations(false);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    const target = conversations.find(c => c.id === id);
    if (!target) return;
    await base44.agents.updateConversation(id, {
      metadata: { ...(target.metadata || {}), name: renameValue.trim() }
    });
    setRenamingId(null);
    setRenameValue('');
    refreshConversations(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this chat? This cannot be undone.')) return;
    // The agents SDK exposes no delete/update for conversations, so we persist a
    // hidden list on the teacher's profile and filter those out of the UI.
    // Optimistically hide locally first for instant feedback.
    setHiddenChatIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (conversation?.id === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) await openConversation(remaining[0].id);
      else await startNewConversation();
    }
    try {
      let profile = teacherProfile;
      if (!profile) {
        profile = (await base44.entities.TeacherProfile.filter({ user_id: user.id }))[0];
      }
      if (profile) {
        const hidden = new Set(profile.hidden_chat_ids || []);
        hidden.add(id);
        await base44.entities.TeacherProfile.update(profile.id, { hidden_chat_ids: Array.from(hidden) });
        await queryClient.invalidateQueries({ queryKey: ['teacherProfile', user?.id] });
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const visibleConvos = conversations.filter(c => !hiddenChatIds.includes(c.id));

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-white border-4 border-emerald-200 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle className="flex items-center gap-2 text-2xl text-stone-900 font-display">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Co-Mentor AI
          </CardTitle>
          <CardDescription className="text-stone-600">
            Your AI colleague for student support, behavior design, and mentor mindset coaching
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-[600px]">

            {/* ── Sidebar: chat list ── */}
            <aside className="border-r-2 border-stone-100 bg-stone-50/50 p-3 flex flex-col gap-2">
              <Button
                onClick={startNewConversation}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow"
              >
                <Plus className="w-4 h-4 mr-1" /> New Chat
              </Button>
              <div className="text-[11px] font-bold uppercase tracking-wide text-stone-400 px-1 mt-2">
                Saved Chats
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[520px]">
                {isLoadingList && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                  </div>
                )}
                {!isLoadingList && visibleConvos.length === 0 && (
                  <p className="text-xs text-stone-400 px-1 py-2">No saved chats yet</p>
                )}
                {visibleConvos.map(c => {
                  const isActive = conversation?.id === c.id;
                  const name = c.metadata?.name || 'Untitled';
                  const isRenaming = renamingId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => !isRenaming && openConversation(c.id)}
                      className={`group rounded-xl p-2 cursor-pointer transition-all border-2 ${
                        isActive
                          ? 'bg-emerald-100 border-emerald-300'
                          : 'bg-white border-transparent hover:border-stone-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-emerald-700' : 'text-stone-400'}`} />
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex items-center gap-1">
                              <Input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(c.id);
                                  if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                                }}
                                className="h-7 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); handleRename(c.id); }} className="text-emerald-600 hover:text-emerald-800">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setRenamingId(null); setRenameValue(''); }} className="text-stone-400 hover:text-stone-600">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-900' : 'text-stone-700'}`}>
                                {name}
                              </p>
                              <p className="text-[10px] text-stone-400 mt-0.5">
                                {c.updated_date || c.created_date
                                  ? format(new Date(c.updated_date || c.created_date), 'MMM d, h:mm a')
                                  : ''}
                              </p>
                            </>
                          )}
                        </div>
                        {!isRenaming && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setRenamingId(c.id); setRenameValue(name); }}
                              className="text-stone-400 hover:text-stone-700"
                              title="Rename"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(c.id, e)}
                              className="text-stone-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* ── Main: active chat ── */}
            <div className="p-4 space-y-4 flex flex-col">
              {allStudents?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">
                    Select a student for context (optional)
                  </label>
                  <Select value={selectedStudent?.user?.id || '__none__'} onValueChange={(id) => {
                    const student = id === '__none__' ? null : allStudents.find(s => s.user?.id === id);
                    setSelectedStudent(student || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="No student selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No student selected</SelectItem>
                      {allStudents.map((student) => (
                        <SelectItem key={student.user?.id} value={student.user?.id}>
                          {(student.user?.name || student.user?.full_name)} ({student.className})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStudent && (
                    isLoadingContext ? (
                      <p className="text-xs text-stone-500 font-medium mt-2 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading {selectedStudent.user?.full_name}'s data…
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-700 font-semibold mt-2">
                        ✓ Co-Mentor has {selectedStudent.user?.full_name}'s profile, practice history, assignments, streak, and your teacher profile as context
                      </p>
                    )
                  )}
                </div>
              )}

              <div className="bg-white rounded-3xl border-4 border-stone-200 p-4 space-y-3 flex-1 max-h-[480px] overflow-y-auto shadow-inner">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-stone-500">Start a new conversation — ask about a student, share a situation, or get coaching advice.</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-800 border-2 border-stone-200'
                    }`}>
                      <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.role === 'user' ? stripContextBlock(msg.content) : msg.content}
                      </ReactMarkdown>
                      {msg.tool_calls?.map((toolCall, i) => (
                        <div key={i} className="mt-2 text-xs opacity-70">
                          🔧 {toolCall.name?.split('.').pop()}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Describe the situation or ask for advice..."
                  disabled={isSending || !conversation}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim() || isSending || !conversation} className="bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
