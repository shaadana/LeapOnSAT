import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Clock, Target, Award, Zap, BookOpen, Brain, Network, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SAT_GRAPH_NODES } from '@/data/satKnowledgeGraph';
import MathText from '@/components/sat/MathText';
import SessionResultsModal from './SessionResultsModal';
import DiagnosticResponseList from './DiagnosticResponseList';
import DiagnosticResponsesModal from './DiagnosticResponsesModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DOMAIN_LABELS = {
  algebra: 'Algebra',
  advanced_algebra: 'Adv. Algebra',
  geometry: 'Geometry',
  trigonometry: 'Trig',
  statistics: 'Statistics',
  problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems',
  quadratics: 'Quadratics',
  exponentials: 'Exponentials',
  ratios_proportions: 'Ratios',
  circles: 'Circles',
  polynomials: 'Polynomials'
};

const MASTERY_COLORS = {
  not_started: 'bg-stone-200 text-stone-600',
  learning: 'bg-amber-100 text-amber-700',
  practiced: 'bg-emerald-100 text-emerald-700',
  mastered: 'bg-emerald-500 text-white',
};

export default function StudentPerformance({ studentId, studentName }) {
  const [activeTab, setActiveTab] = useState('practice');
  const [sortOrder, setSortOrder] = useState('newest');

  const { data: sessions = [], isLoading: loadingMath } = useQuery({
    queryKey: ['studentSessions', studentId],
    queryFn: () => base44.entities.PracticeSession.filter({ user_id: studentId }, '-created_date', 500),
    enabled: !!studentId,
  });

  const isLoading = loadingMath;

  const { data: profiles = [] } = useQuery({
    queryKey: ['studentUserProfile', studentId],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: studentId }),
    enabled: !!studentId,
  });

  const { data: satNodes = [] } = useQuery({
    queryKey: ['studentSATNodes', studentId],
    queryFn: () => base44.entities.ConceptNode.filter({ user_id: studentId, study_plan_title: 'SAT Math Practice' }, null, 500),
    enabled: !!studentId,
  });

  const { data: assignmentProgresses = [] } = useQuery({
    queryKey: ['studentAssignmentProgress', studentId],
    queryFn: () => base44.entities.StudentAssignmentProgress.filter({ student_id: studentId, status: 'completed' }, '-created_date', 500),
    enabled: !!studentId,
  });

  // Collect unique assignment IDs from sessions to fetch their names
  const sessionAssignmentIds = [...new Set(
    [...sessions]
      .map(s => s.assignment_id)
      .filter(Boolean)
  )];
  const progressAssignmentIds = assignmentProgresses.map(p => p.assignment_id);
  const allAssignmentIds = [...new Set([...sessionAssignmentIds, ...progressAssignmentIds])];

  const { data: assignments = [] } = useQuery({
    queryKey: ['studentAssignments', allAssignmentIds.join(',')],
    queryFn: async () => {
      if (allAssignmentIds.length === 0) return [];
      // Fetch all assignments and filter locally — more reliable than per-ID queries
      const all = await base44.entities.Assignment.list('-created_date', 500);
      return all.filter(a => allAssignmentIds.includes(a.id));
    },
    enabled: allAssignmentIds.length > 0,
  });

  // Build assignment name lookup
  const assignmentMap = {};
  assignments.forEach(a => { assignmentMap[a.id] = a.title; });

  const userProfile = profiles[0];

  const completedSessions = [...sessions.filter(s => s.status === 'completed')];
  const existingSessionAssignmentIds = new Set(completedSessions.map(s => s.assignment_id).filter(Boolean));

  assignmentProgresses.forEach(prog => {
    // Avoid duplicate if this assignment already created a PracticeSession
    if (existingSessionAssignmentIds.has(prog.assignment_id)) return;
    
    const assign = assignments.find(a => a.id === prog.assignment_id);
    if (!assign) return;

    // Filter to Math subject assignments
    const isMath = 
      assign.assignment_type === 'sat_practice' || 
      assign.assignment_type === 'diagnostic' || 
      assign.assignment_type === 'supplemental_diagnostic' ||
      ((assign.assignment_type === 'canyon_pdf' || assign.assignment_type === 'auto_extract' || assign.assignment_type === 'document_markup') && assign.assignment_config?.subject !== 'english');

    if (!isMath) return;
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
        avg_time_per_question: avg_time,
        supplemental_level: assign.assignment_config?.supplemental_level
      }
    });
  });

  if (isLoading) {
    return <div className="text-center py-8 text-stone-500">Loading performance data...</div>;
  }

  const totalCorrect = completedSessions.reduce((s, sess) => s + (sess.questions_correct || 0), 0);
  const totalAttempted = completedSessions.reduce((s, sess) => s + (sess.questions_attempted || 0), 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;
  const avgTimePerQ = completedSessions.reduce((s, sess) => {
    return s + (sess.performance_summary?.avg_time_per_question || 0);
  }, 0) / (completedSessions.length || 1);

  const domainStats = {};
  completedSessions.forEach(sess => {
    let history = sess.question_history || [];
    if (!history.length && sess.session_type === 'diagnostic' && userProfile?.sat_performance?.responses) {
      history = userProfile.sat_performance.responses;
    }
    if (!history.length && sess.session_type === 'supplemental_diagnostic' && userProfile?.sat_performance?.supplemental_results?.responses) {
      history = userProfile.sat_performance.supplemental_results.responses;
    }

    history.forEach(q => {
      if (!q.domain) return;
      if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 };
      domainStats[q.domain].total++;
      if (q.correct) domainStats[q.domain].correct++;
    });
  });

  const domainChartData = Object.entries(domainStats)
    .filter(([, s]) => s.total >= 1)
    .map(([domain, s]) => ({
      name: DOMAIN_LABELS[domain] || domain,
      accuracy: Math.round((s.correct / s.total) * 100),
      total: s.total
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const sortedSessions = [...completedSessions].sort((a, b) => {
    const dateA = new Date(a.created_date || a.end_time || a.start_time || 0);
    const dateB = new Date(b.created_date || b.end_time || b.start_time || 0);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
  const recentSessions = sortedSessions.slice(0, 10);

  // Compute true domain scores from diagnostic responses if available
  const DOMAIN_TO_BROAD = {
    algebra: 'algebra',
    systems_of_equations: 'algebra',
    advanced_algebra: 'advanced_algebra',
    quadratics: 'advanced_algebra',
    exponentials: 'advanced_algebra',
    polynomials: 'advanced_algebra',
    geometry: 'geometry',
    circles: 'geometry',
    trigonometry: 'trigonometry',
    statistics: 'statistics',
    problem_solving: 'problem_solving',
    ratios_proportions: 'problem_solving',
    foundations: 'foundations'
  };

  const computedDomainScores = { ...(userProfile?.sat_performance?.domain_scores || {}) };
  const latestDiagSession = completedSessions.find(s => s.session_type === 'diagnostic');
  const diagResponses = latestDiagSession?.question_history?.length > 0 
    ? latestDiagSession.question_history 
    : (userProfile?.sat_performance?.responses || []);

  if (diagResponses.length > 0) {
    const dCounts = {};
    diagResponses.forEach(r => {
      if (!r.domain) return;
      const broad = DOMAIN_TO_BROAD[r.domain] || r.domain;
      if (!dCounts[broad]) dCounts[broad] = { correct: 0, total: 0 };
      dCounts[broad].total++;
      if (r.correct) dCounts[broad].correct++;
    });
    Object.keys(dCounts).forEach(d => {
      computedDomainScores[d] = Math.round((dCounts[d].correct / dCounts[d].total) * 100);
    });
  }

  const SCORE_TO_MASTERY = (score) => {
    if (score >= 85) return 'mastered';
    if (score >= 65) return 'practiced';
    // If evaluated at all (even 0%), it's 'learning'
    return 'learning';
  };

  // Merge static graph with ConceptNode entities and computed scores
  const safeSatGraphNodes = Array.isArray(SAT_GRAPH_NODES) ? SAT_GRAPH_NODES : [];
  
  const mergedSatNodes = safeSatGraphNodes.map(staticNode => {
    const fetchedNode = satNodes.find(n => n.node_id === staticNode.id || n.title === staticNode.title);
    let mastery = 'not_started';
    let quiz_score = undefined;

    if (fetchedNode && fetchedNode.mastery_level) {
      mastery = fetchedNode.mastery_level;
      quiz_score = fetchedNode.quiz_score;
    } else {
      // Fallback: match broad domain
      const broadDomain = staticNode.domain.toLowerCase().replace(/ /g, '_');
      let score = computedDomainScores[broadDomain];
      
      // Fallback for foundations if it doesn't exist but algebra does
      if (score === undefined && broadDomain === 'foundations') {
        score = computedDomainScores['algebra'];
      }
      
      if (score !== undefined) {
        mastery = SCORE_TO_MASTERY(score);
      }
    }

    return {
      ...staticNode,
      id: fetchedNode ? fetchedNode.id : staticNode.id,
      mastery_level: mastery,
      quiz_score
    };
  });

  // Filter to only show nodes that the student has actually been tested on / has mastery data for.
  // This prevents the graph from being flooded with 128 "Not Started" topics if they haven't taken a diagnostic.
  const activeNodes = diagResponses.length > 0 
    ? mergedSatNodes 
    : mergedSatNodes.filter(n => n.mastery_level !== 'not_started');
  
  // SAT Diagnostic (knowledge graph nodes)
  const masteredNodes = activeNodes.filter(n => n.mastery_level === 'mastered');
  const weakNodes = activeNodes.filter(n => ['learning', 'not_started'].includes(n.mastery_level || 'not_started'));

  // EF Profile
  const ef = userProfile?.executive_functioning || {};
  const efEntries = Object.entries(ef).filter(([k]) => typeof ef[k] === 'number');
  const efLow = efEntries.filter(([, v]) => v < 10).map(([k]) => k.replace(/_/g, ' '));
  const efHigh = efEntries.filter(([, v]) => v >= 14).map(([k]) => k.replace(/_/g, ' '));

  // Mindset
  const mindset = userProfile?.mindset_appraisal || {};
  const motivation = userProfile?.motivation_assessment || {};

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        {[
          { key: 'practice', label: 'SAT Practice', icon: Target },
          { key: 'diagnostic', label: 'SAT Diagnostic', icon: Network },
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
              <Target className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-500 text-sm">No practice sessions yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-700">{overallAccuracy != null ? `${overallAccuracy}%` : '—'}</p><p className="text-xs text-stone-600 mt-0.5">Accuracy</p></CardContent></Card>
                <Card className="bg-stone-50 border-stone-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-stone-700">{completedSessions.length}</p><p className="text-xs text-stone-600 mt-0.5">Sessions</p></CardContent></Card>
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-700">{totalCorrect}</p><p className="text-xs text-stone-600 mt-0.5">Correct</p></CardContent></Card>
                <Card className="bg-stone-50 border-stone-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-stone-700">{Math.round(avgTimePerQ)}s</p><p className="text-xs text-stone-600 mt-0.5">Avg/Q</p></CardContent></Card>
              </div>
              {domainChartData.length > 0 && (
                <Card className="border-2 border-stone-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" />Accuracy by Domain</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={domainChartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                          {domainChartData.map((e, i) => <Cell key={i} fill={e.accuracy >= 70 ? '#10b981' : e.accuracy >= 50 ? '#f59e0b' : '#ef4444'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card className="border-2 border-stone-100">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-600" />Recent Sessions</CardTitle>
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
                    const acc = sess.questions_attempted > 0 ? Math.round((sess.questions_correct / sess.questions_attempted) * 100) : 0;
                    const isAssignment = !!sess.assignment_id;
                    return (
                      <div key={sess.id} className={`flex items-center gap-3 p-2 rounded-lg border ${isAssignment ? 'bg-blue-50/50 border-blue-200' : 'bg-stone-50 border-stone-100'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isAssignment ? 'bg-blue-100' :
                          sess.session_type === 'blitz' ? 'bg-emerald-100' : 'bg-stone-200'
                        }`}>
                          {isAssignment ? <ClipboardList className="w-3.5 h-3.5 text-blue-600" /> :
                           sess.session_type === 'blitz' ? <Zap className="w-3.5 h-3.5 text-emerald-600" /> : <BookOpen className="w-3.5 h-3.5 text-stone-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
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
                            <span className="text-xs font-bold text-emerald-700">{acc}%</span>
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
                              <button className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
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

      {/* ── DIAGNOSTIC / KNOWLEDGE GRAPH TAB ── */}
      {activeTab === 'diagnostic' && (
        <>
          {!(completedSessions.some(s => s.session_type === 'diagnostic') || userProfile?.sat_performance?.responses?.length > 0) ? (
            <div className="text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
              <Network className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-500 text-sm font-semibold">No diagnostic completed yet!</p>
              <p className="text-xs text-stone-400 mt-1">{studentName} hasn't completed an SAT Math diagnostic</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-700">{masteredNodes.length}</p><p className="text-xs text-stone-600 mt-0.5">Mastered</p></CardContent></Card>
                <Card className="bg-stone-50 border-stone-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-stone-700">{activeNodes.length}</p><p className="text-xs text-stone-600 mt-0.5">Total Topics</p></CardContent></Card>
                <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-amber-700">{weakNodes.length}</p><p className="text-xs text-stone-600 mt-0.5">Need Work</p></CardContent></Card>
                {(() => {
                  const latestDiagSession = completedSessions.find(s => s.session_type === 'diagnostic');
                  const diagAcc = latestDiagSession
                    ? (latestDiagSession.performance_summary?.accuracy_percentage ?? Math.round((latestDiagSession.questions_correct/latestDiagSession.questions_attempted)*100))
                    : userProfile?.sat_performance?.diagnostic_accuracy;
                  
                  return diagAcc != null ? (
                    <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-amber-700">{diagAcc}%</p><p className="text-xs text-stone-600 mt-0.5">Diagnostic Score</p></CardContent></Card>
                  ) : (
                    <Card className="bg-stone-50 border-stone-200"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-stone-700">—</p><p className="text-xs text-stone-600 mt-0.5">Diagnostic Score</p></CardContent></Card>
                  );
                })()}
              </div>
              <Card className="border-2 border-stone-100">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-stone-700">Knowledge Graph — SAT Math</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {activeNodes.map(node => {
                    const mastery = node.mastery_level || 'not_started';
                    return (
                      <div key={node.id} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 bg-stone-50">
                        <span className="text-lg">{node.emoji || '📚'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-stone-800">{node.title}</p>
                          {node.quiz_score !== undefined && (
                            <Progress value={(node.quiz_score / 3) * 100} className="h-1 mt-1" />
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MASTERY_COLORS[mastery]}`}>
                          {mastery.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              {weakNodes.length > 0 && (
                <Card className="border-2 border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-amber-800">Recommended Focus Areas</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {weakNodes.map(n => (
                        <span key={n.id} className="px-2 py-1 bg-white border border-amber-200 rounded-full text-xs text-amber-800 font-medium">
                          {n.emoji} {n.title}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Diagnostic History */}
              {(() => {
                const diagSessions = completedSessions.filter(s => s.session_type === 'diagnostic' || s.session_type === 'supplemental_diagnostic');
                const profileDiagResults = userProfile?.sat_performance;
                const profileSuppResults = userProfile?.sat_performance?.supplemental_results;
                
                const hasLegacyDiag = profileDiagResults?.responses?.length > 0 && !diagSessions.some(s => s.session_type === 'diagnostic');
                const hasLegacySupp = profileSuppResults?.responses?.length > 0 && !diagSessions.some(s => s.session_type === 'supplemental_diagnostic');

                if (diagSessions.length === 0 && !hasLegacyDiag && !hasLegacySupp) return null;

                const allDiagnostics = [
                  ...diagSessions.map(s => ({
                    id: s.id,
                    type: s.session_type === 'diagnostic' ? 'Main Diagnostic' : `Supplemental Diagnostic (Level ${s.performance_summary?.supplemental_level || '?'})`,
                    date: s.end_time || s.start_time || s.created_date,
                    accuracy: s.performance_summary?.accuracy_percentage ?? Math.round((s.questions_correct/s.questions_attempted)*100),
                    responses: s.question_history || [],
                    isMain: s.session_type === 'diagnostic'
                  })),
                  ...(hasLegacyDiag ? [{
                    id: 'legacy_diag',
                    type: 'Main Diagnostic',
                    date: profileDiagResults.last_diagnostic_date,
                    accuracy: profileDiagResults.diagnostic_accuracy,
                    responses: profileDiagResults.responses || [],
                    isMain: true
                  }] : []),
                  ...(hasLegacySupp ? [{
                    id: 'legacy_supp',
                    type: `Supplemental Diagnostic (Level ${profileSuppResults.level || '?'})`,
                    date: null,
                    accuracy: profileSuppResults.accuracy,
                    responses: profileSuppResults.responses || [],
                    isMain: false
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
                              title={`${studentName}'s ${diag.type}`}
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
                                      {DOMAIN_LABELS[d] || d.replace(/_/g, ' ')}
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
