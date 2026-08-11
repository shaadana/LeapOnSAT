import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ChevronRight, Filter, Clock, Award, RotateCcw, Lightbulb, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from '@/components/sat/MathText';
import MathKeyboard from '@/components/sat/MathKeyboard';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import QuestionTutor from '@/components/sat/QuestionTutor';
import { awardForSession } from '@/utils/gamification';
import { recalculateKnowledgeGraph } from '@/utils/satMasterySync';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';
import { answersEquivalent, sanitizeMathInput } from '@/utils/mathUtils';

const CANYON_TOPICS = [
  { key: 'algebra', label: 'Algebra' },
  { key: 'inequalities', label: 'Inequalities' },
  { key: 'percent', label: 'Percent' },
  { key: 'exponents_radicals', label: 'Exponents and Radicals' },
  { key: 'ratio_rate', label: 'Ratio and Rate' },
  { key: 'linear_function', label: 'Linear Function' },
  { key: 'quadratic_function', label: 'Quadratic Function' },
  { key: 'exponential_growth', label: 'Exponential VS Linear growth' },
  { key: 'function', label: 'Function' },
  { key: 'systems_of_equations', label: 'System Of Equations' },
  { key: 'word_problems', label: 'Word Problems' },
  { key: 'trigonometry', label: 'Basic Trigonometry' },
  { key: 'circles', label: 'The Circle' },
  { key: 'geometry', label: 'Geometry' },
  { key: 'statistics', label: 'Mean, Median, Mode, Range & St. Deviation' },
  { key: 'probability', label: 'Reading Data & Probability' },
];

