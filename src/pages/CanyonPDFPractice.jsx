import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MathText from '@/components/sat/MathText';
import MathKeyboard from '@/components/sat/MathKeyboard';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import QuestionTutor from '@/components/sat/QuestionTutor';
import { answersEquivalent } from '@/utils/mathUtils';

export default function CanyonPDFPractice() {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [tutorOpenFor, setTutorOpenFor] = useState(null);

  // Per-question active timing: only counts time while the student is
  // actively viewing a question, not wall-clock time from first page visit
  // (which inflates wildly if the student leaves the tab open for days).
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
    return Math.min(Math.round(ms / 1000), 600); // cap at 10 min/question
  };

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const results = await base44.entities.Assignment.filter({ id: assignmentId });
      return results[0];
    },
    enabled: !!assignmentId
  });

  const specificQuestionIds = assignment?.assignment_config?.specific_question_ids || [];

  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['canyonPdfQuestions', specificQuestionIds],
    queryFn: async () => {
      if (!specificQuestionIds.length) return [];
      
      const canyonPdfPromises = specificQuestionIds.map(id => base44.entities.CanyonMathPDFsandGuidance.filter({ id }));
      const canyonPdfRes = await Promise.all(canyonPdfPromises);
      let foundQuestions = canyonPdfRes.map(arr => arr[0]).filter(Boolean);
      
      const foundIds = new Set(foundQuestions.map(q => q.id));
      const missingIds = specificQuestionIds.filter(id => !foundIds.has(id));
      
      if (missingIds.length > 0) {
        const canyonPromises = missingIds.map(id => base44.entities.CanyonMath.filter({ id }));
        const canyonRes = await Promise.all(canyonPromises);
        const moreQuestions = canyonRes.map(arr => arr[0]).filter(Boolean).map(q => ({
          ...q,
          correct_answer: q.correct_answer || q.answer,
        }));
        foundQuestions = [...foundQuestions, ...moreQuestions];
      }
      
      const questionMap = {};
      foundQuestions.forEach(q => questionMap[q.id] = q);
      return specificQuestionIds.map(id => questionMap[id]).filter(Boolean);
    },
    enabled: specificQuestionIds.length > 0
  });

  const { data: progress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['assignmentProgress', assignmentId, user?.id],
    queryFn: async () => {
      const results = await base44.entities.StudentAssignmentProgress.filter({
        assignment_id: assignmentId,
        student_id: user.id
      });
      return results[0] || null;
    },
    enabled: !!assignmentId && !!user?.id
  });

  useEffect(() => {
    if (progress && progress.status === 'completed') {
      setSubmitted(true);
      
      const loadedAnswers = {};
      if (progress.question_history) {
        progress.question_history.forEach(q => {
          loadedAnswers[q.question_id || q.id] = q.user_answer;
        });
      }
      setAnswers(loadedAnswers);
      
      if (questions && questions.length > 0 && progress.question_history) {
        let correctCount = 0;
        questions.forEach(q => {
          const studentAns = (loadedAnswers[q.id]?.toString() || "").trim();
          const correctAns = (q.correct_answer?.toString() || "").trim();
          if (answersEquivalent(studentAns, correctAns)) correctCount++;
        });
        setScore(Math.round((correctCount / questions.length) * 100));
      } else {
        setScore(progress.score);
      }
    } else if (progress && progress.status === 'not_started' && user?.id) {
      base44.entities.StudentAssignmentProgress.update(progress.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      }).then(() => queryClient.invalidateQueries(['assignmentProgress', assignmentId, user.id]));
    } else if (progress === null && user?.id && assignment && !isLoadingProgress) {
      // Create progress record on the fly if it doesn't exist but they accessed the assignment
      base44.entities.StudentAssignmentProgress.create({
        assignment_id: assignmentId,
        student_id: user.id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }).then(() => queryClient.invalidateQueries(['assignmentProgress', assignmentId, user.id]));
    }
  }, [progress, queryClient, assignmentId, user?.id, assignment, isLoadingProgress]);

  // Start timing the first question once questions are loaded
  useEffect(() => {
    if (questions?.length > 0 && !submitted && activeIdx === null) {
      setActiveQuestion(0);
    }
  }, [questions?.length, submitted, activeIdx]);

  const submitMutation = useMutation({
    mutationFn: async (finalScore) => {
      const completedAt = new Date();
      finalizeTimings();

      const question_history = questions.map((q, qIdx) => {
          const studentAns = (answers[q.id]?.toString() || "").trim();
          const correctAns = (q.correct_answer?.toString() || "").trim();
          return {
             question_id: q.id,
             question_text: q.question_text,
             user_answer: answers[q.id] || "",
             correct_answer: q.correct_answer,
             correct: answersEquivalent(studentAns, correctAns),
             time_spent_seconds: getTimeForQuestion(qIdx),
             options: q.options || [],
             explanation: q.explanation || "",
             difficulty: q.difficulty || "medium"
          }
      });

      if (progress) {
        await base44.entities.StudentAssignmentProgress.update(progress.id, {
          status: 'completed',
          score: finalScore,
          progress_percentage: 100,
          completed_at: completedAt.toISOString(),
          question_history: question_history
        });
      } else {
        await base44.entities.StudentAssignmentProgress.create({
          assignment_id: assignmentId,
          student_id: user.id,
          status: 'completed',
          score: finalScore,
          progress_percentage: 100,
          completed_at: completedAt.toISOString(),
          started_at: completedAt.toISOString(),
          question_history: question_history
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assignmentProgress', assignmentId, user.id]);
    }
  });

  const handleAnswerChange = (questionId, value) => {
    if (submitted) return;
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx >= 0) setActiveQuestion(idx);
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach(q => {
      const studentAns = (answers[q.id]?.toString() || "").trim();
      const correctAns = (q.correct_answer?.toString() || "").trim();
      if (answersEquivalent(studentAns, correctAns)) correctCount++;
    });

    const finalScore = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    setScore(finalScore);
    setSubmitted(true);
    submitMutation.mutate(finalScore);
  };

  if (!assignmentId) return <div className="p-8 text-center text-stone-500">Assignment ID required</div>;
  if (isLoadingAssignment || isLoadingQuestions || isLoadingProgress || !user) return <div className="p-8 text-center text-stone-500">Loading assignment...</div>;
  if (!assignment) return <div className="p-8 text-center text-stone-500">Assignment not found.</div>;
  if (!questions || questions.length === 0) return <div className="p-8 text-center text-stone-500">No questions found for this assignment.</div>;

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="text-stone-500 rounded-full hover:bg-stone-100">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{assignment.title}</h1>
          <p className="text-stone-500 text-sm">CanyonMath PDF Practice • {questions.length} questions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm sticky top-20 z-10">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-stone-600">Progress</span>
          <span className="text-sm font-bold text-emerald-600">{submitted ? '100%' : `${progressPercent}%`}</span>
        </div>
        <Progress value={submitted ? 100 : progressPercent} className="h-2 mb-3" />
        <div className="flex justify-end">
          <CalculatorPanel tools={assignment.assignment_config?.tools_enabled} />
        </div>
      </div>

      {submitted && score !== null && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-emerald-500 bg-emerald-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-emerald-900 mb-1">Assignment Completed!</h2>
              <p className="text-emerald-700">You scored {score}%</p>
              <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-6">
      {questions.map((q, index) => {
        const hasOptions = Array.isArray(q.options) && q.options.length > 0 && q.options.some(opt => opt && (opt.label || typeof opt === 'string'));
        const isCorrect = submitted && answersEquivalent(answers[q.id]?.toString().trim(), q.correct_answer?.toString().trim());
        const isWrong = submitted && !isCorrect;

        return (
            <Card key={q.id} className={`border-2 transition-colors ${
              submitted ? (isCorrect ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50/30') 
                : answers[q.id] ? 'border-emerald-200' : 'border-stone-200'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="font-semibold text-stone-500">Question {index + 1}</h3>
                  {submitted && (
                    <div className="flex items-center gap-1 font-medium">
                      {isCorrect ? <><CheckCircle className="w-5 h-5 text-emerald-500" /><span className="text-emerald-600">Correct</span></>
                        : <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-600">Incorrect</span></>}
                    </div>
                  )}
                </div>
                
                <div className="prose prose-sm max-w-none text-stone-800 mb-6">
                  <MathText>{q.question_text}</MathText>
                </div>

                <div className="pl-4 border-l-2 border-stone-200">
                  {hasOptions ? (
                    <RadioGroup 
                      disabled={submitted}
                      value={answers[q.id] || ''} 
                      onValueChange={(val) => handleAnswerChange(q.id, val)}
                      className="space-y-3"
                    >
                      {q.options.map(opt => {
                        const isChosen = answers[q.id] === opt.label;
                        const isActualCorrect = submitted && answersEquivalent(opt.label, q.correct_answer);
                        
                        let optClass = "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ";
                        if (submitted) {
                          if (isActualCorrect) optClass += "bg-emerald-100 border-emerald-400";
                          else if (isChosen && isWrong) optClass += "bg-red-100 border-red-400";
                          else optClass += "bg-white border-stone-200 opacity-60";
                        } else {
                          optClass += isChosen ? "bg-emerald-50 border-emerald-300" : "bg-white border-stone-200 hover:border-emerald-200";
                        }

                        return (
                          <div key={opt.label}>
                            <RadioGroupItem value={opt.label} id={`${q.id}-${opt.label}`} className="sr-only" />
                            <Label htmlFor={`${q.id}-${opt.label}`} className={optClass}>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium ${
                                submitted 
                                  ? (isActualCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : (isChosen && isWrong ? 'bg-red-500 border-red-500 text-white' : 'border-stone-300 text-stone-500'))
                                  : (isChosen ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 text-stone-500')
                              }`}>
                                {opt.label}
                              </div>
                              <span className="text-sm flex-1"><MathText>{opt.text}</MathText></span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <div>
                      <Input
                        disabled={submitted}
                        placeholder="Type your answer here..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className={`max-w-xs ${submitted ? (isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50') : ''}`}
                      />
                      {!submitted && (
                        <MathKeyboard onInsert={(val) => handleAnswerChange(q.id, (answers[q.id] || '') + val)} />
                      )}
                      {submitted && !isCorrect && (
                        <p className="text-sm text-red-600 mt-2 font-medium">Correct answer: {q.correct_answer}</p>
                      )}
                    </div>
                  )}
                </div>

                {submitted && q.explanation && assignment.assignment_config?.tools_enabled?.explanations !== false && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-2">
                      Explanation
                    </h4>
                    <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap"><MathText>{q.explanation}</MathText></div>
                  </motion.div>
                )}

                {submitted && assignment.assignment_config?.tools_enabled?.ai_tutor !== false && (
                  <div className="mt-4">
                    {tutorOpenFor !== q.id ? (
                      <button
                        onClick={() => setTutorOpenFor(q.id)}
                        className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          !isCorrect
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        🤖 {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                      </button>
                    ) : (
                      <QuestionTutor
                        question={{
                          question_text: q.question_text,
                          correct_answer: q.correct_answer,
                          explanation: q.explanation,
                          domain: q.category || 'math',
                          difficulty: q.difficulty || 'medium',
                          options: q.options,
                        }}
                        userAnswer={answers[q.id] || ''}
                        isCorrect={isCorrect}
                        onClose={() => setTutorOpenFor(null)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!submitted && (
        <div className="flex justify-end pt-6 pb-12">
          <Button 
            onClick={handleSubmit} 
            disabled={answeredCount < questions.length || submitMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold px-8 py-6 text-lg"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'} <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
