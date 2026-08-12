import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import MathText from '@/components/sat/MathText';
import MathKeyboard from '@/components/sat/MathKeyboard';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import QuestionTutor from '@/components/sat/QuestionTutor';
import { answersEquivalent } from '@/utils/mathUtils';
import { useAuth } from '@/lib/AuthContext';

export default function AutoExtractPractice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('assignmentId');

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tutorOpenFor, setTutorOpenFor] = useState(null);

  // Per-question timing: { [idx]: { startedAt, accumulatedMs } }
  const questionTimings = useRef({});
  const [activeIdx, setActiveIdx] = useState(null);

  const setActiveQuestion = (idx) => {
    setActiveIdx((prevActive) => {
      if (prevActive === idx) return prevActive;
      const now = Date.now();
      if (prevActive !== null && questionTimings.current[prevActive]?.startedAt) {
        const prev = questionTimings.current[prevActive];
        prev.accumulatedMs += now - prev.startedAt;
        prev.startedAt = null;
      }
      if (idx !== null) {
        if (!questionTimings.current[idx]) {
          questionTimings.current[idx] = { startedAt: now, accumulatedMs: 0 };
        } else {
          questionTimings.current[idx].startedAt = now;
        }
      }
      return idx;
    });
  };

  const finalizeTimings = () => {
    const now = Date.now();
    Object.values(questionTimings.current).forEach((t) => {
      if (t.startedAt) {
        t.accumulatedMs += now - t.startedAt;
        t.startedAt = null;
      }
    });
  };

  const getTimeForQuestion = (idx) => {
    const t = questionTimings.current[idx];
    if (!t) return 0;
    let ms = t.accumulatedMs;
    if (t.startedAt && activeIdx === idx) ms += Date.now() - t.startedAt;
    return Math.round(ms / 1000);
  };

  const { data: assignment, isLoading: isLoadingAssig } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => base44.entities.Assignment.get(assignmentId),
    enabled: !!assignmentId,
  });

  const { data: progress, isLoading: isLoadingProg } = useQuery({
    queryKey: ['progress', assignmentId, user?.id],
    queryFn: async () => {
      const res = await base44.entities.StudentAssignmentProgress.filter({
        assignment_id: assignmentId,
        student_id: user?.id
      });
      return res[0] || null;
    },
    enabled: !!assignmentId && !!user?.id,
  });

  useEffect(() => {
    if (progress && progress.status === 'not_started' && user?.id) {
      base44.entities.StudentAssignmentProgress.update(progress.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      }).then(() => queryClient.invalidateQueries({ queryKey: ['progress', assignmentId, user?.id] }));
    }
  }, [progress, queryClient, assignmentId, user?.id]);

  const questions = assignment?.assignment_config?.extracted_questions || [];
  const tools = assignment?.assignment_config?.tools_enabled || {};
  const isCompleted = submitted || progress?.status === 'completed';

  // Start timing the first question once questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !isCompleted && activeIdx === null) {
      setActiveQuestion(0);
    }
  }, [questions.length, isCompleted, activeIdx]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      finalizeTimings();
      const correctCount = Object.keys(answers).filter(qIdx => {
          const q = questions[qIdx];
          return answersEquivalent((answers[qIdx] || "").toString(), (q.correct_answer || "").toString());
      }).length;
      const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

      const completedAt = new Date();

      const question_history = questions.map((q, qIdx) => {
          const userAns = (answers[qIdx] || "").toString();
          const correctAns = (q.correct_answer || "").toString();
          return {
             question_text: q.question_text ? String(q.question_text) : "",
             user_answer: answers[qIdx] ? String(answers[qIdx]) : "",
             correct_answer: q.correct_answer ? String(q.correct_answer) : "",
             correct: answersEquivalent(userAns, correctAns),
             time_spent_seconds: getTimeForQuestion(qIdx),
             options: Array.isArray(q.options) ? q.options : [],
             explanation: q.explanation ? String(q.explanation) : ""
          }
      });

      const progressData = {
          assignment_id: assignmentId,
          student_id: user.id,
          status: 'completed',
          progress_percentage: 100,
          completed_at: completedAt.toISOString(),
          score: score,
          question_history: question_history
      };

      if (!progress) {
          await base44.entities.StudentAssignmentProgress.create({
            ...progressData,
            started_at: completedAt.toISOString()
          });
      } else {
          await base44.entities.StudentAssignmentProgress.update(progress.id, progressData);
      }
    },
    onSuccess: () => {
      toast.success("Assignment submitted!");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['progress', assignmentId, user?.id] });
    },
    onError: (err) => {
      toast.error("Failed to submit assignment: " + err.message);
    }
  });

  if (isLoadingAssig || isLoadingProg) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-stone-700">Assignment not found</h2>
        <Button className="mt-4" onClick={() => navigate(createPageUrl('Dashboard'))}>Go Back</Button>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-stone-700">You do not have access to this assignment</h2>
        <p className="text-stone-500 mt-2">This assignment was not assigned to you.</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl('Dashboard'))}>Go Back</Button>
      </div>
    );
  }

  if (questions.length === 0) {
      return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-stone-700">No questions were extracted for this assignment.</h2>
            <Button className="mt-4" onClick={() => navigate(createPageUrl('Dashboard'))}>Go Back</Button>
          </div>
      );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== "").length;
  const progressPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(createPageUrl('Dashboard'))} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-bold text-stone-900">{assignment.title}</h1>
              <p className="text-stone-600 mt-1">{assignment.description}</p>
          </div>
          {isCompleted && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Completed
                  {progress?.score !== undefined && ` (Score: ${progress.score}/${questions.length})`}
              </div>
          )}
      </div>

      {/* Sticky progress + resources bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm sticky top-20 z-10">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-stone-600">Progress</span>
          <span className="text-sm font-bold text-emerald-600">{isCompleted ? '100%' : `${progressPercent}%`}</span>
        </div>
        <Progress value={isCompleted ? 100 : progressPercent} className="h-2 mb-3" />
        <div className="flex justify-end">
          <CalculatorPanel tools={tools} />
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
            const userAnswer = answers[idx] || "";
            const isCorrect = answersEquivalent(userAnswer.toString(), (q.correct_answer || "").toString());
            const showResult = isCompleted;
            const showExplanation = showResult && tools.explanations !== false;
            const showTutor = showResult && tools.ai_tutor !== false;

            return (
                <Card
                  key={idx}
                  onClick={() => !isCompleted && setActiveQuestion(idx)}
                  className={`border-2 ${showResult ? '' : 'cursor-pointer'} ${
                    showResult
                      ? (isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30')
                      : (activeIdx === idx ? 'border-emerald-300' : 'border-stone-200')
                  }`}
                >
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-lg text-stone-800 leading-relaxed font-medium">
                                {idx + 1}. <MathText>{q.question_text}</MathText>
                            </CardTitle>
                            {showResult && (
                                <div className="flex-shrink-0 mt-1">
                                    {isCorrect ? (
                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {q.options && q.options.length > 0 ? (
                            <RadioGroup
                                value={userAnswer || ""}
                                onValueChange={(val) => {
                                  if (isCompleted) return;
                                  setActiveQuestion(idx);
                                  setAnswers(prev => ({...prev, [idx]: val}));
                                }}
                                className="space-y-3"
                            >
                                {q.options.map((opt, oIdx) => {
                                    const optLabel = opt.label || String.fromCharCode(65 + oIdx);
                                    const isSelected = userAnswer === optLabel;
                                    const isActualCorrect = q.correct_answer === optLabel;
                                    
                                    let itemClass = "flex items-center space-x-3 p-3 rounded-lg border transition-all ";
                                    
                                    if (showResult) {
                                        if (isActualCorrect) {
                                            itemClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
                                        } else if (isSelected && !isActualCorrect) {
                                            itemClass += "border-red-500 bg-red-50 text-red-900";
                                        } else {
                                            itemClass += "border-stone-200 opacity-50";
                                        }
                                    } else {
                                        itemClass += isSelected ? "border-emerald-500 bg-emerald-50" : "border-stone-200 hover:bg-stone-50 cursor-pointer";
                                    }

                                    return (
                                        <div key={oIdx} className={itemClass} onClick={() => {
                                            if (isCompleted) return;
                                            setActiveQuestion(idx);
                                            setAnswers(prev => ({...prev, [idx]: optLabel}));
                                        }}>
                                            <RadioGroupItem value={optLabel} id={`q${idx}-opt${oIdx}`} className={showResult ? "opacity-50" : ""} />
                                            <Label htmlFor={`q${idx}-opt${oIdx}`} className="flex-1 cursor-pointer text-base">
                                                <span className="font-semibold mr-2">{optLabel}.</span>
                                                <MathText>{opt.text}</MathText>
                                            </Label>
                                        </div>
                                    );
                                })}
                            </RadioGroup>
                        ) : (
                            <div className="mt-2" onClick={() => !isCompleted && setActiveQuestion(idx)}>
                                <Input
                                    disabled={isCompleted}
                                    placeholder="Type your answer here..."
                                    value={userAnswer || ''}
                                    onFocus={() => !isCompleted && setActiveQuestion(idx)}
                                    onChange={(e) => {
                                      if (isCompleted) return;
                                      setActiveQuestion(idx);
                                      setAnswers(prev => ({...prev, [idx]: e.target.value}));
                                    }}
                                    className={`max-w-xs ${isCompleted ? (isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50') : ''}`}
                                />
                                {!isCompleted && (
                                  <MathKeyboard onInsert={(val) => setAnswers(prev => ({...prev, [idx]: (prev[idx] || '') + val}))} />
                                )}
                                {isCompleted && !isCorrect && (
                                    <p className="text-sm text-red-600 mt-2 font-medium">
                                        Correct answer: {q.correct_answer}
                                    </p>
                                )}
                            </div>
                        )}

                        {showExplanation && q.explanation && (
                            <div className="mt-4 p-4 bg-white rounded-lg border border-stone-200 text-sm text-stone-700">
                                <span className="font-semibold block mb-1">Explanation:</span>
                                <MathText>{q.explanation}</MathText>
                            </div>
                        )}

                        {showTutor && (
                          <div className="mt-4">
                            {tutorOpenFor !== idx ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setTutorOpenFor(idx); }}
                                className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  !isCorrect
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                🤖 {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                              </button>
                            ) : (
                              <div onClick={(e) => e.stopPropagation()}>
                                <QuestionTutor
                                  question={{
                                    question_text: q.question_text,
                                    correct_answer: q.correct_answer,
                                    explanation: q.explanation,
                                    domain: q.category || 'general',
                                    difficulty: q.difficulty || 'medium',
                                    options: q.options,
                                  }}
                                  userAnswer={userAnswer || ''}
                                  isCorrect={isCorrect}
                                  onClose={() => setTutorOpenFor(null)}
                                />
                              </div>
                            )}
                          </div>
                        )}
                    </CardContent>
                </Card>
            );
        })}
      </div>

      {!isCompleted && (
          <div className="flex justify-end pt-6 pb-12">
              <Button 
                onClick={() => submitMutation.mutate()} 
                disabled={submitMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-6 rounded-full text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                  {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Submit Answers <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
          </div>
      )}
    </div>
  );
}