export default function CanyonMathPractice({ onBack, assignment }) {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [liveExplanation, setLiveExplanation] = useState('');
  const [isGeneratingExpl, setIsGeneratingExpl] = useState(false);

  const checkMatch = (q, key, title = '') => {
    const cat = (q.category || '').toLowerCase();
    const text = (q.question_text || '').toLowerCase();
    const t = title.toLowerCase();
    
    let isMatch = false;
    
    if (key === 'algebra') isMatch = cat.includes('algebra') || cat.includes('linear') || cat.includes('quadratic') || cat.includes('equation') || cat.includes('polynomial');
    else if (key === 'linear_function' || key === 'linear') isMatch = cat.includes('linear');
    else if (key === 'quadratic_function' || key === 'quadratic') isMatch = cat.includes('quadratic') || cat.includes('parabola');
    else if (key === 'exponents_radicals') isMatch = cat.includes('exponent') || cat.includes('radical') || cat.includes('root');
    else if (key === 'ratio_rate') isMatch = cat.includes('ratio') || cat.includes('rate') || cat.includes('proportion');
    else if (key === 'function') isMatch = cat.includes('function') && !cat.includes('linear') && !cat.includes('quadratic');
    else if (key === 'exponential_growth' || key === 'exponential') isMatch = cat.includes('exponential') || cat.includes('growth');
    else if (key === 'systems_of_equations' || key === 'system') isMatch = cat.includes('system');
    else if (key === 'word_problems') isMatch = cat.includes('word') || cat.includes('problem');
    else if (key === 'circles' || key === 'circle') isMatch = cat.includes('circle');
    else if (key === 'geometry') isMatch = cat.includes('geometry') || cat.includes('area') || cat.includes('volume') || cat.includes('triangle');
    else if (key === 'trigonometry' || key === 'trig') isMatch = cat.includes('trig');
    else if (key === 'statistics' || key === 'statistic') isMatch = cat.includes('statistic') || cat.includes('mean') || cat.includes('median');
    else if (key === 'probability') isMatch = cat.includes('probab');
    else if (key === 'inequalities') isMatch = cat.includes('inequalit');
    else if (key === 'percent') isMatch = cat.includes('percent');
    else isMatch = cat.includes(key.replace(/_/g, ' '));

    if (!isMatch) {
      if (key === 'algebra') isMatch = text.includes('algebra') || text.includes('equation');
      else if (key === 'linear_function' || key === 'linear') isMatch = text.includes('linear equation') || text.includes('linear function') || text.includes('slope');
      else if (key === 'quadratic_function' || key === 'quadratic') isMatch = text.includes('quadratic') || text.includes('parabola') || text.includes('x^2');
      else if (key === 'exponents_radicals') isMatch = text.includes('exponent') || text.includes('radical') || text.includes('square root');
      else if (key === 'ratio_rate') isMatch = text.includes('ratio') || text.includes('proportion');
      else if (key === 'function') isMatch = text.includes('f(x)') || text.includes('g(x)');
      else if (key === 'exponential_growth' || key === 'exponential') isMatch = text.includes('exponential');
      else if (key === 'systems_of_equations' || key === 'system') isMatch = text.includes('system of equations');
      else if (key === 'word_problems') isMatch = text.length > 200;
      else if (key === 'circles' || key === 'circle') isMatch = text.includes('circle') && text.includes('radius');
      else if (key === 'geometry') isMatch = text.includes('triangle') || text.includes('rectangle') || text.includes('volume') || text.includes('area');
      else if (key === 'trigonometry' || key === 'trig') isMatch = text.includes(' sin ') || text.includes(' cos ') || text.includes(' tan ');
      else if (key === 'statistics' || key === 'statistic') isMatch = text.includes('mean') || text.includes('median') || text.includes('standard deviation');
      else if (key === 'probability') isMatch = text.includes('probability');
      else if (key === 'inequalities') isMatch = text.includes('inequality') || text.includes('>') || text.includes('<');
      else if (key === 'percent') isMatch = text.includes('percent');
      else isMatch = text.includes(key.replace(/_/g, ' '));
    }

    if (t && isMatch) {
      if (t.includes('linear')) return text.includes('linear') || text.includes('line ') || text.includes('slope');
      if (t.includes('quadratic')) return text.includes('quadratic') || text.includes('parabola') || text.includes('x^2');
      if (t.includes('factoring') || t.includes('polynomial')) return text.includes('polynomial') || text.includes('factor') || text.includes('x^2') || text.includes('x^3');
      if (t.includes('absolute value')) return text.includes('absolute value') || text.includes('|');
      return true;
    }

    return isMatch;
  };
  const [session, setSession] = useState(null); // null | 'active' | 'complete'
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [history, setHistory] = useState([]);
  const [timer, setTimer] = useState(0);
  const [showTutor, setShowTutor] = useState(false);
  const timerRef = React.useRef(null);

  const [selectedCount, setSelectedCount] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ['canyonMath'],
    queryFn: () => base44.entities.CanyonMath.list('-created_date', 1000),
  });

  const getSeenIds = () => {
    try { return new Set(JSON.parse(localStorage.getItem('sat_seen_ids') || '[]')); }
    catch { return new Set(); }
  };
  const markIdsSeen = (ids) => {
    try {
      const existing = getSeenIds();
      ids.forEach(id => existing.add(id));
      localStorage.setItem('sat_seen_ids', JSON.stringify([...existing]));
    } catch {}
  };

  const startSession = async () => {
    const seenIds = getSeenIds();
    let pool = allQuestions.filter(q => !seenIds.has(q.id));
    if (pool.length === 0) pool = [...allQuestions];

    let filteredPool = pool;
    if (selectedTopics.length > 0) {
      filteredPool = pool.filter(q => selectedTopics.some(t => checkMatch(q, t)));
    }

    let finalQuestions = [...filteredPool].sort(() => Math.random() - 0.5);

    if (selectedTopics.length > 0 && finalQuestions.length < selectedCount) {
      setIsGenerating(true);
      try {
        const domain = selectedTopics[0].replace(/_/g, ' ');
        const sampleText = finalQuestions.length > 0 ? finalQuestions[0].question_text : null;
        const res = await base44.functions.invoke('generateSATQuestion', {
          domain, 
          difficulty: 'hard', 
          subject: 'math',
          similarToQuestionText: sampleText
        });
        const aiQs = res.data?.questions || [];
        if (aiQs.length > 0) {
           finalQuestions = [...finalQuestions, ...aiQs];
        }
      } catch(e) {
        console.error(e);
      }
      setIsGenerating(false);

      if (finalQuestions.length < selectedCount) {
        const remainingNeeded = selectedCount - finalQuestions.length;
        const otherQuestions = pool.filter(q => !finalQuestions.find(fq => fq.id === q.id)).sort(() => Math.random() - 0.5);
        finalQuestions = [...finalQuestions, ...otherQuestions.slice(0, remainingNeeded)];
      }
    } else if (finalQuestions.length === 0) {
      finalQuestions = [...pool].sort(() => Math.random() - 0.5);
    }

    const shuffled = finalQuestions.slice(0, selectedCount);
    setQuestions(shuffled);
    setIdx(0);
    setHistory([]);
    setSelectedAnswer('');
    setIsAnswered(false);
    setShowExplanation(false);
    setTimer(0);
    setSession('active');
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const handleSubmit = () => {
    if (!selectedAnswer.trim()) return;
    const q = questions[idx];
    const correct = (q.answer || '').trim().toUpperCase();
    const userAns = selectedAnswer.trim().toUpperCase();
    
    let isCorrect = false;
    if (!correct || correct === 'N/A') {
      isCorrect = true; // Mark correct if no answer key
    } else {
      if (q.options?.length > 0) {
        const matchOpt = q.options.find(opt => opt.label === correct || answersEquivalent(opt.text || opt, correct) || opt.text === q.answer);
        const actualCorrectLabel = matchOpt ? matchOpt.label : correct;
        isCorrect = userAns === actualCorrectLabel;
      } else {
        isCorrect = answersEquivalent(userAns, correct);
      }
    }
      
    setHistory(h => [...h, { 
      id: q.id, 
      correct: isCorrect, 
      domain: q.category || 'math', 
      time: timer,
      user_answer: selectedAnswer,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty || 'hard'
    }]);
    setIsAnswered(true);
    setShowExplanation(true);
    clearInterval(timerRef.current);

    setLiveExplanation('');
    if (!q.explanation || q.explanation.includes('Explanation not provided')) {
      setIsGeneratingExpl(true);
      const prompt = `Solve this SAT math question step-by-step and explain the correct answer.
Question: ${q.question_text}
Options: ${JSON.stringify(q.options || [])}
Correct Answer: ${q.answer}
Provide a clear, concise, step-by-step explanation. Use LaTeX for math.`;
      base44.integrations.Core.InvokeLLM({ prompt }).then(res => {
        setLiveExplanation(res);
        setIsGeneratingExpl(false);
        setHistory(prev => {
          const newH = [...prev];
          newH[newH.length - 1].explanation = res;
          return newH;
        });
        base44.entities.CanyonMath.update(q.id, { explanation: res }).catch(()=>{});
      }).catch(() => {
        setIsGeneratingExpl(false);
      });
    }
  };

  const finishSession = async () => {
    clearInterval(timerRef.current);
    setSession('complete');

    markIdsSeen(history.map(h => h.id));

    if (user && history.length > 0) {
      const correct = history.filter(h => h.correct).length;
      const attempted = history.length;
      const domainCounts = {};
      history.forEach(h => {
        if (!domainCounts[h.domain]) domainCounts[h.domain] = { correct: 0, total: 0 };
        domainCounts[h.domain].total++;
        if (h.correct) domainCounts[h.domain].correct++;
      });
      const sortedDomains = Object.entries(domainCounts).sort((a,b) => (b[1].correct/b[1].total) - (a[1].correct/a[1].total));
      const avgTime = history.reduce((s,h)=>s+h.time,0)/(attempted||1);

      try {
        await base44.entities.PracticeSession.create({
          user_id: user.id,
          session_type: 'choice',
          status: 'completed',
          start_time: new Date(Date.now() - history.reduce((s,h)=>s+h.time,0)*1000).toISOString(),
          end_time: new Date().toISOString(),
          questions_attempted: attempted,
          questions_correct: correct,
          duration_minutes: Math.max(1, Math.round(history.reduce((s,h)=>s+h.time,0)/60)),
          domains_covered: [...new Set(history.map(h => h.domain))],
          question_history: history.map(h => ({
            question_id: h.id,
            user_answer: h.user_answer,
            correct: h.correct,
            time_spent_seconds: h.time,
            domain: h.domain,
            difficulty: h.difficulty,
            question_text: h.question_text,
            options: h.options,
            correct_answer: h.correct_answer,
            explanation: h.explanation
          })),
          performance_summary: {
             accuracy_percentage: Math.round((correct/attempted)*100),
             avg_time_per_question: Math.round(avgTime),
             strongest_domain: sortedDomains[0]?.[0] || '',
             weakest_domain: sortedDomains[sortedDomains.length - 1]?.[0] || ''
          }
        });

        await awardForSession(user.id, {
          questions_correct: correct,
          questions_attempted: attempted,
          current_difficulty: 'hard'
        });

        await recalculateKnowledgeGraph(user.id, base44);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleNext = () => {
    setShowTutor(false);
    if (idx < questions.length - 1) {
      setIdx(i => i + 1);
      setSelectedAnswer('');
      setIsAnswered(false);
      setShowExplanation(false);
      setLiveExplanation('');
      setIsGeneratingExpl(false);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      finishSession();
    }
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  if (session === 'complete') {
    const correct = history.filter(h => h.correct).length;
    const acc = Math.round((correct / history.length) * 100);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
          <Award className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Canyon Math Complete!</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-800">{correct}/{history.length}</p><p className="text-xs text-gray-500">Correct</p></CardContent></Card>
          <Card className="bg-stone-50 border-stone-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-800">{acc}%</p><p className="text-xs text-gray-500">Accuracy</p></CardContent></Card>
          <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-800">{Math.round(history.reduce((s,h)=>s+h.time,0)/(history.length||1))}s</p><p className="text-xs text-gray-500">Avg Time</p></CardContent></Card>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="outline" onClick={() => { setSession(null); setHistory([]); }} className="gap-2"><RotateCcw className="w-4 h-4" />Try Again</Button>
          <Button variant="outline" onClick={onBack}>← Back to SAT Practice</Button>
        </div>
      </motion.div>
    );
  }

  if (session === 'active' && questions.length > 0) {
    const q = questions[idx];
    const isMultiChoice = Array.isArray(q.options) && q.options.length > 0 && q.options.some(opt => opt && (opt.label || typeof opt === 'string'));
    const correctAnswer = (q.answer || '').trim().toUpperCase();
    const progress = ((idx + 1) / questions.length) * 100;
    
    let actualCorrectLabel = correctAnswer;
    if (isMultiChoice) {
      const matchOpt = q.options.find(opt => opt.label === correctAnswer || answersEquivalent(opt.text || opt, correctAnswer) || opt.text === q.answer);
      if (matchOpt) actualCorrectLabel = matchOpt.label;
    }

    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Canyon Math</Badge>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <CalculatorPanel tools={assignment?.assignment_config?.tools_enabled} />
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(timer)}</span>
            <span>{idx+1}/{questions.length}</span>
          </div>
        </div>
        <Progress value={progress} className="h-2 mb-5 bg-gray-100" />

        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-lg mb-4">
              <CardContent className="p-6">
                <div className="flex gap-2 mb-4 items-center">
                  {q.category && <Badge variant="outline" className="text-xs">{q.category}</Badge>}
                  {q.difficulty && <Badge variant="outline" className={`text-xs ${q.difficulty === 'easy' ? 'text-emerald-600 border-emerald-300' : q.difficulty === 'hard' ? 'text-red-600 border-red-300' : 'text-stone-600 border-stone-300'}`}>{q.difficulty}</Badge>}
                  <div className="ml-auto flex items-center gap-1">
                  </div>
                </div>
                <p className="text-[1.05rem] text-gray-800 mb-6 leading-loose whitespace-pre-line">
                  <MathText>{q.question_text}</MathText>
                </p>
                {isMultiChoice ? (
                  <div className="space-y-4">
                    {q.options.map(opt => {
                      const isSelected = selectedAnswer === opt.label;
                      const isCorrectOpt = opt.label === actualCorrectLabel;
                      let cls = 'border-gray-200';
                      if (isAnswered) {
                        if (isCorrectOpt) cls = 'border-emerald-500 bg-emerald-50';
                        else if (isSelected) cls = 'border-red-500 bg-red-50';
                      } else if (isSelected) cls = 'border-emerald-400 bg-emerald-50/60';
                      return (
                        <div key={opt.label} onClick={() => !isAnswered && setSelectedAnswer(opt.label)}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${cls} ${!isAnswered ? 'hover:border-emerald-300' : ''}`}>
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${isAnswered && isCorrectOpt ? 'bg-emerald-500 border-emerald-500 text-white' : isAnswered && isSelected ? 'bg-red-500 border-red-500 text-white' : isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-gray-500'}`}>{opt.label}</div>
                          <div className="text-base text-gray-700 flex-1 leading-relaxed"><MathText>{opt.text}</MathText></div>
                          {isAnswered && isCorrectOpt && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                          {isAnswered && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <Input value={selectedAnswer} onChange={e => setSelectedAnswer(sanitizeMathInput(e.target.value))} disabled={isAnswered} placeholder="Enter your answer..." className="text-base p-3 border-2" />
                    {!isAnswered && (
                      <MathKeyboard onInsert={(val) => setSelectedAnswer(prev => prev + val)} />
                    )}
                    {isAnswered && (() => {
                      const ok = (!correctAnswer || correctAnswer === 'N/A') ? true : answersEquivalent(selectedAnswer.trim().toUpperCase(), correctAnswer);
                      return (
                        <div className={`mt-2 flex items-center gap-2 text-sm ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
                          {ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          Correct answer: {q.answer || 'N/A'}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {showExplanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {assignment?.assignment_config?.tools_enabled?.explanations !== false && (
                  <>
                    {(!q.explanation || q.explanation.includes('Explanation not provided')) && isGeneratingExpl && (
                      <Card className={`border-2 mb-4 ${history[history.length-1]?.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-300'}`}>
                        <CardContent className="p-4 flex items-center gap-2 text-sm text-gray-500">
                          Generating explanation...
                        </CardContent>
                      </Card>
                    )}
                    {((q.explanation && !q.explanation.includes('Explanation not provided')) || liveExplanation) && (
                      <Card className={`border-2 mb-4 ${history[history.length-1]?.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-300'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-900">{history[history.length-1]?.correct ? '✓ Correct!' : '✗ Here\'s the solution:'}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed"><MathText>{liveExplanation || q.explanation}</MathText></p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* AI Tutor */}
                {assignment?.assignment_config?.tools_enabled?.ai_tutor !== false && (
                  !showTutor ? (
                    <button
                      onClick={() => setShowTutor(true)}
                      className={`w-full mb-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        !history[history.length-1]?.correct
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      🤖 {!history[history.length-1]?.correct ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                    </button>
                  ) : (
                    <QuestionTutor
                      question={{
                        question_text: q.question_text,
                        correct_answer: q.answer,
                        explanation: q.explanation,
                        domain: q.category,
                        difficulty: q.difficulty,
                        options: q.options,
                      }}
                      userAnswer={selectedAnswer}
                      isCorrect={history[history.length-1]?.correct}
                      onClose={() => setShowTutor(false)}
                    />
                  )
                )}
              </motion.div>
            )}

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-100">
              <div className="flex-1">
                <ReportQuestionModal 
                  question={q} 
                  source={q.source || q.source_pdf}
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
                  <Button onClick={handleSubmit} disabled={!selectedAnswer.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white">Submit Answer</Button>
                ) : (
                  <Button onClick={handleNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    {idx < questions.length - 1 ? 'Next Question' : 'Finish Session'} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Setup screen
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
            <Filter className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-white">Canyon Math Practice</h2>
            <p className="text-white/80 text-sm">Advanced Digital SAT classified practice questions</p>
          </div>
        </div>
      </div>

      <Card className="border border-stone-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">Filter by topic <span className="font-normal text-gray-400">(optional)</span></span>
            {selectedTopics.length > 0 && (
              <button onClick={() => setSelectedTopics([])} className="ml-auto text-xs text-emerald-500 hover:text-emerald-700 underline">Clear all</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CANYON_TOPICS.map(t => {
              const sel = selectedTopics.includes(t.key);
              return (
                <button key={t.key} onClick={() => setSelectedTopics(p => sel ? p.filter(x => x !== t.key) : [...p, t.key])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-emerald-200 hover:border-emerald-400'}`}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center">Loading questions…</p>
      ) : (
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-sm font-semibold text-gray-700">Questions:</span>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(num => (
                <button 
                  key={num} 
                  onClick={() => setSelectedCount(num)}
                  className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${selectedCount === num ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-gray-600 border border-emerald-200 hover:border-emerald-400'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">{allQuestions.length} questions available{selectedTopics.length > 0 ? ` (filtering by ${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''})` : ''}</p>
          <Button onClick={startSession} disabled={isGenerating} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full text-base font-bold shadow-lg">
            {isGenerating ? "Preparing Questions..." : "Start Practice Session"}
          </Button>
        </div>
      )}

      <button onClick={onBack} className="block text-sm text-stone-400 hover:text-stone-600 underline mx-auto">← Back to SAT Practice</button>
    </div>
  );
}
