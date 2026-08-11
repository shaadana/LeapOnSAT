import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Clock, ChevronRight, CheckCircle, XCircle, Lightbulb, Award,
  RotateCcw, BookOpen, Sparkles, Loader2, History, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from '@/components/sat/MathText';
import ExplanationText from '@/components/sat/ExplanationText';
import QuestionTutor from '@/components/sat/QuestionTutor';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import MathKeyboard from '@/components/sat/MathKeyboard';
import { answersEquivalent } from '@/utils/mathUtils';

import { awardForSession } from '@/utils/gamification';
import SessionRewardModal from '@/components/gamification/SessionRewardModal';
import { recalculateKnowledgeGraph } from '@/utils/satMasterySync';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';

const SESSION_SOURCES = [
  { id: 'real', label: 'Real PYQs', description: 'Questions from actual September, October, November & May 2025 Digital SAT exams', emoji: '📋', color: 'emerald' },
  { id: 'replica', label: 'SAT-Style Questions', description: 'High-quality SAT-style questions modelled on real exam difficulty and format', emoji: '🎯', color: 'stone' },
];

const SOURCE_TAG = 'PYQ';

export default function PYQSession({ user, onBack }) {
  const [mode, setMode] = useState(null); // 'real' | 'mimic'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionReward, setSessionReward] = useState(null);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const startSession = async (selectedMode) => {
    setMode(selectedMode);
    setLoading(true);
    try {
      let qs = [];
      if (selectedMode === 'real') {
        // Real PYQs: source starts with "PYQ-" (e.g., PYQ-June2025). Fetch a
        // large batch so replicas can't crowd them out of the result window.
        const dbQs = await base44.entities.PYQQuestion.list('-created_date', 500);
        const realQs = (dbQs || []).filter(q =>
          typeof q.source === 'string' && q.source.startsWith('PYQ-')
        );
        qs = realQs.sort(() => Math.random() - 0.5).slice(0, 15);
      } else {
        // SAT-style replicas: tagged 'replica'
        const dbQs = await base44.entities.PYQQuestion.list('-created_date', 500);
        const replicaQs = (dbQs || []).filter(q => q.tags && q.tags.includes('replica'));
        qs = replicaQs.sort(() => Math.random() - 0.5).slice(0, 15);
      }
      if (qs.length === 0) {
        setLoading(false);
        return;
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setHistory([]);
      setSelectedAnswers([]);
      setShowExplanation(false);
      setIsAnswered(false);
      setTimer(0);
      setIsTimerRunning(true);
      setSessionComplete(false);

      const created = await base44.entities.PracticeSession.create({
        user_id: user.id,
        session_type: 'choice',
        status: 'in_progress',
        start_time: new Date().toISOString(),
        questions_attempted: 0,
        questions_correct: 0,
        domains_covered: [],
        question_history: []
      });
      setSession(created);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0) return;
    const q = questions[currentIndex];
    const correctList = q.correct_answer.split(',').map(a => a.trim());
    const userList = [...selectedAnswers].map(a => String(a).trim());
    const hasOptions = q.options && q.options.length > 0;
    let isCorrect;
    if (hasOptions) {
      // Multiple choice — compare letter labels case-insensitively
      const c = correctList.map(a => a.toUpperCase()).sort();
      const u = userList.map(a => a.toUpperCase()).sort();
      isCorrect = c.join(',') === u.join(',');
    } else {
      // Free response — accept fraction<->decimal equivalents
      isCorrect =
        correctList.length === userList.length &&
        correctList.every(c => userList.some(u => answersEquivalent(u, c)));
    }
    const user_ans = userList.sort();
    setHistory(prev => [...prev, {
      question_id: q.id,
      user_answer: user_ans.join(','),
      correct: isCorrect,
      time_spent_seconds: timer,
      domain: q.domain,
      difficulty: q.difficulty,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }]);
    setIsAnswered(true);
    setShowExplanation(true);
    setIsTimerRunning(false);
  };

  const handleNext = async () => {
    setShowTutor(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswers([]);
      setShowExplanation(false);
      setIsAnswered(false);
      setTimer(0);
      setIsTimerRunning(true);
    } else {
      // End session
      const correct = history.filter(h => h.correct).length + (history.length < questions.length ? 0 : 0);
      const finalHistory = [...history];
      const attempted = finalHistory.length;
      if (session) {
        await base44.entities.PracticeSession.update(session.id, {
          status: 'completed',
          end_time: new Date().toISOString(),
          questions_attempted: attempted,
          questions_correct: finalHistory.filter(h => h.correct).length,
          question_history: finalHistory,
          duration_minutes: Math.max(1, Math.round(finalHistory.reduce((s, h) => s + h.time_spent_seconds, 0) / 60)),
          domains_covered: [...new Set(finalHistory.map(h => h.domain))]
        });
      }

      // Sync Knowledge Graph
      if (user?.id) {
        try {
          await recalculateKnowledgeGraph(user.id, base44);
        } catch (e) {
          console.error("Failed to sync mastery", e);
        }
      }

      // Award gamification rewards — EF-customized
      if (user?.id) {
        try {
          const profileRecords = await base44.entities.UserProfile.filter({ user_id: user.id });
          const ef = profileRecords?.[0]?.executive_functioning || null;
          const reward = await awardForSession(user.id, {
            questions_correct: finalHistory.filter(h => h.correct).length,
            questions_attempted: attempted,
            current_difficulty: 'hard', // PYQs are typically harder
          }, ef);
          if (reward) setSessionReward(reward);
        } catch (e) { /* non-critical */ }
      }
      setIsTimerRunning(false);
      setSessionComplete(true);
    }
  };





  // Mode selection screen
  if (!mode && !loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-sm text-stone-400 hover:text-stone-600 underline">← Back</button>
        </div>
        <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <History className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Righteous, sans-serif' }}>Previous Years' Questions</h1>
              <p className="text-white/80 text-sm">Practice with real Digital SAT 2025 questions or AI-generated exam-style questions</p>
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Choose your session type</p>
        <div className="grid md:grid-cols-2 gap-4">
          {SESSION_SOURCES.map(src => (
            <motion.div key={src.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Card
                className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all h-full rounded-3xl"
                onClick={() => startSession(src.id)}
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg text-2xl ${src.color === 'emerald' ? 'bg-emerald-500' : 'bg-stone-600'}`}>
                    {src.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{src.label}</h3>
                    <p className="text-sm text-gray-500">{src.description}</p>
                    {src.id === 'real' && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {['Sep 2025','Oct 2025','Nov 2025','May 2025'].map(tag => (
                          <span key={tag} className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-stone-600 font-medium">{mode === 'mimic' ? 'Generating exam-style questions…' : 'Loading past year questions…'}</p>
      </div>
    );
  }

  if (sessionComplete) {
    const correct = history.filter(h => h.correct).length;
    const total = history.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
          <Award className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Righteous, sans-serif' }}>PYQ Session Complete!</h1>
        <p className="text-gray-600 mb-8">You practiced with {mode === 'real' ? 'real past year questions' : 'exam-style questions'}.</p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-emerald-50 border-2 border-emerald-200"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-emerald-800">{correct}/{total}</p><p className="text-sm text-gray-600">Correct</p></CardContent></Card>
          <Card className="bg-stone-50 border-2 border-stone-200"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-800">{accuracy}%</p><p className="text-sm text-gray-600">Accuracy</p></CardContent></Card>
          <Card className="bg-emerald-50 border-2 border-emerald-200"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-emerald-800">{Math.round(history.reduce((s, h) => s + h.time_spent_seconds, 0) / (total || 1))}s</p><p className="text-sm text-gray-600">Avg Time</p></CardContent></Card>
        </div>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => { setMode(null); setSessionComplete(false); setHistory([]); }} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <RotateCcw className="w-4 h-4 mr-2" />New PYQ Session
          </Button>
          <Button variant="outline" onClick={onBack} className="border-stone-300 text-stone-700 hover:bg-stone-50">
            Back to Practice
          </Button>
        </div>
        {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
      </motion.div>
    );
  }

  if (questions.length === 0) return null;

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const correctAnswers = (question.correct_answer || '').split(',').map(a => a.trim().toUpperCase());
  const isMultiSelect = correctAnswers.length > 1;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
            {mode === 'real' ? '📋 Real PYQ' : '🎯 SAT-Style'}
          </Badge>
          {question.source && mode === 'real' && (
            <Badge variant="outline" className="text-xs text-stone-400">{question.source.replace('PYQ-', '')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <CalculatorPanel />
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(timer)}</span>
          </div>
          <span className="text-sm text-gray-500">{currentIndex + 1} / {questions.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-2 mb-6 bg-gray-100" />

      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-xs capitalize">{(question.domain || '').replace(/_/g, ' ')}</Badge>
                <Badge variant="outline" className={`text-xs ${question.difficulty === 'easy' ? 'border-emerald-300 text-emerald-600' : question.difficulty === 'medium' ? 'border-stone-300 text-stone-600' : 'border-stone-600 text-stone-800'}`}>
                  {question.difficulty}
                </Badge>
                <div className="ml-auto flex items-center gap-1">
                </div>
              </div>

              <div className="text-lg text-gray-800 mb-6 leading-relaxed whitespace-pre-line">
                <MathText>{question.question_text}</MathText>
              </div>

              {Array.isArray(question.options) && question.options.length > 0 && question.options.some(opt => opt && (opt.label || typeof opt === 'string')) ? (
                <>
                  {isMultiSelect && !isAnswered && (
                    <p className="text-xs text-emerald-700 font-medium mb-2">Select all that apply ({correctAnswers.length} correct)</p>
                  )}
                  <div className="space-y-3">
                    {question.options.map(opt => {
                      const isSelected = selectedAnswers.includes(opt.label);
                      const isCorrectOpt = correctAnswers.includes(opt.label);
                      let cls = 'border-gray-200';
                      if (isAnswered) {
                        if (isCorrectOpt) cls = 'border-emerald-500 bg-emerald-50';
                        else if (isSelected) cls = 'border-red-500 bg-red-50';
                      } else if (isSelected) cls = 'border-emerald-400 bg-emerald-50/60';

                      return (
                        <div
                          key={opt.label}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${cls} ${!isAnswered ? 'hover:border-emerald-300 hover:bg-emerald-50/40' : ''}`}
                          onClick={() => {
                            if (isAnswered) return;
                            if (isMultiSelect) setSelectedAnswers(p => p.includes(opt.label) ? p.filter(a => a !== opt.label) : [...p, opt.label]);
                            else setSelectedAnswers([opt.label]);
                          }}
                        >
                          <div className={`w-7 h-7 ${isMultiSelect ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${isAnswered && isCorrectOpt ? 'bg-emerald-500 border-emerald-500 text-white' : isAnswered && isSelected ? 'bg-red-500 border-red-500 text-white' : isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-gray-500'}`}>
                            {opt.label}
                          </div>
                          <div className="text-gray-700 flex-1 text-sm leading-relaxed"><MathText>{opt.text}</MathText></div>
                          {isAnswered && isCorrectOpt && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                          {isAnswered && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div>
                  <Input
                    type="text"
                    value={selectedAnswers[0] || ''}
                    onChange={e => setSelectedAnswers(e.target.value ? [e.target.value] : [])}
                    disabled={isAnswered}
                    placeholder="Enter your answer..."
                    className="text-lg p-4 border-2"
                  />
                  {!isAnswered && (
                    <MathKeyboard onInsert={(val) => setSelectedAnswers([(selectedAnswers[0] || '') + val])} />
                  )}
                  {isAnswered && (
                    <div className={`mt-3 flex items-center gap-2 ${answersEquivalent(selectedAnswers[0] || '', question.correct_answer) ? 'text-emerald-600' : 'text-red-600'}`}>
                      {answersEquivalent(selectedAnswers[0] || '', question.correct_answer) ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span className="text-sm">Correct answer: {question.correct_answer}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {showExplanation && (() => {
            const hasOptions = question.options && question.options.length > 0;
            let isCorrect;
            if (hasOptions) {
              isCorrect = correctAnswers.join(',') === [...selectedAnswers].map(a => String(a).toUpperCase()).sort().join(',');
            } else {
              const correctList = (question.correct_answer || '').split(',').map(a => a.trim());
              const userList = [...selectedAnswers].map(a => String(a).trim());
              isCorrect = correctList.length === userList.length &&
                correctList.every(c => userList.some(u => answersEquivalent(u, c)));
            }
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border-2 mb-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-300'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className={`w-5 h-5 ${isCorrect ? 'text-emerald-700' : 'text-stone-600'}`} />
                      <h3 className={`font-semibold text-sm ${isCorrect ? 'text-emerald-900' : 'text-stone-800'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Not quite — here\'s the solution:'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-emerald-200 mb-3">
                      <span className="text-xs font-semibold text-emerald-600">Answer:</span>
                      <span className="font-bold text-emerald-700">{question.correct_answer}</span>
                    </div>
                    {question.explanation ? (
                      <ExplanationText isCorrect={isCorrect}>{question.explanation}</ExplanationText>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No explanation available.</p>
                    )}
                  </CardContent>
                </Card>

                {!showTutor ? (
                  <button onClick={() => setShowTutor(true)} className={`w-full mb-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${!isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'}`}>
                    🤖 {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this'}
                  </button>
                ) : (
                  <QuestionTutor question={question} userAnswer={selectedAnswers[0] || ''} isCorrect={isCorrect} onClose={() => setShowTutor(false)} />
                )}
              </motion.div>
            );
          })()}

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-100">
            <div className="flex-1">
              <ReportQuestionModal 
                question={question} 
                source={question.source || question.source_pdf}
                triggerElement={
                  <button className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Report Faulty Question
                  </button>
                }
              />
            </div>
            <div className="flex justify-end gap-3">
              {!isAnswered ? (
                <Button onClick={handleSubmit} disabled={selectedAnswers.length === 0} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
