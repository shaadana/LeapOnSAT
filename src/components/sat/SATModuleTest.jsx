import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SAT_QUESTIONS as RAW_SAT_QUESTIONS } from '@/data/satQuestions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { sanitizeMathInput } from '@/utils/mathUtils';
import {
  Clock, CheckCircle, XCircle, Lightbulb, ChevronRight,
  Award, RotateCcw, TrendingUp, TrendingDown, Minus, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalculatorPanel from './CalculatorPanel';
import QuestionTutor from './QuestionTutor';
import MathText from './MathText';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';

// ─── Config ────────────────────────────────────────────────────────────────
const MODULE_1_COUNT = 22;
const MODULE_2_COUNT = 22;
const HARD_THRESHOLD = 0.60; // ≥60% on M1 → hard M2

// Module 1: balanced easy/medium mix (like real SAT)
const M1_DIFFICULTY_MIX = { easy: 8, medium: 10, hard: 4 };
// Module 2 hard: mostly hard/expert
const M2_HARD_MIX = { easy: 2, medium: 6, hard: 10, expert: 4 };
// Module 2 standard: easy/medium
const M2_STANDARD_MIX = { easy: 8, medium: 10, hard: 4 };

const DOMAIN_LABELS = {
  algebra: 'Algebra', advanced_algebra: 'Advanced Algebra',
  geometry: 'Geometry', trigonometry: 'Trigonometry',
  statistics: 'Statistics', problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems of Equations', quadratics: 'Quadratics',
  exponentials: 'Exponentials', ratios_proportions: 'Ratios & Proportions',
  circles: 'Circles', polynomials: 'Polynomials',
};

const ALL_QUESTIONS = RAW_SAT_QUESTIONS.map(q => ({
  id: `sat_${q.id}`,
  question_text: q.question,
  domain: q.domain,
  difficulty: q.difficulty,
  options: q.options ? q.options.map(opt => {
    const match = opt.match(/^([A-D])[).]\s*(.+)$/);
    if (match) return { label: match[1], text: match[2].trim() };
    return { label: opt[0], text: opt.slice(3).trim() };
  }) : null,
  correct_answer: q.correct,
  explanation: q.explanation,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────
function pickQuestions(mix, exclude = new Set()) {
  const result = [];
  for (const [diff, count] of Object.entries(mix)) {
    const pool = ALL_QUESTIONS.filter(q => q.difficulty === diff && !exclude.has(q.id));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    result.push(...shuffled.slice(0, count));
    shuffled.slice(0, count).forEach(q => exclude.add(q.id));
  }
  // Shuffle final list so difficulty isn't grouped
  return result.sort(() => Math.random() - 0.5);
}

function normalizeAnswer(a) {
  return String(a).toLowerCase().trim().replace(/\s+/g, '').replace(/[xy]=/g, '').replace(/=/g, '');
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── Subcomponents ─────────────────────────────────────────────────────────
function QuestionView({ question, index, total, selectedAnswer, setSelectedAnswer, isAnswered, onSubmit, onNext, isLast, timer }) {
  const isCorrect = isAnswered && normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correct_answer);
  const [showTutor, setShowTutor] = useState(false);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">Question {index + 1} of {total}</span>
        <div className="flex items-center gap-3">
          <CalculatorPanel />
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(timer)}</span>
          </div>
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="h-1.5 mb-6 bg-gray-100" />

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {/* Badges */}
          <div className="flex gap-2 mb-4 items-center">
            <Badge variant="outline" className="text-xs">{DOMAIN_LABELS[question.domain] || question.domain}</Badge>
            <Badge variant="outline" className={`text-xs ${
              question.difficulty === 'easy' ? 'border-emerald-300 text-emerald-600' :
              question.difficulty === 'medium' ? 'border-stone-300 text-stone-600' :
              question.difficulty === 'hard' ? 'border-stone-500 text-stone-700' :
              'border-red-300 text-red-600'
            }`}>{question.difficulty}</Badge>
            <div className="ml-auto flex items-center gap-1">
              <ReportQuestionModal question={question} source={question.source || question.source_pdf} />
            </div>
          </div>

          {/* Question */}
          <Card className="bg-white border-2 border-emerald-100 shadow mb-4">
            <CardContent className="p-6">
              <div className="text-lg text-gray-800 leading-relaxed mb-6"><MathText>{question.question_text}</MathText></div>

              {question.options ? (
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={isAnswered} className="space-y-3">
                  {question.options.map(option => {
                    const isOpt = selectedAnswer === option.label;
                    const optCorrect = option.label === question.correct_answer;
                    let cls = 'border-gray-200';
                    if (isAnswered) {
                      if (optCorrect) cls = 'border-emerald-500 bg-emerald-50';
                      else if (isOpt) cls = 'border-red-500 bg-red-50';
                    }
                    return (
                      <div
                        key={option.label}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${cls} ${!isAnswered ? 'hover:border-emerald-300 hover:bg-emerald-50/40' : ''}`}
                        onClick={() => !isAnswered && setSelectedAnswer(option.label)}
                      >
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                          isAnswered && optCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                          isAnswered && isOpt && !optCorrect ? 'bg-red-500 border-red-500 text-white' :
                          isOpt ? 'bg-emerald-500 border-emerald-500 text-white' :
                          'border-gray-300 text-gray-500'
                        }`}>{option.label}</div>
                        <RadioGroupItem value={option.label} id={`opt-${option.label}`} className="sr-only" />
                        <Label htmlFor={`opt-${option.label}`} className="text-gray-700 cursor-pointer flex-1 leading-relaxed"><MathText>{option.text}</MathText></Label>
                        {isAnswered && optCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                        {isAnswered && isOpt && !optCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </RadioGroup>
              ) : (
                <div>
                  <Input
                    value={selectedAnswer}
                    onChange={e => setSelectedAnswer(sanitizeMathInput(e.target.value))}
                    disabled={isAnswered}
                    placeholder="Enter your answer..."
                    className="text-lg p-4 border-2"
                  />
                  {isAnswered && (
                    <div className={`mt-3 flex items-center gap-2 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span>Correct answer: {question.correct_answer}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Explanation */}
          {isAnswered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`border-2 mb-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className={`w-5 h-5 ${isCorrect ? 'text-emerald-700' : 'text-amber-600'}`} />
                    <span className={`font-semibold text-sm ${isCorrect ? 'text-emerald-900' : 'text-amber-900'}`}>
                      {isCorrect ? "✓ Correct! Here's why:" : "✗ Not quite — here's the solution:"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                      Correct answer: <span className="font-bold">{question.correct_answer}</span>
                    </p>
                    <p className={`text-sm leading-relaxed ${isCorrect ? 'text-emerald-800' : 'text-amber-800'}`}>
                      <MathText>{question.explanation}</MathText>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* AI Tutor */}
              {!showTutor ? (
                <button
                  onClick={() => setShowTutor(true)}
                  className={`w-full mb-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    !isCorrect
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  🤖 {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                </button>
              ) : (
                <QuestionTutor
                  question={question}
                  userAnswer={selectedAnswer}
                  isCorrect={isCorrect}
                  onClose={() => setShowTutor(false)}
                />
              )}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex justify-end mt-2">
            {!isAnswered ? (
              <Button onClick={onSubmit} disabled={!selectedAnswer} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Submit Answer
              </Button>
            ) : (
              <Button onClick={() => { setShowTutor(false); onNext(); }} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                {isLast ? 'Finish Module' : 'Next Question'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ModuleTransition({ m1Score, m1Total, isHard, onContinue }) {
  const pct = Math.round((m1Score / m1Total) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto text-center py-8"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl mx-auto mb-6">
        <Award className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Module 1 Complete!</h2>
      <p className="text-gray-600 mb-6">You answered {m1Score} out of {m1Total} correctly ({pct}%)</p>

      <Card className={`mb-6 border-2 ${isHard ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            {isHard
              ? <TrendingUp className="w-6 h-6 text-emerald-700" />
              : <Minus className="w-6 h-6 text-stone-500" />}
            <span className={`font-bold text-lg ${isHard ? 'text-emerald-900' : 'text-stone-700'}`}>
              {isHard ? 'Module 2: Advanced Track' : 'Module 2: Standard Track'}
            </span>
          </div>
          <p className={`text-sm ${isHard ? 'text-emerald-700' : 'text-stone-600'}`}>
            {isHard
              ? `Strong performance (${pct}%)! You're being routed to the harder Module 2, just like the real SAT. Expect more challenging questions.`
              : `You scored ${pct}% on Module 1. You'll get the standard Module 2 — same structure as the real SAT, with an adjusted difficulty ceiling.`}
          </p>
        </CardContent>
      </Card>

      <Button onClick={onContinue} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 text-base px-6 py-3">
        Start Module 2 <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

function Results({ m1History, m2History, isHard, onReset }) {
  const allHistory = [...m1History, ...m2History];
  const totalCorrect = allHistory.filter(h => h.correct).length;
  const totalQ = allHistory.length;
  const pct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  const m1Correct = m1History.filter(h => h.correct).length;
  const m2Correct = m2History.filter(h => h.correct).length;

  // Domain breakdown
  const domainMap = {};
  allHistory.forEach(h => {
    if (!domainMap[h.domain]) domainMap[h.domain] = { correct: 0, total: 0 };
    domainMap[h.domain].total++;
    if (h.correct) domainMap[h.domain].correct++;
  });

  const domainEntries = Object.entries(domainMap).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));

  // Rough score estimate (SAT Math 200–800)
  const estimatedScore = Math.round(200 + (pct / 100) * 600);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
          <Award className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Full Test Complete!</h1>
        <p className="text-gray-500">Module 1 + Module 2 ({isHard ? 'Advanced' : 'Standard'} Track)</p>
      </div>

      {/* Score */}
      <Card className="mb-6 bg-emerald-50 border-2 border-emerald-200">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Estimated SAT Math Score</p>
          <p className="text-5xl font-bold text-emerald-700 mb-2">{estimatedScore}</p>
          <p className="text-sm text-gray-500">out of 800</p>
        </CardContent>
      </Card>

      {/* Module breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="border-2 border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Module 1</p>
            <p className="text-3xl font-bold text-emerald-700">{m1Correct}/{m1History.length}</p>
            <p className="text-sm text-gray-500 mt-1">{Math.round((m1Correct / m1History.length) * 100)}% accuracy</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${isHard ? 'border-emerald-300' : 'border-stone-200'}`}>
          <CardContent className="p-4 text-center">
            <p className={`text-xs mb-1 font-medium uppercase tracking-wide ${isHard ? 'text-emerald-600' : 'text-stone-500'}`}>
              Module 2 {isHard ? '(Advanced)' : '(Standard)'}
            </p>
            <p className={`text-3xl font-bold ${isHard ? 'text-emerald-700' : 'text-stone-700'}`}>{m2Correct}/{m2History.length}</p>
            <p className="text-sm text-gray-500 mt-1">{Math.round((m2Correct / m2History.length) * 100)}% accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Domain breakdown */}
      <Card className="mb-6 border-2 border-gray-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Domain Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {domainEntries.map(([domain, perf]) => {
            const acc = Math.round((perf.correct / perf.total) * 100);
            return (
              <div key={domain}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700">{DOMAIN_LABELS[domain] || domain}</span>
                  <span className={`font-medium ${acc >= 70 ? 'text-emerald-600' : acc >= 50 ? 'text-stone-600' : 'text-red-500'}`}>
                    {perf.correct}/{perf.total} ({acc}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${acc >= 70 ? 'bg-emerald-400' : acc >= 50 ? 'bg-stone-400' : 'bg-red-400'}`}
                    style={{ width: `${acc}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onReset} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2">
          <RotateCcw className="w-4 h-4" />
          Take Again
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SATModuleTest({ user, onBack }) {
  const [phase, setPhase] = useState('intro'); // intro | m1 | transition | m2 | results
  const [m1Questions, setM1Questions] = useState([]);
  const [m2Questions, setM2Questions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [m1History, setM1History] = useState([]);
  const [m2History, setM2History] = useState([]);
  const [isHard, setIsHard] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    let interval;
    if (timerRunning) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const startTest = async () => {
    const used = new Set();
    const m1 = pickQuestions(M1_DIFFICULTY_MIX, used);
    setM1Questions(m1);
    setCurrentIndex(0);
    setSelectedAnswer('');
    setIsAnswered(false);
    setM1History([]);
    setM2History([]);
    setTimer(0);
    setTimerRunning(true);
    setPhase('m1');

    // Create a session record
    if (user?.id) {
      const s = await base44.entities.PracticeSession.create({
        user_id: user.id,
        session_type: 'class',
        status: 'in_progress',
        start_time: new Date().toISOString(),
        questions_attempted: 0,
        questions_correct: 0,
        current_difficulty: 'medium',
        domains_covered: [],
        question_history: [],
      });
      setSessionId(s.id);
    }
  };

  const submitAnswer = () => {
    const questions = phase === 'm1' ? m1Questions : m2Questions;
    const q = questions[currentIndex];
    const correct = normalizeAnswer(selectedAnswer) === normalizeAnswer(q.correct_answer);
    const entry = { 
      question_id: q.id, 
      user_answer: selectedAnswer, 
      correct, 
      time_spent_seconds: timer, 
      domain: q.domain, 
      difficulty: q.difficulty,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    };

    if (phase === 'm1') setM1History(prev => [...prev, entry]);
    else setM2History(prev => [...prev, entry]);

    setIsAnswered(true);
    setTimerRunning(false);
  };

  const nextQuestion = () => {
    const questions = phase === 'm1' ? m1Questions : m2Questions;
    const isLast = currentIndex >= questions.length - 1;

    if (!isLast) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer('');
      setIsAnswered(false);
      setTimer(0);
      setTimerRunning(true);
    } else if (phase === 'm1') {
      setTimerRunning(false);
      setPhase('transition');
    } else {
      endTest();
    }
  };

  const endTest = async () => {
    setTimerRunning(false);
    const allHistory = [...m1History];
    // Save session
    if (sessionId && user?.id) {
      const all = [...m1History, ...m2History];
      const correct = all.filter(h => h.correct).length;
      await base44.entities.PracticeSession.update(sessionId, {
        status: 'completed',
        end_time: new Date().toISOString(),
        questions_attempted: all.length,
        questions_correct: correct,
        question_history: all,
        duration_minutes: Math.max(1, Math.round(all.reduce((s, h) => s + h.time_spent_seconds, 0) / 60)),
        domains_covered: [...new Set(all.map(h => h.domain))],
        performance_summary: {
          accuracy_percentage: Math.round((correct / all.length) * 100),
        }
      });
    }
    setPhase('results');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl mx-auto mb-5">
            <span className="text-3xl">📋</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Full SAT Module Test</h1>
          <p className="text-gray-600">Experience the real SAT adaptive format</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-2 border-emerald-200 bg-emerald-50">
            <CardContent className="p-5">
              <h3 className="font-bold text-emerald-900 mb-2">📘 Module 1</h3>
              <p className="text-sm text-emerald-700 mb-3">22 questions — balanced difficulty (easy, medium, and some hard)</p>
              <ul className="text-xs text-emerald-600 space-y-1">
                <li>• All SAT math domains covered</li>
                <li>• ~8 easy, 10 medium, 4 hard</li>
                <li>• Your score determines Module 2</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-2 border-stone-200 bg-stone-50">
            <CardContent className="p-5">
              <h3 className="font-bold text-stone-800 mb-2">📙 Module 2 (Adaptive)</h3>
              <p className="text-sm text-stone-600 mb-3">22 questions — difficulty depends on your Module 1 score</p>
              <ul className="text-xs text-stone-500 space-y-1">
                <li>• ≥60% on M1 → <strong>Advanced track</strong> (harder)</li>
                <li>• &lt;60% on M1 → <strong>Standard track</strong></li>
                <li>• Mirrors the real digital SAT</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-2 border-stone-200 bg-stone-50">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="text-stone-500 text-lg">⏱</span>
            <p className="text-sm text-stone-700">
              <strong>Tip:</strong> On the real SAT, Module 1 is 35 minutes and Module 2 is 35 minutes. This practice session has no time limit — take your time and read each explanation.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onBack} className="text-gray-600">← Back</Button>
          <Button onClick={startTest} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 text-base gap-2">
            Start Module Test <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  if (phase === 'm1' || phase === 'm2') {
    const questions = phase === 'm1' ? m1Questions : m2Questions;
    const currentQ = questions[currentIndex];
    if (!currentQ) return null;

    return (
      <div>
        <div className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-sm font-medium ${
          phase === 'm1' ? 'bg-emerald-100 text-emerald-700' : isHard ? 'bg-emerald-200 text-emerald-800' : 'bg-stone-100 text-stone-700'
        }`}>
          {phase === 'm1' ? '📘 Module 1' : isHard ? '📙 Module 2 — Advanced Track' : '📙 Module 2 — Standard Track'}
        </div>
        <QuestionView
          question={currentQ}
          index={currentIndex}
          total={questions.length}
          selectedAnswer={selectedAnswer}
          setSelectedAnswer={setSelectedAnswer}
          isAnswered={isAnswered}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
          isLast={currentIndex >= questions.length - 1}
          timer={timer}
        />
      </div>
    );
  }

  if (phase === 'transition') {
    const correctCount = m1History.filter(h => h.correct).length;
    const hard = correctCount / m1Questions.length >= HARD_THRESHOLD;
    return (
      <ModuleTransition
        m1Score={correctCount}
        m1Total={m1Questions.length}
        isHard={hard}
        onContinue={() => {
          setIsHard(hard);
          const used = new Set(m1Questions.map(q => q.id));
          const mix = hard ? M2_HARD_MIX : M2_STANDARD_MIX;
          const m2 = pickQuestions(mix, used);
          setM2Questions(m2);
          setCurrentIndex(0);
          setSelectedAnswer('');
          setIsAnswered(false);
          setTimer(0);
          setTimerRunning(true);
          setPhase('m2');
        }}
      />
    );
  }

  if (phase === 'results') {
    return (
      <Results
        m1History={m1History}
        m2History={m2History}
        isHard={isHard}
        onReset={() => { setPhase('intro'); setM1History([]); setM2History([]); }}
      />
    );
  }

  return null;
}
