import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, ChevronRight, BarChart3, Calendar, HelpCircle, ClipboardList, Loader2 } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import IDKBadge from '@/components/sat/IDKBadge';
import { isIdkEntry, countIdk } from '@/utils/idk';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { answersEquivalent } from '@/utils/mathUtils';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SessionResultsModal({ session, studentName, assignmentName, trigger }) {
  const [open, setOpen] = useState(false);
  const [fullSession, setFullSession] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && (!session.question_history?.length || session.payload_too_large)) {
      const fetchSession = async () => {
        setLoading(true);
        try {
          let data;
          try {
            data = await base44.entities.PracticeSession.get(session.id);
          } catch {
            data = await base44.entities.EnglishPracticeSession.get(session.id);
          }
          setFullSession(data);
        } catch (e) {
          console.error('Failed to fetch full session', e);
        } finally {
          setLoading(false);
        }
      };
      fetchSession();
    }
  }, [open, session]);

  let activeSession = fullSession || session;
  
  const questionIds = activeSession.question_history?.map(q => q.question_id || q.id) || [];
  
  const { data: latestAnswers } = useQuery({
    queryKey: ['latestAnswers', questionIds],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestCorrectAnswers', { question_ids: questionIds });
      return res.data?.answers || {};
    },
    enabled: open && questionIds.length > 0
  });

  if (activeSession.question_history && latestAnswers) {
    let correctedCount = 0;
    const newHistory = activeSession.question_history.map(q => {
      const latestCorrect = latestAnswers[q.question_id || q.id];
      if (latestCorrect) {
        const isNowCorrect = answersEquivalent(q.user_answer, latestCorrect);
        if (isNowCorrect) correctedCount++;
        return { ...q, correct_answer: latestCorrect, correct: isNowCorrect };
      }
      if (q.correct) correctedCount++;
      return q;
    });
    activeSession = { ...activeSession, question_history: newHistory, questions_correct: correctedCount };
  }

  const acc = activeSession.questions_attempted > 0 ? Math.round((activeSession.questions_correct / activeSession.questions_attempted) * 100) : 0;
  
  let totalSeconds = activeSession.duration_minutes ? activeSession.duration_minutes * 60 : 0;
  if (!totalSeconds && activeSession.question_history?.length) {
    totalSeconds = activeSession.question_history.reduce((sum, q) => sum + (q.time_spent_seconds || 0), 0);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-stone-500 hover:text-stone-800">
            View Details <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-stone-50">
        <DialogHeader>
          <DialogTitle className="text-xl text-stone-800 flex items-center gap-2">
            {assignmentName ? `${assignmentName} — Results` : 'Practice Session Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-stone-800">{studentName}</h3>
              <div className="flex items-center gap-4 text-sm text-stone-600 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-medium capitalize">
                  {activeSession.assignment_id ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />Assignment ({activeSession.session_type})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-xs">
                      {activeSession.session_type}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 font-medium"><BarChart3 className="w-4 h-4 text-emerald-500" /> {acc}%</span>
                {countIdk(activeSession.question_history) > 0 && (
                  <span className="flex items-center gap-1 font-medium text-amber-600"><HelpCircle className="w-4 h-4" /> {countIdk(activeSession.question_history)} didn't know</span>
                )}
                <span className="flex items-center gap-1 font-medium"><Clock className="w-4 h-4 text-amber-500" /> {formatDuration(totalSeconds)}</span>
                {activeSession.created_date && (
                  <span className="flex items-center gap-1 font-medium"><Calendar className="w-4 h-4 text-blue-500" /> {format(new Date(activeSession.created_date), 'PPP')}</span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
             <div className="text-center py-8 text-stone-500 bg-white rounded-xl border border-stone-200 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                Loading detailed questions...
             </div>
          ) : !activeSession.question_history?.length ? (
            <div className="text-center py-8 text-stone-500 bg-white rounded-xl border border-stone-200">
              Detailed question history is not available for this session.
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-semibold text-stone-700">Question Breakdown</h4>
              {activeSession.question_history.map((q, idx) => {
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
