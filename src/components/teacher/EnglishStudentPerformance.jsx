import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Clock, Target, Zap, BookOpen, Brain, Network, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ENGLISH_DOMAIN_LABELS } from '@/data/englishQuestions';
import { ENGLISH_GRAPH_NODES } from '@/data/englishKnowledgeGraph';
import SessionResultsModal from './SessionResultsModal';
import DiagnosticResponseList from './DiagnosticResponseList';
import DiagnosticResponsesModal from './DiagnosticResponsesModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EnglishStudentPerformance({ studentId, studentName }) {
  const [activeTab, setActiveTab] = useState('practice');
  const [sortOrder, setSortOrder] = useState('newest');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['studentEnglishSessions', studentId],
    queryFn: () => base44.entities.EnglishPracticeSession.filter({ user_id: studentId }, '-created_date', 500),
    enabled: !!studentId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['studentUserProfileEng', studentId],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: studentId }),
    enabled: !!studentId,
  });

  const { data: assignmentProgresses = [] } = useQuery({
    queryKey: ['studentAssignmentProgressEng', studentId],
    queryFn: () => base44.entities.StudentAssignmentProgress.filter({ student_id: studentId, status: 'completed' }, '-created_date', 500),
    enabled: !!studentId,
  });

  const sessionAssignmentIds = [...new Set(sessions.map(s => s.assignment_id).filter(Boolean))];
  const progressAssignmentIds = assignmentProgresses.map(p => p.assignment_id);
  const allAssignmentIds = [...new Set([...sessionAssignmentIds, ...progressAssignmentIds])];

  const { data: assignments = [] } = useQuery({
    queryKey: ['studentAssignmentsEng', allAssignmentIds.join(',')],
    queryFn: async () => {
      if (allAssignmentIds.length === 0) return [];
      const all = await base44.entities.Assignment.list('-created_date', 500);
      return all.filter(a => allAssignmentIds.includes(a.id));
    },
    enabled: allAssignmentIds.length > 0,
  });

  const assignmentMap = {};
  assignments.forEach(a => { assignmentMap[a.id] = a.title; });

  const userProfile = profiles[0];
  const englishPerf = userProfile?.english_performance || {};
  
  const completedSessions = [...sessions.filter(s => s.status === 'completed')];
  const existingSessionAssignmentIds = new Set(completedSessions.map(s => s.assignment_id).filter(Boolean));

  assignmentProgresses.forEach(prog => {
    if (existingSessionAssignmentIds.has(prog.assignment_id)) return;
    const assign = assignments.find(a => a.id === prog.assignment_id);
    if (!assign) return;

    const isEnglish = 
      assign.assignment_type === 'english_practice' || 
      assign.assignment_type === 'english_diagnostic' || 
      ((assign.assignment_type === 'canyon_pdf' || assign.assignment_type === 'auto_extract' || assign.assignment_type === 'document_markup') && assign.assignment_config?.subject === 'english');

    if (!isEnglish) return;
    if (!prog.question_history || prog.question_history.length === 0) return;

    const questions_attempted = prog.question_history.length;
    const questions_correct = prog.question_history.filter(q => q.correct).length;
    const avg_time = prog.question_history.reduce((sum, q) => sum + (q.time_spent_seconds || 0), 0) / questions_attempted;

    completedSessions.push({
      id: prog.id,
      session_type: assign.assignment_type,
      assignment_id: prog.assignment_id,
      status: 'completed',
      created_date: prog.completed_at || prog.started_at || assign.created_date,
      start_time: prog.started_at,
      end_time: prog.completed_at,
      questions_attempted,
      questions_correct,
      question_history: prog.question_history,
      performance_summary: {
        accuracy_percentage: Math.round((questions_correct / questions_attempted) * 100),
        avg_time_per_question: avg_time
      }
    });
  });

  if (isLoading) {
    return <div className="text-center py-8 text-stone-500">Loading English performance data...</div>;
  }

  // Aggregate stats from sessions (more accurate than stored profile snapshot)
  const totalCorrect = completedSessions.reduce((s, sess) => s + (sess.questions_correct || 0), 0);
  const totalAttempted = completedSessions.reduce((s, sess) => s + (sess.questions_attempted || 0), 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  // Build per-domain stats from question_history
  const domainStats = {};
  completedSessions.forEach(sess => {
    (sess.question_history || []).forEach(q => {
      if (!q.domain) return;
      if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 };
      domainStats[q.domain].total++;
      if (q.correct) domainStats[q.domain].correct++;
    });
  });

  const domainChartData = Object.entries(domainStats)
    .filter(([, s]) => s.total >= 1)
    .map(([domain, s]) => ({
      name: (ENGLISH_DOMAIN_LABELS[domain] || domain.replace(/_/g, ' ')).split(' ').slice(0, 2).join(' '),
      fullName: ENGLISH_DOMAIN_LABELS[domain] || domain.replace(/_/g, ' '),
      accuracy: Math.round((s.correct / s.total) * 100),
      total: s.total
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const strongDomains = domainChartData.filter(d => d.accuracy >= 70);
  const weakDomains = domainChartData.filter(d => d.accuracy < 50);
  const sortedSessions = [...completedSessions].sort((a, b) => {
    const dateA = new Date(a.created_date || a.end_time || a.start_time || 0);
    const dateB = new Date(b.created_date || b.end_time || b.start_time || 0);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
  const recentSessions = sortedSessions.slice(0, 10);

  // Diagnostic data from UserProfile
  const latestDiagForAcc = completedSessions.find(s => s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic');
  const diagnosticAccuracy = latestDiagForAcc?.performance_summary?.accuracy_percentage ?? englishPerf.diagnostic_accuracy;
  const diagnosticDate = latestDiagForAcc?.end_time || latestDiagForAcc?.start_time || englishPerf.last_session_date;
  
  // Compute true domain scores from diagnostic responses if available
  const computedDomainScores = { ...(englishPerf.domain_scores || {}) };
  const latestDiagSession = completedSessions.find(s => s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic');
  const diagResponses = latestDiagSession?.question_history?.length > 0 
    ? latestDiagSession.question_history 
    : (englishPerf.responses || []);

  if (diagResponses.length > 0) {
    const dCounts = {};
    diagResponses.forEach(r => {
      if (!r.domain) return;
      if (!dCounts[r.domain]) dCounts[r.domain] = { correct: 0, total: 0 };
      dCounts[r.domain].total++;
      if (r.correct) dCounts[r.domain].correct++;
    });
    Object.keys(dCounts).forEach(d => {
      computedDomainScores[d] = (dCounts[d].correct / dCounts[d].total) * 100;
    });
  }

  const domainScoreEntries = Object.entries(computedDomainScores)
    .map(([domain, score]) => ({
      name: ENGLISH_DOMAIN_LABELS[domain] || domain.replace(/_/g, ' '),
      score: Math.round(score),
    }))
    .sort((a, b) => b.score - a.score);

  const MASTERY_CONFIG = {
    not_started: 'bg-stone-200 text-stone-600',
    learning:    'bg-sky-50 text-sky-600 border border-sky-200',
    practiced:   'bg-amber-100 text-amber-700',
    mastered:    'bg-emerald-100 text-emerald-800',
  };
  
  // Calculate mastery for english graph nodes just for the summary tiles
  const SCORE_TO_MASTERY = (score) => {
    if (score >= 85) return 'mastered';
    if (score >= 65) return 'practiced';
    // If evaluated at all (even 0%), it's 'learning'
    return 'learning';
  };

  const ENGLISH_DOMAIN_TO_BROAD = {
    apostrophes: 'Standard English Conventions',
    semicolons_periods: 'Standard English Conventions',
    commas: 'Standard English Conventions',
    colons: 'Standard English Conventions',
    dashes: 'Standard English Conventions',
    parallel_structure: 'Standard English Conventions',
    subject_verb_agreement: 'Standard English Conventions',
    pronoun_agreement: 'Standard English Conventions',
    verb_tense: 'Standard English Conventions',
    adjectives_adverbs: 'Standard English Conventions',
    word_pairs: 'Standard English Conventions',
    who_which_whom: 'Standard English Conventions',
    modifiers: 'Standard English Conventions',
    pronoun_case: 'Standard English Conventions',
    transitions: 'Expression of Ideas',
    conciseness: 'Expression of Ideas',
    idioms_diction: 'Expression of Ideas',
    vocabulary: 'Craft and Structure',
    tone_purpose: 'Craft and Structure',
    reading_comprehension: 'Information and Ideas',
    main_idea: 'Information and Ideas',
    inference: 'Information and Ideas',
    evidence_support: 'Information and Ideas'
  };

  const broadComputedDomainScores = {};
  if (diagResponses.length > 0) {
    const bCounts = {};
    diagResponses.forEach(r => {
      if (!r.domain) return;
      const broad = ENGLISH_DOMAIN_TO_BROAD[r.domain] || r.domain;
      if (!bCounts[broad]) bCounts[broad] = { correct: 0, total: 0 };
      bCounts[broad].total++;
      if (r.correct) bCounts[broad].correct++;
    });
    Object.keys(bCounts).forEach(b => {
      broadComputedDomainScores[b] = (bCounts[b].correct / bCounts[b].total) * 100;
    });
  }

  const englishNodesMasteryMap = {};
  ENGLISH_GRAPH_NODES.forEach(n => {
    const dScore = broadComputedDomainScores[n.domain];
    if (dScore !== undefined) {
       englishNodesMasteryMap[n.id] = SCORE_TO_MASTERY(dScore);
    } else {
       englishNodesMasteryMap[n.id] = 'not_started';
    }
  });

  // Layer session data
  Object.entries(domainStats).forEach(([domain, stats]) => {
    const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    let sessionMastery;
    if (stats.total >= 25 && accuracy >= 0.85) sessionMastery = 'mastered';
    else if (stats.total >= 10 && accuracy >= 0.75) sessionMastery = 'practiced';
    else if (stats.total >= 3) sessionMastery = 'learning';
    
    if (sessionMastery) {
       const broad = ENGLISH_DOMAIN_TO_BROAD[domain] || domain;
       ENGLISH_GRAPH_NODES.filter(n => n.domain === broad || n.domain === domain).forEach(n => {
          const current = englishNodesMasteryMap[n.id] || 'not_started';
          const MASTERY_LIST = ['not_started','learning','practiced','mastered'];
          if (MASTERY_LIST.indexOf(sessionMastery) > MASTERY_LIST.indexOf(current)) {
            englishNodesMasteryMap[n.id] = sessionMastery;
          }
       });
    }
  });

  const mergedEnglishNodes = ENGLISH_GRAPH_NODES.map(n => ({
    ...n,
    mastery_level: englishNodesMasteryMap[n.id] || 'not_started'
  }));

  const activeNodes = diagResponses.length > 0
    ? mergedEnglishNodes
    : mergedEnglishNodes.filter(n => n.mastery_level !== 'not_started');

  const masteredNodes = activeNodes.filter(n => n.mastery_level === 'mastered');
  const weakNodes = activeNodes.filter(n => ['learning', 'not_started'].includes(n.mastery_level));

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        {[
          { key: 'practice', label: 'Practice Sessions', icon: Target },
          { key: 'diagnostic', label: 'Diagnostic', icon: Network },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === key ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PRACTICE TAB ── */}
      {activeTab === 'practice' && (
        <>
          {completedSessions.length === 0 ? (
            <div className="text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-500 text-sm">No English practice sessions yet</p>
              <p className="text-xs text-stone-400 mt-1">{studentName} hasn't completed any English sessions</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-700">{overallAccuracy != null ? `${overallAccuracy}%` : '—'}</p><p className="text-xs text-stone-600 mt-0.5">Accuracy</p></CardContent></Card>
                <Card className="bg-stone-50 border-stone-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-stone-700">{completedSessions.length}</p><p className="text-xs text-stone-600 mt-0.5">Sessions</p></CardContent></Card>
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-700">{totalCorrect}</p><p className="text-xs text-stone-600 mt-0.5">Correct</p></CardContent></Card>
                <Card className="bg-stone-50 border-stone-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-stone-700">
                      {Math.round(completedSessions.reduce((s, sess) => s + (sess.performance_summary?.avg_time_per_question || 0), 0) / (completedSessions.length || 1))}s
                    </p>
                    <p className="text-xs text-stone-600 mt-0.5">Avg/Q</p>
                  </CardContent>
                </Card>
              </div>

              {domainChartData.length > 0 && (
                <Card className="border-2 border-stone-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-stone-600" />Accuracy by Domain
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={domainChartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(v, n, props) => [`${v}%`, props.payload.fullName]} />
                        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                          {domainChartData.map((e, i) => (
                            <Cell key={i} fill={e.accuracy >= 70 ? '#10b981' : e.accuracy >= 50 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Strengths & Weaknesses */}
              {(strongDomains.length > 0 || weakDomains.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {strongDomains.length > 0 && (
                    <Card className="border-2 border-emerald-100 bg-emerald-50">
                      <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold text-emerald-700">✓ Strong Areas</CardTitle></CardHeader>
                      <CardContent className="pt-0 flex flex-wrap gap-1">
                        {strongDomains.slice(0, 4).map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-emerald-200 rounded-full text-xs text-emerald-700">
                            {d.fullName} {d.accuracy}%
                          </span>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {weakDomains.length > 0 && (
                    <Card className="border-2 border-red-100 bg-red-50">
                      <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold text-red-700">⚠ Needs Work</CardTitle></CardHeader>
                      <CardContent className="pt-0 flex flex-wrap gap-1">
                        {weakDomains.slice(0, 4).map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-red-200 rounded-full text-xs text-red-700">
                            {d.fullName} {d.accuracy}%
                          </span>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Recent Sessions */}
              <Card className="border-2 border-stone-100">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-600" />Recent Sessions
                    </CardTitle>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest → Oldest</SelectItem>
                        <SelectItem value="oldest">Oldest → Newest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentSessions.map(sess => {
                    const acc = sess.questions_attempted > 0
                      ? Math.round((sess.questions_correct / sess.questions_attempted) * 100) : 0;
                    const isAssignment = !!sess.assignment_id;
                    return (
                      <div key={sess.id} className={`flex items-center gap-3 p-2 rounded-lg border ${isAssignment ? 'bg-blue-50/50 border-blue-200' : 'bg-stone-50 border-stone-100'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isAssignment ? 'bg-blue-100' :
                          sess.session_type === 'blitz' ? 'bg-stone-100' :
                          sess.session_type === 'diagnostic' ? 'bg-emerald-100' : 'bg-stone-200'
                        }`}>
                          {isAssignment ? <ClipboardList className="w-3.5 h-3.5 text-blue-600" /> :
                           sess.session_type === 'blitz' ? <Zap className="w-3.5 h-3.5 text-stone-600" /> :
                           sess.session_type === 'diagnostic' ? <Brain className="w-3.5 h-3.5 text-emerald-600" /> :
                           <BookOpen className="w-3.5 h-3.5 text-stone-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              {isAssignment ? (
                                <span className="text-xs font-semibold text-blue-700 truncate max-w-[200px]" title={assignmentMap[sess.assignment_id] || 'Assignment'}>
                                  {assignmentMap[sess.assignment_id] || 'Assignment'}
                               </span>
                              ) : (
                                <span className="text-xs font-medium text-stone-700 capitalize">{sess.session_type}</span>
                              )}
                              {isAssignment && (
                                <span className="text-[10px] text-blue-400 capitalize">{sess.session_type}</span>
                              )}
                              {sess.created_date && (
                                <span className="text-[10px] text-stone-400">{new Date(sess.created_date).toLocaleDateString()}</span>
                              )}
                              <span className="text-[10px] text-stone-400">· {Math.round(sess.performance_summary?.avg_time_per_question || 0)}s avg/Q</span>
                            </div>
                            <span className="text-xs font-bold text-stone-700">{acc}%</span>
                          </div>
                          <Progress value={acc} className="h-1.5" />
                        </div>
                        <div className="flex items-center gap-3 ml-2">
                          <span className="text-xs text-stone-400 flex-shrink-0">{sess.questions_correct}/{sess.questions_attempted}</span>
                          <SessionResultsModal 
                            session={sess} 
                            studentName={studentName} 
                            assignmentName={sess.assignment_id ? assignmentMap[sess.assignment_id] : undefined}
                            trigger={
                              <button className="text-xs text-stone-600 hover:text-stone-800 font-medium">
                                View
                              </button>
                            } 
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* ── DIAGNOSTIC TAB ── */}
      {activeTab === 'diagnostic' && (
        <>
          {!(completedSessions.some(s => s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic') || englishPerf?.responses?.length > 0) ? (
            <div className="text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
              <Network className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-500 text-sm font-semibold">No diagnostic completed yet!</p>
              <p className="text-xs text-stone-400 mt-1">{studentName} hasn't finished an English diagnostic</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-700">{masteredNodes.length}</p><p className="text-xs text-stone-600 mt-0.5">Mastered</p></CardContent></Card>
                <Card className="bg-stone-50 border-stone-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-stone-700">{activeNodes.length}</p><p className="text-xs text-stone-600 mt-0.5">Total Topics</p></CardContent></Card>
                <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-amber-700">{weakNodes.length}</p><p className="text-xs text-stone-600 mt-0.5">Need Work</p></CardContent></Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-amber-700">{diagnosticAccuracy != null ? `${diagnosticAccuracy}%` : '—'}</p>
                    <p className="text-xs text-stone-600 mt-0.5">Diagnostic Score</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-stone-100 mt-3">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-stone-700">Knowledge Graph — SAT English</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {activeNodes.map(node => {
                    const mastery = node.mastery_level || 'not_started';
                    return (
                      <div key={node.id} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 bg-stone-50">
                        <span className="text-lg"><BookOpen className="w-4 h-4 text-stone-500" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-stone-800">{node.title}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MASTERY_CONFIG[mastery]}`}>
                          {mastery.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {weakNodes.length > 0 && (
                <Card className="border-2 border-amber-200 bg-amber-50 mt-3 mb-3">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-amber-800">Recommended Focus Areas</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {weakNodes.map(n => (
                        <span key={n.id} className="px-2 py-1 bg-white border border-amber-200 rounded-full text-xs text-amber-800 font-medium">
                          {n.title}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(domainScoreEntries.length > 0 || englishPerf.strongest_domain) && (
                <Card className="border-2 border-stone-100">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Strongest Domain</span>
                      <span className="font-semibold text-emerald-700">
                        {domainScoreEntries.length > 0 
                          ? domainScoreEntries[0].name 
                          : (ENGLISH_DOMAIN_LABELS[englishPerf.strongest_domain] || englishPerf.strongest_domain?.replace(/_/g, ' '))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Needs Work</span>
                      <span className="font-semibold text-red-600">
                        {domainScoreEntries.length > 1 
                          ? domainScoreEntries[domainScoreEntries.length - 1].name 
                          : (domainScoreEntries.length === 1 ? '—' : (ENGLISH_DOMAIN_LABELS[englishPerf.weakest_domain] || englishPerf.weakest_domain?.replace(/_/g, ' ')))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Attempted</span>
                      <span className="font-semibold">{englishPerf.total_questions_attempted || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {domainScoreEntries.length > 0 && (
                <Card className="border-2 border-stone-100 mb-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-stone-700">Domain Mastery from Diagnostic</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {domainScoreEntries.map(({ name, score }) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-xs text-stone-600 w-36 flex-shrink-0 truncate">{name}</span>
                        <Progress value={score} className="flex-1 h-2" />
                        <span className="text-xs text-stone-500 w-8 text-right">{score}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Diagnostic History */}
              {(() => {
                const diagSessions = completedSessions.filter(s => s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic' || s.session_type === 'supplemental_diagnostic');
                const profileDiagResults = userProfile?.english_performance;
                
                const hasLegacyDiag = profileDiagResults?.responses?.length > 0 && !diagSessions.some(s => s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic');

                if (diagSessions.length === 0 && !hasLegacyDiag) return null;

                const allDiagnostics = [
                  ...diagSessions.map(s => ({
                    id: s.id,
                    type: (s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic') ? 'Main Diagnostic' : `Supplemental Diagnostic (Level ${s.performance_summary?.supplemental_level || '?'})`,
                    date: s.end_time || s.start_time || s.created_date,
                    accuracy: s.performance_summary?.accuracy_percentage ?? Math.round((s.questions_correct/s.questions_attempted)*100),
                    responses: s.question_history || [],
                    isMain: (s.session_type === 'diagnostic' || s.session_type === 'english_diagnostic')
                  })),
                  ...(hasLegacyDiag ? [{
                    id: 'legacy_diag',
                    type: 'Main Diagnostic (Legacy)',
                    date: profileDiagResults.last_session_date,
                    accuracy: profileDiagResults.diagnostic_accuracy,
                    responses: profileDiagResults.responses || [],
                    isMain: true
                  }] : [])
                ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                return (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-stone-800">Diagnostic History</h3>
                    {allDiagnostics.map((diag, i) => {
                      const wrongCount = diag.responses.filter(r => !r.correct).length;
                      const struggledDomains = Array.from(new Set(
                        diag.responses.filter(r => !r.correct && r.domain).map(r => r.domain)
                      ));

                      return (
                        <Card key={diag.id || i} className={`border-2 ${diag.isMain ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}>
                          <CardHeader className="pb-2 flex flex-row items-start justify-between">
                            <div>
                              <CardTitle className={`text-sm font-semibold ${diag.isMain ? 'text-emerald-800' : 'text-stone-800'}`}>
                                {diag.type}
                                {diag.date && <span className="ml-2 text-xs font-normal text-stone-500">{new Date(diag.date).toLocaleDateString()}</span>}
                              </CardTitle>
                              <div className="flex items-center gap-4 mt-2">
                                <p className={`text-xs px-2 py-1 rounded ${diag.isMain ? 'text-emerald-700 bg-emerald-100' : 'text-stone-700 bg-stone-100'}`}>
                                  Accuracy: <strong>{diag.accuracy}%</strong>
                                </p>
                                <p className={`text-xs px-2 py-1 rounded ${diag.isMain ? 'text-emerald-700 bg-emerald-100' : 'text-stone-700 bg-stone-100'}`}>
                                  Incorrect: <strong>{wrongCount}</strong> / {diag.responses.length}
                                </p>
                              </div>
                            </div>
                            <DiagnosticResponsesModal 
                              responses={diag.responses}
                              title={`${studentName}'s SAT English ${diag.type}`}
                              studentName={studentName}
                              accuracy={diag.accuracy}
                            />
                          </CardHeader>
                          <CardContent>
                            {struggledDomains.length > 0 && (
                              <div className={`p-3 rounded-xl border ${diag.isMain ? 'bg-white border-emerald-100' : 'bg-white border-stone-100'}`}>
                                <p className={`text-xs font-semibold mb-2 ${diag.isMain ? 'text-emerald-800' : 'text-stone-800'}`}>Skills Struggled On:</p>
                                <div className="flex flex-wrap gap-2">
                                  {struggledDomains.map(d => (
                                    <span key={d} className="px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700 font-medium">
                                      {ENGLISH_DOMAIN_LABELS[d] || d.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}

            </>
          )}
        </>
      )}
    </div>
  );
}
