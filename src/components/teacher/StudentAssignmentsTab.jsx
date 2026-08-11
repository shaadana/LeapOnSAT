import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, ChevronRight, ChevronLeft, ClipboardList, HelpCircle, Target } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import IDKBadge from '@/components/sat/IDKBadge';
import { isIdkEntry, countIdk } from '@/utils/idk';
import { answersEquivalent } from '@/utils/mathUtils';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function StudentAssignmentsTab({ studentId, studentName }) {
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Fetch all assignments for classes the student belongs to
  const { data: allAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['studentAllAssignments', studentId],
    queryFn: () => base44.entities.Assignment.list('-created_date', 500),
    enabled: !!studentId,
  });

  // Fetch student's assignment progress
  const { data: progressList = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['studentAssignmentProgress', studentId],
    queryFn: () => base44.entities.StudentAssignmentProgress.filter({ student_id: studentId }, '-created_date', 500),
    enabled: !!studentId,
  });

  // Fetch PracticeSessions with assignment_id for this student
  const { data: mathSessions = [] } = useQuery({
    queryKey: ['studentAssignmentMathSessions', studentId],
    queryFn: async () => {
      const all = await base44.entities.PracticeSession.filter({ user_id: studentId }, '-created_date', 500);
      return all.filter(s => s.assignment_id);
    },
    enabled: !!studentId,
  });

  const { data: engSessions = [] } = useQuery({
    queryKey: ['studentAssignmentEngSessions', studentId],
    queryFn: async () => {
      const all = await base44.entities.EnglishPracticeSession.filter({ user_id: studentId }, '-created_date', 500);
      return all.filter(s => s.assignment_id);
    },
    enabled: !!studentId,
  });

  const isLoading = loadingAssignments || loadingProgress;

  // Build assignment → progress + session map
  const progressMap = {};
  progressList.forEach(p => { progressMap[p.assignment_id] = p; });

  const sessionMap = {};
  [...mathSessions, ...engSessions].forEach(s => {
    if (s.assignment_id) sessionMap[s.assignment_id] = s;
  });

  // Collect all assignment IDs that appear in either progress OR sessions
  const allRelevantAssignmentIds = new Set([
    ...Object.keys(progressMap),
    ...Object.keys(sessionMap),
  ]);

  const allQuestionIds = new Set();
  progressList.forEach(p => (p.question_history || []).forEach(q => allQuestionIds.add(q.question_id || q.id)));
  mathSessions.forEach(s => (s.question_history || []).forEach(q => allQuestionIds.add(q.question_id || q.id)));
  engSessions.forEach(s => (s.question_history || []).forEach(q => allQuestionIds.add(q.question_id || q.id)));

  const { data: latestAnswers } = useQuery({
    queryKey: ['latestAnswers', Array.from(allQuestionIds)],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestCorrectAnswers', { question_ids: Array.from(allQuestionIds) });
      return res.data?.answers || {};
    },
    enabled: allQuestionIds.size > 0
  });

  // Show assignments the student has progress OR sessions for
  const studentAssignments = allAssignments
    .filter(a => allRelevantAssignmentIds.has(a.id))
    .map(a => {
      const prog = progressMap[a.id];
      const session = sessionMap[a.id];
      let questionHistory = prog?.question_history?.length > 0 
        ? prog.question_history 
        : session?.question_history || [];
      
      if (latestAnswers) {
        questionHistory = questionHistory.map(q => {
          const latestCorrect = latestAnswers[q.question_id || q.id];
          if (latestCorrect) {
            const isNowCorrect = answersEquivalent(q.user_answer, latestCorrect);
            return { ...q, correct_answer: latestCorrect, correct: isNowCorrect };
          }
          return q;
        });
      }
      
      let totalSeconds = 0;
      // Prefer per-question active time (capped at 10 min/q) over wall-clock,
      // which inflates when students leave the tab open between sessions.
      if (prog?.started_at && prog?.completed_at && questionHistory.length) {
        const wallSecs = (new Date(prog.completed_at) - new Date(prog.started_at)) / 1000;
        const perQ = wallSecs / questionHistory.length;
        totalSeconds = Math.min(perQ, 900) * questionHistory.length;
      } else if (questionHistory.length) {
        totalSeconds = questionHistory.reduce((sum, q) => sum + Math.min(q.time_spent_seconds || 0, 900), 0);
      } else if (session?.duration_minutes) {
        totalSeconds = Math.min(session.duration_minutes, 180) * 60;
      } else if (prog?.started_at && prog?.completed_at) {
        totalSeconds = Math.min((new Date(prog.completed_at) - new Date(prog.started_at)) / 1000, 180 * 60);
      }

      // Compute accuracy from question history first, then session counts, then progress.score
      let correct = questionHistory.filter(q => q.correct).length;
      let total = questionHistory.length;
      let accuracy;
      if (total > 0) {
        accuracy = Math.round((correct / total) * 100);
      } else if (session?.questions_attempted > 0) {
        correct = session.questions_correct || 0;
        total = session.questions_attempted;
        accuracy = Math.round((correct / total) * 100);
      } else {
        accuracy = prog?.score ?? null;
      }
      const idkCount = countIdk(questionHistory);

      // Synthesize a progress-like object for session-only assignments
      const effectiveProgress = prog || {
        assignment_id: a.id,
        student_id: studentId,
        status: session?.status === 'completed' ? 'completed' : session?.status === 'in_progress' ? 'in_progress' : 'not_started',
        completed_at: session?.end_time,
        started_at: session?.start_time,
      };

      return { ...a, progress: effectiveProgress, questionHistory, totalSeconds, accuracy, correct, total, idkCount };
    });

  const completedAssignments = studentAssignments.filter(a => a.progress.status === 'completed');
  const activeAssignments = studentAssignments.filter(a => a.progress.status !== 'completed');

  if (isLoading) {
    return <div className="text-center py-8 text-stone-500">Loading assignments...</div>;
  }

  // Detail view for a selected assignment
  if (selectedAssignment) {
    const a = selectedAssignment;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-800">{a.title}</h3>
            <div className="flex items-center gap-4 text-sm text-stone-600 mt-1 flex-wrap">
              {a.accuracy != null && (
                <span className="flex items-center gap-1 font-medium">
                  <Target className="w-4 h-4 text-emerald-500" /> {a.accuracy}%
                </span>
              )}
              {a.idkCount > 0 && (
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <HelpCircle className="w-4 h-4" /> {a.idkCount} didn't know
                </span>
              )}
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-4 h-4 text-stone-500" /> {formatDuration(a.totalSeconds)}
              </span>
              <span className="text-stone-400">{a.correct}/{a.total} correct</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedAssignment(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        {a.questionHistory.length === 0 ? (
          <div className="text-center py-8 text-stone-500 bg-white rounded-xl border border-stone-200">
            Detailed question history is not available for this assignment.
          </div>
        ) : (
          <div className="space-y-3">
            {a.questionHistory.map((q, idx) => {
              const idk = isIdkEntry(q);
              return (
                <div key={idx} className={`p-4 rounded-xl border ${q.correct ? 'border-emerald-200 bg-emerald-50/30' : idk ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/30'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-700 text-sm">Q{idx + 1}</span>
                      {q.correct ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : idk ? <IDKBadge /> : <XCircle className="w-4 h-4 text-red-500" />}
                      {q.domain && (
                        <Badge variant="outline" className="text-[10px]">{q.domain.replace(/_/g, ' ')}</Badge>
                      )}
                      {q.difficulty && (
                        <Badge className={`text-[10px] shadow-none ${
                          q.difficulty === 'expert' ? 'bg-stone-700 text-white' :
                          q.difficulty === 'hard' ? 'bg-stone-400 text-white' :
                          q.difficulty === 'medium' ? 'bg-stone-200 text-stone-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>{q.difficulty}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {Math.round(q.time_spent_seconds || 0)}s
                    </span>
                  </div>
                  
                  <div className="text-sm text-stone-800 mb-3">
                    <MathText>{q.question_text || "(No text)"}</MathText>
                  </div>

                  {q.options?.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                      {q.options.map((opt, j) => {
                        const label = opt.label || opt[0];
                        const text = opt.text || (typeof opt === 'string' ? opt.slice(3) : '');
                        const isCorrectOpt = label === q.correct_answer;
                        const isStudentPick = !idk && (q.user_answer === opt || q.user_answer?.[0] === label);
                        return (
                          <div key={j} className={`px-2 py-1.5 rounded-lg border ${
                            isCorrectOpt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                            isStudentPick && !q.correct ? 'border-red-300 bg-red-50 text-red-800' :
                            'border-stone-100 bg-stone-50 text-stone-500'
                          }`}>
                            <span className="font-bold mr-1">{label}.</span> {text}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!q.correct && (
                    <div className="flex flex-col gap-1 text-xs p-2 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-stone-600 w-24">Student:</span>
                        <span className="text-red-600">
                          {idk ? <IDKBadge /> : <MathText>{q.user_answer || 'No answer'}</MathText>}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-stone-600 w-24">Correct:</span>
                        <span className="text-emerald-600"><MathText>{q.correct_answer}</MathText></span>
                      </div>
                    </div>
                  )}
                  
                  {q.explanation && (
                    <details className="text-xs mt-2">
                      <summary className="cursor-pointer text-stone-500 hover:text-stone-700 font-medium">
                        Show Explanation
                      </summary>
                      <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-100 text-stone-700 leading-relaxed">
                        <MathText>{q.explanation}</MathText>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      {studentAssignments.length === 0 ? (
        <div className="text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
          <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500 text-sm">No assignments found for {studentName}</p>
        </div>
      ) : (
        <>
          {/* Active / In-Progress */}
          {activeAssignments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                In Progress ({activeAssignments.length})
              </h4>
              <div className="space-y-2">
                {activeAssignments.map(a => (
                  <Card key={a.id} className={`border-2 border-amber-100 bg-amber-50/30 ${a.questionHistory.length > 0 ? 'hover:shadow-md cursor-pointer' : ''}`} onClick={a.questionHistory.length > 0 ? () => setSelectedAssignment(a) : undefined}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800">{a.title}</p>
                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] shadow-none">
                            {a.progress.status.replace('_', ' ')}
                          </Badge>
                          <span>{a.assignment_type?.replace(/_/g, ' ')}</span>
                          {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                          {a.accuracy != null && <span className="font-semibold text-amber-700">{a.accuracy}%</span>}
                          {a.total > 0 && <span>{a.correct}/{a.total} answered</span>}
                          {a.totalSeconds > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(a.totalSeconds)}</span>}
                        </div>
                        {a.progress.progress_percentage > 0 && (
                          <Progress value={a.progress.progress_percentage} className="h-1.5 mt-2 w-48" />
                        )}
                      </div>
                      {a.questionHistory.length > 0 && <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Completed ({completedAssignments.length})
            </h4>
            {completedAssignments.length === 0 ? (
              <p className="text-sm text-stone-400">No completed assignments yet.</p>
            ) : (
              <div className="space-y-2">
                {completedAssignments.map(a => (
                  <Card key={a.id} className="border-2 border-emerald-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAssignment(a)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800">{a.title}</p>
                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shadow-none">completed</Badge>
                          <span>{a.assignment_type?.replace(/_/g, ' ')}</span>
                          {a.accuracy != null && <span className="font-semibold text-emerald-700">{a.accuracy}%</span>}
                          {a.total > 0 && <span>{a.correct}/{a.total} correct</span>}
                          {a.idkCount > 0 && (
                            <span className="text-amber-600 flex items-center gap-0.5">
                              <HelpCircle className="w-3 h-3" /> {a.idkCount} IDK
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(a.totalSeconds)}</span>
                          {a.progress.completed_at && (
                            <span>{new Date(a.progress.completed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400 flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
