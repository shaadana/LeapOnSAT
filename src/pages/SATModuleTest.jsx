import React, { useState, useEffect, useRef } from 'react';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronRight, Loader2, Target, Trophy, ArrowLeft,
  Timer, BookOpen, CheckCircle, XCircle, BarChart2, Flag, AlertTriangle
} from 'lucide-react';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import QuestionTutor from '@/components/sat/QuestionTutor';
import ExplanationText from '@/components/sat/ExplanationText';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { answersEquivalent } from '@/utils/mathUtils';
import { SAT_PRACTICE_TESTS } from '@/data/satPracticeTests';
import { recalculateKnowledgeGraph } from '@/utils/satMasterySync';

// Score thresholds for adaptive routing
const MODULE2_HARD_THRESHOLD = 0.65; // ≥ 65% on Module 1 → Hard Module 2

function TimerDisplay({ seconds }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds < 300;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${isLow ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-700'}`}>
      <Timer className={`w-3.5 h-3.5 ${isLow ? 'animate-pulse' : ''}`} />
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  );
}

function ScoreSummary({ score, total, domain_scores, moduleName }) {
  const pct = Math.round((score / total) * 100);
  const color = pct >= 80 ? 'emerald' : pct >= 60 ? 'amber' : 'red';
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-6 text-center bg-${color}-50 border-2 border-${color}-200`}>
        <p className={`text-4xl font-bold text-${color}-700`}>{score}/{total}</p>
        <p className={`text-lg font-semibold text-${color}-600`}>{pct}%</p>
        <p className="text-stone-500 text-sm mt-1">{moduleName}</p>
      </div>
      {Object.keys(domain_scores).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-600">Performance by Domain</p>
          {Object.entries(domain_scores).map(([domain, { correct, total: t }]) => (
            <div key={domain} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-32 truncate capitalize">{domain.replace(/_/g, ' ')}</span>
              <div className="flex-1 bg-stone-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${correct / t >= 0.7 ? 'bg-emerald-500' : correct / t >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${(correct / t) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-stone-600 w-10 text-right">{correct}/{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SATModuleTest() {
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('select'); // select, module1, between, module2, results
  const [selectedTest, setSelectedTest] = useState(null);

  // Module state
  const [currentModule, setCurrentModule] = useState(null); // module data object
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: 'A' }
  const [flagged, setFlagged] = useState(new Set());
  const [selectedOption, setSelectedOption] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Results
  const [module1Score, setModule1Score] = useState(null);
  const [module1DomainScores, setModule1DomainScores] = useState({});
  const [module2Score, setModule2Score] = useState(null);
  const [module2DomainScores, setModule2DomainScores] = useState({});
  const [module2Type, setModule2Type] = useState('hard'); // 'hard' or 'easy'

  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  // Timer countdown
  useEffect(() => {
    if ((stage === 'module1' || stage === 'module2') && !reviewMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleSubmitModule();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, reviewMode]);

  const startModule1 = (test) => {
    setSelectedTest(test);
    setCurrentModule(test.modules.module1);
    setAnswers({});
    setFlagged(new Set());
    setCurrentQuestionIdx(0);
    setSelectedOption('');
    setShowExplanation(false);
    setReviewMode(false);
    setTimeLeft(test.modules.module1.time_minutes * 60);
    setStage('module1');
  };

  const handleSelectOption = (label) => {
    if (reviewMode) return;
    setSelectedOption(label);
    // Save answer immediately
    const q = currentModule.questions_data[currentQuestionIdx];
    setAnswers(prev => ({ ...prev, [q.id]: label }));
  };

  const handleNav = (direction) => {
    setShowExplanation(false);
    setShowTutor(false);
    const newIdx = currentQuestionIdx + direction;
    if (newIdx >= 0 && newIdx < currentModule.questions_data.length) {
      setCurrentQuestionIdx(newIdx);
      const q = currentModule.questions_data[newIdx];
      setSelectedOption(answers[q.id] || '');
    }
  };

  const handleSubmitModule = () => {
    clearInterval(timerRef.current);
    const questions = currentModule.questions_data;
    let correct = 0;
    const domainScores = {};
    questions.forEach(q => {
      const userAns = answers[q.id];
      let isCorrect = false;
      if (!q.options || q.options.length === 0) {
        isCorrect = answersEquivalent(userAns, q.correct_answer);
      } else {
        isCorrect = userAns === q.correct_answer;
      }
      
      if (isCorrect) correct++;
      if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 };
      domainScores[q.domain].total++;
      if (isCorrect) domainScores[q.domain].correct++;
    });

    if (stage === 'module1') {
      setModule1Score(correct);
      setModule1DomainScores(domainScores);
      const pct = correct / questions.length;
      setModule2Type(pct >= MODULE2_HARD_THRESHOLD ? 'hard' : 'easy');
      setStage('between');
    } else if (stage === 'module2') {
      setModule2Score(correct);
      setModule2DomainScores(domainScores);
      
      // Calculate overall test stats and save practice session
      const totalCorrect = (module1Score || 0) + correct;
      const totalAttempted = selectedTest.modules.module1.questions + selectedTest.modules[`module2_${module2Type}`].questions;
      
      const allDomainScores = { ...module1DomainScores };
      Object.keys(domainScores).forEach(d => {
        if (!allDomainScores[d]) allDomainScores[d] = { correct: 0, total: 0 };
        allDomainScores[d].correct += domainScores[d].correct;
        allDomainScores[d].total += domainScores[d].total;
      });

      const questionHistory = []; // We aren't capturing full history details in this view right now to keep it lightweight, but we could construct it if needed.

      base44.entities.PracticeSession.create({
        user_id: user.id,
        session_type: 'class', // Using 'class' or maybe add 'test' if it existed? Let's use 'blitz' or 'choice'. 'choice' works. Wait, 'SATModuleTest' is a full test. Let's use 'blitz'.
        status: 'completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: selectedTest.modules.module1.time_minutes + selectedTest.modules[`module2_${module2Type}`].time_minutes,
        questions_attempted: totalAttempted,
        questions_correct: totalCorrect,
        domains_covered: Object.keys(allDomainScores),
        performance_summary: {
          accuracy_percentage: Math.round((totalCorrect / totalAttempted) * 100)
        }
      }).then(async () => {
        await recalculateKnowledgeGraph(user.id, base44);
      }).catch(console.error);

      setStage('results');
    }
  };

  const startModule2 = () => {
    const mod = module2Type === 'hard'
      ? selectedTest.modules.module2_hard
      : selectedTest.modules.module2_easy;
    setCurrentModule(mod);
    setAnswers({});
    setFlagged(new Set());
    setCurrentQuestionIdx(0);
    setSelectedOption('');
    setShowExplanation(false);
    setReviewMode(false);
    setTimeLeft(mod.time_minutes * 60);
    setStage('module2');
  };

  const toggleFlag = () => {
    const q = currentModule.questions_data[currentQuestionIdx];
    setFlagged(prev => {
      const n = new Set(prev);
      n.has(q.id) ? n.delete(q.id) : n.add(q.id);
      return n;
    });
  };

  const enterReview = () => {
    clearInterval(timerRef.current);
    setReviewMode(true);
    setCurrentQuestionIdx(0);
    const q = currentModule.questions_data[0];
    setSelectedOption(answers[q.id] || '');
    setShowExplanation(true);
  };

  const totalScore = (module1Score || 0) + (module2Score || 0);
  const totalQuestions = 44;
  const estimatedSATScore = Math.round(200 + (totalScore / totalQuestions) * 600);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="bg-stone-800 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">SAT Full Practice Test</h1>
            <p className="text-white/70 text-sm">Digital SAT — Module 1 + Module 2 · 44 Questions · 70 Minutes</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* SELECT TEST */}
        {stage === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-stone-600 text-sm">Select a practice test. Each test has a Module 1 followed by an adaptive Module 2 (Hard or Easy) based on your performance.</p>
            {SAT_PRACTICE_TESTS.map(test => (
              <Card key={test.id} className="border-4 border-white shadow-xl rounded-3xl hover:border-emerald-200 transition-all cursor-pointer" onClick={() => startModule1(test)}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-lg font-bold text-stone-900">{test.title}</h3>
                    <p className="text-sm text-stone-500">{test.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-stone-100 text-stone-700">44 Questions</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700">70 min</Badge>
                      <Badge className="bg-blue-100 text-blue-700">Adaptive</Badge>
                    </div>
                  </div>
                  <Button className="bg-stone-800 hover:bg-stone-700 text-white rounded-full">
                    Start <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={() => navigate(createPageUrl('SATPractice'))} className="w-full rounded-full border-2 border-stone-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to SAT Practice
            </Button>
          </motion.div>
        )}

        {/* MODULE IN PROGRESS */}
        {(stage === 'module1' || stage === 'module2') && currentModule && (
          <motion.div key={stage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {(() => {
              const questions = currentModule.questions_data;
              const q = questions[currentQuestionIdx];
              const answered = !!answers[q.id];
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct_answer;
              const answeredCount = Object.keys(answers).length;

              return (
                <Card className="border-4 border-white shadow-2xl rounded-3xl">
                  <CardHeader className="border-b border-stone-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                          {stage === 'module1' ? 'Module 1' : `Module 2 (${module2Type === 'hard' ? 'Hard' : 'Easy'})`}
                        </p>
                        <p className="text-sm font-semibold text-stone-700">Question {currentQuestionIdx + 1} of {questions.length}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!reviewMode && <TimerDisplay seconds={timeLeft} />}
                        <CalculatorPanel />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleFlag}
                          className={`rounded-full ${flagged.has(q.id) ? 'text-amber-600 bg-amber-50' : 'text-stone-400'}`}
                        >
                          <Flag className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={((currentQuestionIdx + 1) / questions.length) * 100} className="h-1.5" />
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="capitalize">{q.domain.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <Badge className={`text-xs py-0 ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {q.difficulty}
                      </Badge>
                      {flagged.has(q.id) && <Badge className="bg-amber-100 text-amber-700 text-xs py-0">🚩 Flagged</Badge>}
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-5">
                    <p className="text-base font-medium text-stone-800 leading-relaxed">{q.question_text || q.question}</p>

                    {/* Answer options */}
                    <div className="space-y-2">
                      {(q.options || []).map(opt => {
                        const isSelected = selectedOption === opt.label || answers[q.id] === opt.label;
                        const isCorrectOpt = opt.label === q.correct_answer;
                        let cls = 'border-2 border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50';
                        if (reviewMode || showExplanation) {
                          if (isCorrectOpt) cls = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900';
                          else if (isSelected && !isCorrectOpt) cls = 'border-2 border-red-400 bg-red-50 text-red-800';
                          else cls = 'border-2 border-stone-100 bg-stone-50 text-stone-400';
                        } else if (isSelected) {
                          cls = 'border-2 border-stone-700 bg-stone-100 text-stone-900';
                        }
                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleSelectOption(opt.label)}
                            disabled={reviewMode || showExplanation}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${cls}`}
                          >
                            <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{opt.label}</span>
                            <span className="text-sm">{opt.text}</span>
                            {(reviewMode || showExplanation) && isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />}
                            {(reviewMode || showExplanation) && isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation (review mode or check) */}
                    {(reviewMode || showExplanation) && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className={`rounded-2xl border-2 p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                          <p className={`text-sm font-bold mb-2 ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isCorrect ? '✓ Correct!' : `✗ Incorrect — Answer: ${q.correct_answer}`}
                          </p>
                          <ExplanationText isCorrect={isCorrect}>{q.explanation}</ExplanationText>
                        </div>
                        {!showTutor ? (
                          <button onClick={() => setShowTutor(true)} className="w-full py-2 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2">
                            🤖 Ask AI Tutor
                          </button>
                        ) : (
                          <QuestionTutor
                            question={{ ...q, question_text: q.question_text || q.question, correct_answer: q.correct_answer }}
                            userAnswer={answers[q.id] || ''}
                            isCorrect={isCorrect}
                            onClose={() => setShowTutor(false)}
                          />
                        )}
                      </motion.div>
                    )}

                    {/* Navigation row */}
                    <div className="flex flex-col gap-4 pt-2">
                      <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                        <ReportQuestionModal 
                          question={q} 
                          source="Module Test"
                          triggerElement={
                            <button className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Report Faulty Question
                            </button>
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => handleNav(-1)} disabled={currentQuestionIdx === 0} className="rounded-full">
                          <ArrowLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>

                        <div className="flex gap-2">
                          {!reviewMode && answered && !showExplanation && (
                            <Button variant="outline" onClick={() => setShowExplanation(true)} className="rounded-full text-sm border-blue-200 text-blue-700 hover:bg-blue-50">
                              Check Answer
                            </Button>
                          )}
                        </div>

                        {currentQuestionIdx < questions.length - 1 ? (
                          <Button onClick={() => handleNav(1)} className="bg-stone-800 hover:bg-stone-700 text-white rounded-full">
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            onClick={reviewMode ? handleSubmitModule : handleSubmitModule}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold"
                          >
                            {reviewMode ? 'Submit Module' : `Submit (${answeredCount}/${questions.length} answered)`}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Question grid navigator */}
                    <div className="pt-3 border-t border-stone-100">
                      <p className="text-xs text-stone-400 mb-2">{answeredCount}/{questions.length} answered · click to navigate</p>
                      <div className="flex flex-wrap gap-1.5">
                        {questions.map((qq, idx) => {
                          const isAns = !!answers[qq.id];
                          const isCurrent = idx === currentQuestionIdx;
                          const isFlagged = flagged.has(qq.id);
                          return (
                            <button
                              key={qq.id}
                              onClick={() => {
                                setCurrentQuestionIdx(idx);
                                setSelectedOption(answers[qq.id] || '');
                                setShowExplanation(false);
                                setShowTutor(false);
                              }}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                isCurrent ? 'bg-stone-800 text-white' :
                                isFlagged ? 'bg-amber-200 text-amber-800' :
                                isAns ? 'bg-emerald-200 text-emerald-800' :
                                'bg-stone-100 text-stone-500 hover:bg-stone-200'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </motion.div>
        )}

        {/* BETWEEN MODULES */}
        {stage === 'between' && (
          <motion.div key="between" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="border-4 border-white shadow-xl rounded-3xl">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
                  <BarChart2 className="w-8 h-8 text-stone-600" />
                </div>
                <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-xl font-bold text-stone-900">Module 1 Complete!</h2>
                <p className="text-stone-500 text-sm">You scored <strong>{module1Score}/{selectedTest?.modules.module1.questions}</strong> on Module 1.</p>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${module2Type === 'hard' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {module2Type === 'hard' ? '🔥 You\'re getting the Hard Module 2' : '📘 You\'re getting the Standard Module 2'}
                </div>
                <p className="text-xs text-stone-400">
                  {module2Type === 'hard' ? 'Strong performance! Hard Module 2 is worth more points.' : 'Keep working — Standard Module 2 still covers all domains.'}
                </p>
              </CardContent>
            </Card>
            <ScoreSummary score={module1Score} total={selectedTest?.modules.module1.questions} domain_scores={module1DomainScores} moduleName="Module 1 Results" />
            <Button onClick={startModule2} className="w-full bg-stone-800 hover:bg-stone-700 text-white rounded-full font-bold h-12">
              Start Module 2 <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* RESULTS */}
        {stage === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-stone-50 border-4 border-emerald-200 rounded-3xl shadow-xl">
              <CardContent className="p-8 text-center space-y-3">
                <Trophy className="w-14 h-14 text-emerald-500 mx-auto" />
                <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-stone-900">Test Complete!</h2>
                <div className="flex justify-center gap-6 pt-2">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-stone-900">{totalScore}<span className="text-lg text-stone-400">/{totalQuestions}</span></p>
                    <p className="text-xs text-stone-500">Total Score</p>
                  </div>
                  <div className="w-px bg-stone-200" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-600">{Math.round((totalScore / totalQuestions) * 100)}%</p>
                    <p className="text-xs text-stone-500">Accuracy</p>
                  </div>
                  <div className="w-px bg-stone-200" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">~{estimatedSATScore}</p>
                    <p className="text-xs text-stone-500">Est. SAT Score</p>
                  </div>
                </div>
                <Badge className={`${module2Type === 'hard' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} text-xs`}>
                  {module2Type === 'hard' ? 'Completed Hard Module 2' : 'Completed Standard Module 2'}
                </Badge>
              </CardContent>
            </Card>

            {/* Per-module scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 border-stone-200 rounded-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-stone-600">Module 1</CardTitle></CardHeader>
                <CardContent>
                  <ScoreSummary score={module1Score} total={selectedTest?.modules.module1.questions} domain_scores={module1DomainScores} moduleName="" />
                </CardContent>
              </Card>
              <Card className="border-2 border-stone-200 rounded-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-stone-600">Module 2 ({module2Type === 'hard' ? 'Hard' : 'Easy'})</CardTitle></CardHeader>
                <CardContent>
                  <ScoreSummary score={module2Score} total={selectedTest?.modules[`module2_${module2Type}`]?.questions} domain_scores={module2DomainScores} moduleName="" />
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStage('select'); setSelectedTest(null); }}
                className="flex-1 rounded-full border-2 border-stone-200"
              >
                Take Another Test
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('SATPractice'))}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-white rounded-full"
              >
                <Target className="w-4 h-4 mr-2" /> SAT Practice
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
