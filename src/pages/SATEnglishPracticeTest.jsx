import React, { useState, useEffect, useRef } from 'react';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  ChevronRight, Loader2, Target, Trophy, ArrowLeft,
  Timer, BookOpen, CheckCircle, XCircle, BarChart2, Flag, AlertTriangle
} from 'lucide-react';
import QuestionTutor from '@/components/sat/QuestionTutor';
import ExplanationText from '@/components/sat/ExplanationText';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SAT_ENGLISH_TESTS } from '@/data/satEnglishPracticeTestsConfig';

const MODULE2_HARD_THRESHOLD = 0.65;

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

function EnglishScoreSummary({ domainScores }) {
  const domains = [
    { key: "Information and Ideas", pctText: "26% of test section, 12 - 14 questions" },
    { key: "Craft and Structure", pctText: "28% of test section, 13 - 15 questions" },
    { key: "Expression of Ideas", pctText: "20% of test section, 8 - 12 questions" },
    { key: "Standard English Conventions", pctText: "26% of test section, 11 - 15 questions" }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-stone-800">Reading and Writing</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {domains.map(d => {
          const stats = domainScores[d.key] || { correct: 0, total: 0 };
          const blocks = 7;
          let scoreBlocks = 0;
          if (stats.total > 0) {
            const pct = stats.correct / stats.total;
            scoreBlocks = Math.round(pct * blocks);
          }

          return (
            <div key={d.key} className="space-y-1 text-left">
              <p className="font-bold text-stone-800">{d.key}</p>
              <p className="text-xs text-stone-500 mb-2">{d.pctText}</p>
              <div className="flex gap-1">
                {Array.from({ length: blocks }).map((_, i) => (
                  <div key={i} className={`flex-1 h-3 rounded-sm ${i < scoreBlocks ? 'bg-emerald-600' : 'bg-stone-200'}`} />
                ))}
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1 border-b border-dotted border-emerald-600 inline-block">
                {scoreBlocks >= 6 ? "Mastery: Excellent" : scoreBlocks >= 4 ? "Mastery: Good" : scoreBlocks >= 2 ? "Mastery: Fair" : "Mastery: Needs Practice"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SATEnglishPracticeTest() {
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('select'); // select, loading, module1, between, module2, results
  const [selectedTest, setSelectedTest] = useState(null);
  const [questionsCache, setQuestionsCache] = useState({});

  const [currentModule, setCurrentModule] = useState(null); // module data object
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: 'A' }
  const [globalAnswers, setGlobalAnswers] = useState({}); // All answers across modules
  const [flagged, setFlagged] = useState(new Set());
  const [selectedOption, setSelectedOption] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  const [module1Score, setModule1Score] = useState(null);
  const [module1DomainScores, setModule1DomainScores] = useState({});
  const [module2Score, setModule2Score] = useState(null);
  const [module2DomainScores, setModule2DomainScores] = useState({});
  const [module2Type, setModule2Type] = useState('hard'); // 'hard' or 'easy'

  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

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

  const loadModuleQuestions = async (test, moduleKey) => {
    const ids = test.modules[moduleKey].question_ids;
    const missing = ids.filter(id => !questionsCache[id]);
    
    if (missing.length > 0) {
      const fetched = await base44.entities.EnglishCBQuestion.filter({ id: { $in: missing } });
      const newCache = { ...questionsCache };
      fetched.forEach(q => newCache[q.id] = q);
      setQuestionsCache(newCache);
      return ids.map(id => newCache[id]);
    }
    return ids.map(id => questionsCache[id]);
  };

  const startModule1 = async (test) => {
    setStage('loading');
    setSelectedTest(test);
    const qs = await loadModuleQuestions(test, 'module1');
    setCurrentModule({ ...test.modules.module1, questions_data: qs });
    setAnswers({});
    setGlobalAnswers({});
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
      setSelectedOption(answers[q.id] || globalAnswers[q.id] || '');
      if (reviewMode) setShowExplanation(true);
    }
  };

  const getDomainLabel = (rawDomain) => {
    if (!rawDomain) return "Information and Ideas";
    const d = rawDomain.trim();
    if (d.includes("Craft")) return "Craft and Structure";
    if (d.includes("Expression")) return "Expression of Ideas";
    if (d.includes("Standard") || d.includes("Convention")) return "Standard English Conventions";
    return "Information and Ideas";
  };

  const handleSubmitModule = async () => {
    clearInterval(timerRef.current);
    const questions = currentModule.questions_data;
    let correct = 0;
    const domainScores = {};
    
    questions.forEach(q => {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.correct_answer;
      if (isCorrect) correct++;
      
      const domainName = getDomainLabel(q.domain);
      if (!domainScores[domainName]) domainScores[domainName] = { correct: 0, total: 0 };
      domainScores[domainName].total++;
      if (isCorrect) domainScores[domainName].correct++;
    });

    if (stage === 'module1') {
      setModule1Score(correct);
      setModule1DomainScores(domainScores);
      setGlobalAnswers(prev => ({ ...prev, ...answers }));
      const pct = correct / questions.length;
      setModule2Type(pct >= MODULE2_HARD_THRESHOLD ? 'hard' : 'easy');
      setStage('between');
    } else if (stage === 'module2') {
      setModule2Score(correct);
      setModule2DomainScores(domainScores);
      setGlobalAnswers(prev => ({ ...prev, ...answers }));
      
      const totalCorrect = (module1Score || 0) + correct;
      const totalAttempted = selectedTest.modules.module1.questions + selectedTest.modules[`module2_${module2Type}`].questions;
      
      const allDomainScores = { ...module1DomainScores };
      Object.keys(domainScores).forEach(d => {
        if (!allDomainScores[d]) allDomainScores[d] = { correct: 0, total: 0 };
        allDomainScores[d].correct += domainScores[d].correct;
        allDomainScores[d].total += domainScores[d].total;
      });

      const finalAnswers = { ...globalAnswers, ...answers };
      const questionHistory = Object.entries(finalAnswers).map(([qId, uAns]) => {
        const q = questionsCache[qId];
        if (!q) return null;
        return {
          question_id: q.id,
          user_answer: uAns,
          correct: uAns === q.correct_answer,
          idk: false,
          time_spent_seconds: 0,
          domain: q.domain,
          difficulty: q.difficulty,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation
        };
      }).filter(Boolean);

      await base44.entities.EnglishPracticeSession.create({
        user_id: user.id,
        session_type: 'diagnostic',
        status: 'completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: selectedTest.modules.module1.time_minutes + selectedTest.modules[`module2_${module2Type}`].time_minutes,
        questions_attempted: totalAttempted,
        questions_correct: totalCorrect,
        domains_covered: Object.keys(allDomainScores),
        question_history: questionHistory,
        performance_summary: {
          accuracy_percentage: Math.round((totalCorrect / totalAttempted) * 100),
          strongest_domain: Object.keys(allDomainScores).length > 0 ? Object.keys(allDomainScores).reduce((a, b) => allDomainScores[a].correct / allDomainScores[a].total > allDomainScores[b].correct / allDomainScores[b].total ? a : b) : '',
          weakest_domain: Object.keys(allDomainScores).length > 0 ? Object.keys(allDomainScores).reduce((a, b) => allDomainScores[a].correct / allDomainScores[a].total < allDomainScores[b].correct / allDomainScores[b].total ? a : b) : ''
        }
      });

      setStage('results');
    }
  };

  const startModule2 = async () => {
    setStage('loading');
    const modKey = module2Type === 'hard' ? 'module2_hard' : 'module2_easy';
    const qs = await loadModuleQuestions(selectedTest, modKey);
    setCurrentModule({ ...selectedTest.modules[modKey], questions_data: qs });
    setAnswers({});
    setFlagged(new Set());
    setCurrentQuestionIdx(0);
    setSelectedOption('');
    setShowExplanation(false);
    setReviewMode(false);
    setTimeLeft(selectedTest.modules[modKey].time_minutes * 60);
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

  const enterReview = (initialQ) => {
    clearInterval(timerRef.current);
    setReviewMode(true);
    setCurrentQuestionIdx(0);
    const q = initialQ || currentModule.questions_data[0];
    if (q) setSelectedOption(answers[q.id] || globalAnswers[q.id] || '');
    setShowExplanation(true);
    setStage('review');
  };

  const totalScore = (module1Score || 0) + (module2Score || 0);
  const totalQuestions = 54;
  
  let estimatedSATScore = Math.round((200 + (totalScore / totalQuestions) * 600) / 10) * 10;
  if (totalScore === totalQuestions) estimatedSATScore = 800;
  else if (totalScore >= totalQuestions - 1) estimatedSATScore = 790;
  else if (totalScore === 0) estimatedSATScore = 200;
  
  const allDomainScoresComb = { ...module1DomainScores };
  Object.keys(module2DomainScores).forEach(d => {
    if (!allDomainScoresComb[d]) allDomainScoresComb[d] = { correct: 0, total: 0 };
    allDomainScoresComb[d].correct += module2DomainScores[d].correct;
    allDomainScoresComb[d].total += module2DomainScores[d].total;
  });

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>

      {stage === 'select' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-emerald-600 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl mb-8">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">Full English Practice Test</h1>
                <p className="text-white/80 text-sm">Digital SAT Reading & Writing · 54 Questions · 64 Minutes</p>
              </div>
            </div>
          </div>

          <p className="text-stone-600 text-sm">Select a practice test. Each test consists of 2 modules (27 questions each). Module 2 will adapt based on your Module 1 performance.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAT_ENGLISH_TESTS.map(test => (
              <Card key={test.id} className="border-4 border-white shadow-xl rounded-3xl hover:border-emerald-200 transition-all cursor-pointer" onClick={() => startModule1(test)}>
                <CardContent className="p-6">
                  <h3 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-lg font-bold text-stone-900 mb-1">{test.title}</h3>
                  <p className="text-sm text-stone-500 mb-4">{test.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-stone-100 text-stone-700">54 Questions</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700">64 min</Badge>
                    <Badge className="bg-stone-100 text-stone-700">Adaptive</Badge>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                    Start Test <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button variant="outline" onClick={() => navigate(createPageUrl('SATEnglishPractice'))} className="mt-4 rounded-full border-2 border-stone-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to English Practice
          </Button>
        </motion.div>
      )}

      {stage === 'loading' && (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-stone-500 font-medium">Loading test questions...</p>
        </div>
      )}

      {(stage === 'module1' || stage === 'module2' || stage === 'review') && currentModule && (
        <motion.div key={stage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {(() => {
            const questions = currentModule.questions_data;
            const q = questions[currentQuestionIdx];
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correct_answer;
            const answeredCount = Object.keys(answers).length;

            return (
              <Card className="border-4 border-white shadow-2xl rounded-3xl">
                <CardHeader className="border-b border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                        {stage === 'review' ? 'Review - All Modules' : (stage === 'module1' ? 'Module 1' : `Module 2 (${module2Type === 'hard' ? 'Hard' : 'Easy'})`)}
                      </p>
                      <p className="text-sm font-semibold text-stone-700">Question {currentQuestionIdx + 1} of {questions.length}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!reviewMode && (
                        <>
                          <CalculatorPanel tools={{ scratch_pad: true, scientific_calculator: false, graphing_calculator: false, formula_sheet: false }} />
                          <button
                            onClick={() => {
                              try {
                                const selection = window.getSelection();
                                if (!selection.rangeCount || selection.toString().trim() === '') return;
                                const range = selection.getRangeAt(0);
                                const mark = document.createElement('mark');
                                mark.className = "bg-yellow-300 rounded-sm";
                                range.surroundContents(mark);
                              } catch (e) {}
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-stone-600 border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-all"
                            title="Highlight selected text"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l-6 6v3h9l3-3"></path><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path></svg>
                            Highlight
                          </button>
                        </>
                      )}
                      {!reviewMode && <TimerDisplay seconds={timeLeft} />}
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
                    <span className="capitalize">{getDomainLabel(q.domain)}</span>
                    {flagged.has(q.id) && <Badge className="bg-amber-100 text-amber-700 text-xs py-0">🚩 Flagged</Badge>}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  <div className="text-base font-medium text-stone-800 leading-relaxed max-h-64 overflow-y-auto pr-2">
                    {q.passage && <p className="mb-4 text-stone-600" dangerouslySetInnerHTML={{ __html: q.passage.replace(/\n/g, '<br />') }} />}
                    <p dangerouslySetInnerHTML={{ __html: q.question_text.replace(/\n/g, '<br />') }} />
                  </div>

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
                          className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 ${cls}`}
                        >
                          <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{opt.label}</span>
                          <span className="text-sm leading-relaxed">{opt.text}</span>
                          {(reviewMode || showExplanation) && isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0 mt-1" />}
                          {(reviewMode || showExplanation) && isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {(reviewMode || showExplanation) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className={`rounded-2xl border-2 p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                        <p className={`text-sm font-bold mb-2 ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isCorrect ? '✓ Correct!' : `✗ Incorrect — You Selected: ${userAns || 'None'}, Correct Answer: ${q.correct_answer}`}
                        </p>
                        <ExplanationText isCorrect={isCorrect}>{q.explanation}</ExplanationText>
                      </div>
                      {!showTutor ? (
                        <button onClick={() => setShowTutor(true)} className="w-full py-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 flex items-center justify-center gap-2">
                          🤖 Ask AI Tutor
                        </button>
                      ) : (
                        <QuestionTutor
                          question={q}
                          userAnswer={answers[q.id] || ''}
                          isCorrect={isCorrect}
                          onClose={() => setShowTutor(false)}
                        />
                      )}
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                      <ReportQuestionModal 
                        question={q} 
                        source="English Module Test"
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
                      </div>

                      {currentQuestionIdx < questions.length - 1 ? (
                        <Button onClick={() => handleNav(1)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          onClick={reviewMode ? () => setStage('results') : handleSubmitModule}
                          className="bg-stone-800 hover:bg-stone-700 text-white rounded-full font-bold"
                        >
                          {reviewMode ? 'Back to Results' : `Submit (${answeredCount}/${questions.length})`}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>

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
                              isCurrent ? 'bg-emerald-600 text-white' :
                              isFlagged ? 'bg-amber-200 text-amber-800' :
                              isAns ? 'bg-stone-200 text-stone-800' :
                              'bg-stone-100 text-stone-500 hover:bg-stone-300'
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

      {stage === 'between' && (
        <motion.div key="between" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
          <Card className="border-4 border-white shadow-xl rounded-3xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center">
                <BarChart2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-stone-900">Module 1 Complete!</h2>
              <p className="text-stone-500">You scored <strong>{module1Score}/{selectedTest?.modules.module1.questions}</strong>.</p>
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${module2Type === 'hard' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {module2Type === 'hard' ? '🔥 You unlocked the Hard Module 2' : '📘 Proceeding to Standard Module 2'}
              </div>
            </CardContent>
          </Card>
          <Button onClick={startModule2} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold h-12 text-lg">
            Start Module 2 <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {stage === 'results' && (
        <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pb-12">
          <Card className="bg-white border-4 border-white rounded-3xl shadow-xl">
            <CardContent className="p-8 text-center space-y-4">
              <Trophy className="w-16 h-16 text-emerald-500 mx-auto" />
              <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl font-bold text-stone-900">Test Complete!</h2>
              <div className="flex justify-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-emerald-600">{estimatedSATScore}</p>
                  <p className="text-sm font-medium text-stone-500">Est. SAT Score (200-800)</p>
                </div>
                <div className="w-px bg-stone-200" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-stone-800">{totalScore}<span className="text-xl text-stone-400">/{totalQuestions}</span></p>
                  <p className="text-sm font-medium text-stone-500">Total Correct</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-4 border-white shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-8 bg-stone-50">
              <EnglishScoreSummary domainScores={allDomainScoresComb} />
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                const mod1Qs = selectedTest.modules.module1.question_ids.map(id => questionsCache[id]).filter(Boolean);
                const mod2Key = module2Type === 'hard' ? 'module2_hard' : 'module2_easy';
                const mod2Qs = selectedTest.modules[mod2Key].question_ids.map(id => questionsCache[id]).filter(Boolean);
                
                const allQs = [...mod1Qs, ...mod2Qs];
                setCurrentModule({
                  title: "Review - All Modules",
                  questions_data: allQs
                });
                setAnswers(globalAnswers);
                enterReview(allQs[0]);
              }}
              className="flex-1 rounded-full border-2 border-stone-200 h-12"
            >
              Review Incorrect Answers
            </Button>
            <Button
              onClick={() => navigate(createPageUrl('SATEnglishPractice'))}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold h-12"
            >
              <Target className="w-4 h-4 mr-2" /> Back to English Practice
            </Button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
