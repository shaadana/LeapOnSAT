import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, CheckCircle, XCircle, ChevronRight, User, HelpCircle } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import IDKBadge from '@/components/sat/IDKBadge';
import { isIdkEntry, countIdk } from '@/utils/idk';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { answersEquivalent } from '@/utils/mathUtils';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AssignmentResultsModal({ assignment, progressList, students: externalStudents }) {
  const [open, setOpen] = useState(false);
  const [selectedStudentProg, setSelectedStudentProg] = useState(null);
  const { user } = useAuth();
  const isTeacher = user?.user_type === 'teacher';
  const targetStudentId = externalStudents?.[0]?.user?.id || externalStudents?.[0]?.id || user?.id;

  // Self-sufficient: fetch students for this assignment's class when modal opens
  const { data: fetchedStudents } = useQuery({
    queryKey: ['assignmentStudents', assignment.class_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getClassStudents', { class_id: assignment.class_id });
      return res.data?.students || [];
    },
    enabled: open && !!assignment.class_id && isTeacher,
  });

  // Self-sufficient: fetch progress for this assignment when modal opens
  const { data: fetchedProgress } = useQuery({
    queryKey: ['assignmentProgressDirect', assignment.id, isTeacher ? 'all' : targetStudentId],
    queryFn: () => base44.entities.StudentAssignmentProgress.filter(isTeacher ? { assignment_id: assignment.id } : { assignment_id: assignment.id, student_id: targetStudentId }, '-created_date', 500),
    enabled: open && !!targetStudentId && !!assignment.id,
  });

  // Fetch related PracticeSession data for this assignment (for full question details)
  const { data: relatedSessions } = useQuery({
    queryKey: ['assignmentSessions', assignment.id, isTeacher ? 'all' : targetStudentId],
    queryFn: () => base44.entities.PracticeSession.filter(isTeacher ? { assignment_id: assignment.id } : { assignment_id: assignment.id, user_id: targetStudentId }, '-created_date', 500),
    enabled: open && !!targetStudentId && !!assignment.id,
  });

  const { data: relatedEngSessions } = useQuery({
    queryKey: ['assignmentEngSessions', assignment.id, isTeacher ? 'all' : targetStudentId],
    queryFn: () => base44.entities.EnglishPracticeSession.filter(isTeacher ? { assignment_id: assignment.id } : { assignment_id: assignment.id, user_id: targetStudentId }, '-created_date', 500),
    enabled: open && !!targetStudentId && !!assignment.id,
  });

  const students = fetchedStudents?.length ? fetchedStudents : (externalStudents || []);
  const relevantProgress = fetchedProgress || progressList?.filter(p => p.assignment_id === assignment.id) || [];
  
  // Build a map of student_id -> session question_history for fallback
  const sessionsByStudent = {};
  const allQuestionIds = new Set();
  
  [...(relatedSessions || []), ...(relatedEngSessions || [])].forEach(s => {
    if (s.user_id && s.question_history?.length > 0) {
      sessionsByStudent[s.user_id] = s;
      s.question_history.forEach(q => allQuestionIds.add(q.question_id || q.id));
    }
  });
  
  relevantProgress.forEach(p => {
    if (p.question_history?.length > 0) {
      p.question_history.forEach(q => allQuestionIds.add(q.question_id || q.id));
    }
  });

  const { data: latestAnswers } = useQuery({
    queryKey: ['latestAnswers', Array.from(allQuestionIds)],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestCorrectAnswers', { question_ids: Array.from(allQuestionIds) });
      return res.data?.answers || {};
    },
    enabled: open && allQuestionIds.size > 0
  });
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setSelectedStudentProg(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
          <BarChart3 className="w-4 h-4" /> Results
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-stone-50">
        <DialogHeader>
          <DialogTitle className="text-xl text-stone-800 flex items-center gap-2">
            {assignment.title} Results
          </DialogTitle>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {!selectedStudentProg ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 mt-4"
            >
              {relevantProgress.length === 0 && (
                <div className="text-center py-8 text-stone-500">No students have started this assignment yet.</div>
              )}
              {relevantProgress.map(p => {
                const student = students.find(s => s.user?.id === p.student_id || s.id === p.student_id);
                const sName = student?.user?.name || student?.user?.full_name || student?.user?.email || student?.name || student?.full_name || student?.email || 'Unknown Student';
                const isComplete = p.status === 'completed';
                
                // Use session data as fallback for question_history
                const sessionFallback = sessionsByStudent[p.student_id];
                let effectiveQuestionHistory = p.question_history?.length > 0 ? p.question_history : sessionFallback?.question_history;
                
                // Live regrade using latest database correct answers
                if (effectiveQuestionHistory && latestAnswers) {
                  effectiveQuestionHistory = effectiveQuestionHistory.map(q => {
                    const latestCorrect = latestAnswers[q.question_id || q.id];
                    if (latestCorrect) {
                      const isNowCorrect = answersEquivalent(q.user_answer, latestCorrect);
                      return { ...q, correct_answer: latestCorrect, correct: isNowCorrect };
                    }
                    return q;
                  });
                }

                let totalSeconds = 0;
                if (p.started_at && p.completed_at) {
                  totalSeconds = (new Date(p.completed_at) - new Date(p.started_at)) / 1000;
                } else if (sessionFallback?.duration_minutes) {
                  totalSeconds = sessionFallback.duration_minutes * 60;
                } else if (effectiveQuestionHistory?.length) {
                  totalSeconds = effectiveQuestionHistory.reduce((sum, q) => sum + (q.time_spent_seconds || 0), 0);
                }

                const avgPerQ = effectiveQuestionHistory?.length > 0
                  ? Math.round(effectiveQuestionHistory.reduce((s, q) => s + (q.time_spent_seconds || 0), 0) / effectiveQuestionHistory.length)
                  : null;

                // Compute score from multiple sources
                let displayScore = p.score;
                if (displayScore == null && effectiveQuestionHistory?.length > 0) {
                  const correct = effectiveQuestionHistory.filter(q => q.correct).length;
                  displayScore = Math.round((correct / effectiveQuestionHistory.length) * 100);
                }
                if (displayScore == null && sessionFallback?.questions_attempted > 0) {
                  displayScore = Math.round(((sessionFallback.questions_correct || 0) / sessionFallback.questions_attempted) * 100);
                }

                const hasViewableData = effectiveQuestionHistory?.length > 0;

                return (
                  <div key={p.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-800">{sName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            isComplete ? 'bg-emerald-100 text-emerald-700' : p.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {p.status.replace('_', ' ')}
                          </span>
                          {(isComplete || totalSeconds > 0) && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(totalSeconds)}</span>
                          )}
                          {avgPerQ !== null && (
                            <span className="text-stone-500">{avgPerQ}s avg/Q</span>
                          )}
                          {displayScore != null && <span>Score: <strong className="text-stone-700">{displayScore}%</strong></span>}
                          {!isComplete && effectiveQuestionHistory?.length > 0 && (
                            <span className="text-stone-400">{effectiveQuestionHistory.length} Q answered</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasViewableData && (
                      <Button 
                        variant="ghost" 
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setSelectedStudentProg({ ...p, sName, totalSeconds, score: displayScore, question_history: effectiveQuestionHistory || p.question_history })}
                      >
                        View Details <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }}
              className="mt-2 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-800">{selectedStudentProg.sName}</h3>
                  <div className="flex items-center gap-4 text-sm text-stone-600 mt-1">
                    <span className="flex items-center gap-1 font-medium"><BarChart3 className="w-4 h-4 text-emerald-500" /> {selectedStudentProg.score}%</span>
                    {countIdk(selectedStudentProg.question_history) > 0 && (
                      <span className="flex items-center gap-1 font-medium text-amber-600"><HelpCircle className="w-4 h-4" /> {countIdk(selectedStudentProg.question_history)} didn't know</span>
                    )}
                    <span className="flex items-center gap-1 font-medium"><Clock className="w-4 h-4 text-amber-500" /> {formatDuration(selectedStudentProg.totalSeconds)}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedStudentProg(null)}>
                  Back to List
                </Button>
              </div>

              {!selectedStudentProg.question_history?.length ? (
                <div className="text-center py-8 text-stone-500 bg-white rounded-xl border border-stone-200">
                  Detailed question history is not available for this submission.
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold text-stone-700">Question Breakdown</h4>
                  {selectedStudentProg.question_history.map((q, idx) => {
                    const idk = isIdkEntry(q);
                    return (
                    <div key={idx} className={`p-5 rounded-xl border ${q.correct ? 'border-emerald-200 bg-emerald-50/30' : idk ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/30'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-700">Question {idx + 1}</span>
                          {q.correct ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : idk ? <IDKBadge /> : <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.round(q.time_spent_seconds || 0)}s
                        </div>
                      </div>
                      
                      <div className="prose prose-sm max-w-none mb-4 text-stone-800">
                        <MathText>{q.question_text || "(No text)"}</MathText>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="flex flex-col gap-2 mb-4 pl-4 border-l-2 border-stone-200">
                          {q.options.map((opt, oIdx) => {
                            const label = opt.label || opt.id || String.fromCharCode(65 + oIdx);
                            const text = opt.text || opt.value || opt;
                            return (
                              <div key={oIdx} className="text-sm text-stone-700 flex gap-2">
                                <span className="font-semibold">{label})</span>
                                <MathText>{text}</MathText>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 bg-white/50 p-3 rounded-lg border border-stone-200/60 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-stone-500 w-24">Student Ans:</span>
                          <span className={`font-semibold ${q.correct ? 'text-emerald-700' : idk ? 'text-amber-700' : 'text-red-600'}`}>
                            {idk ? "I Don't Know" : <MathText>{q.user_answer || '(No answer)'}</MathText>}
                          </span>
                        </div>
                        {!q.correct && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-stone-500 w-24">Correct Ans:</span>
                            <span className="font-semibold text-emerald-700">
                              <MathText>{q.correct_answer || '(Not provided)'}</MathText>
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-900">
                          <span className="font-semibold block mb-1">Explanation:</span>
                          <MathText>{q.explanation}</MathText>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
