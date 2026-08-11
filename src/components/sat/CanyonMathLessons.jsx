import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronDown, CheckCircle, XCircle, BookOpen, Zap, RotateCcw, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from '@/components/sat/MathText';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import QuestionTutor from '@/components/sat/QuestionTutor';
import { sanitizeMathInput } from '@/utils/mathUtils';

const LESSONS = [
  {
    section: 'Algebra', color: 'emerald',
    topics: [
      { title: 'Linear Equations', categoryKey: 'algebra', concept: `A linear equation has the form ax + b = c. To solve, isolate x by performing the same operation on both sides.\n\n• Distribute/expand any parentheses\n• Combine like terms on each side\n• Move variable terms to one side, constants to the other\n• Divide by the coefficient of x\n\nExample: 3x + 7 = 22 → 3x = 15 → x = 5` },
      { title: 'Quadratic Equations', categoryKey: 'algebra', concept: `A quadratic has the form ax² + bx + c = 0.\n\n• Factoring: x² + 5x + 6 = (x+2)(x+3) = 0 → x = -2 or -3\n• Quadratic formula: x = (-b ± √(b²-4ac)) / 2a\n• Completing the square: rewrite as (x+h)² = k\n\nDiscriminant (b²-4ac): >0 → two solutions; =0 → one; <0 → none` },
      { title: 'Factoring Polynomials', categoryKey: 'algebra', concept: `Common patterns:\n• Difference of squares: a² - b² = (a+b)(a-b)\n• Perfect square: a² + 2ab + b² = (a+b)²\n• Grouping: factor pairs of terms\n\nFor ax² + bx + c: find factors of a·c that sum to b.` },
      { title: 'Absolute Value Equations', categoryKey: 'algebra', concept: `|expression| = k means expression = k OR expression = -k (when k ≥ 0)\n\nIf k < 0: no solution. If k = 0: one solution.\n\nExample: |2x - 3| = 7 → x = 5 or x = -2` },
    ],
  },
  {
    section: 'Advanced Math', color: 'stone',
    topics: [
      { title: 'Exponents and Radicals', categoryKey: 'exponents_radicals', concept: `Exponent rules:\n• aᵐ · aⁿ = aᵐ⁺ⁿ\n• aᵐ / aⁿ = aᵐ⁻ⁿ\n• (aᵐ)ⁿ = aᵐⁿ\n• a⁻ⁿ = 1/aⁿ\n• a^(m/n) = ⁿ√(aᵐ)\n\nTo rationalize: multiply by conjugate. Connect: a^(1/n) = ⁿ√a` },
      { title: 'Function', categoryKey: 'function', concept: `A function f maps each input x to exactly one output f(x).\n\n• Composition: f(g(x)) — apply g first, then f\n• Inverse: swap x and y, solve for y\n\nTransformations: f(x)+k shifts up, f(x-h) shifts right, -f(x) reflects over x-axis, kf(x) stretches vertically.` },
      { title: 'Exponential VS Linear growth', categoryKey: 'exponential_growth', concept: `Linear: adds a constant each step (f(x) = mx + b)\nExponential: multiplies by a constant each step (f(x) = a·bˣ)\n\n• b > 1 → growth\n• 0 < b < 1 → decay\n\nf(x) = 500(1.08)ˣ → 8% growth per period` },
      { title: 'System Of Equations', categoryKey: 'systems_of_equations', concept: `Substitution: solve one equation for one variable, substitute.\nElimination: multiply to match coefficients, add/subtract to eliminate.\n\nNumber of solutions:\n• One: lines intersect\n• None: parallel lines\n• Infinite: same line` },
    ],
  },
  {
    section: 'Problem Solving & Data Analysis', color: 'emerald',
    topics: [
      { title: 'Ratio and Rate', categoryKey: 'ratio_rate', concept: `Ratio: comparison a:b. Rate: ratio with different units.\nProportion: two equal ratios → cross-multiply.\n\nPercent change = (new - old)/old × 100%\nUnit conversion: multiply so units cancel.` },
      { title: 'Mean, Median, Mode, Range & St. Deviation', categoryKey: 'statistics', concept: `Mean = sum ÷ count. Median = middle value. Mode = most frequent.\n\n• Adding constant c: shifts mean & median by c, doesn't change SD\n• Multiplying by k: scales mean, median, SD, and range by k\n\nFor skewed data: median is more representative.` },
      { title: 'Reading Data & Probability', categoryKey: 'probability', concept: `P(event) = favorable / total\n• P(A or B) = P(A) + P(B) − P(A and B)\n• P(A and B) = P(A) × P(B) for independent events\n• Combinations: C(n,r) = n!/(r!(n-r)!)\n• Expected value = Σ(value × probability)` },
    ],
  },
  {
    section: 'Geometry & Trigonometry', color: 'stone',
    topics: [
      { title: 'The Circle', categoryKey: 'circles', concept: `Equation: (x-h)² + (y-k)² = r². Center (h,k), radius r.\n• Area: πr²\n• Circumference: 2πr\n• Arc length: s = rθ (radians)\n• Tangent lines: perpendicular to radius at point of tangency` },
      { title: 'Basic Trigonometry', categoryKey: 'trigonometry', concept: `SOH-CAH-TOA in a right triangle:\n• sin A = opp/hyp\n• cos A = adj/hyp\n• tan A = opp/adj = sin/cos\n\n30-60-90: 1:√3:2. 45-45-90: 1:1:√2\nsin(x) = cos(90°−x)\nUnit circle: point = (cos θ, sin θ)` },
      { title: 'Geometry: Areas & Volumes', categoryKey: 'geometry', concept: `2D: Rectangle l×w, Triangle ½bh, Circle πr², Trapezoid ½(b₁+b₂)h\n3D: Cylinder πr²h, Cone ⅓πr²h, Sphere ⁴⁄₃πr³, Pyramid ⅓×base×h\n\nSimilar figures scale factor k: areas ×k², volumes ×k³` },
    ],
  },
];

// AI-powered 1-on-1 tutor chat when no DB questions exist for a topic
function AITutorSession({ topic, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async () => {
    setStarted(true);
    setLoading(true);
    const systemContext = `You are an expert SAT math tutor working 1-on-1 with a student on the topic "${topic.title}". 
Here is the concept summary for this topic:
${topic.concept}

Your job:
1. Give the student a practice question on this topic (make it SAT-style, clear, with 4 multiple choice options labeled A-D or as a fill-in-the-blank).
2. Wait for their answer.
3. If correct, congratulate them and either offer a harder follow-up or explain why it's correct.
4. If incorrect, give a hint, then guide them step-by-step to the answer.
5. Keep going — give new questions, adjust difficulty based on performance, and keep it encouraging.
Start by briefly confirming the topic and giving the first question.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: systemContext,
    });
    setMessages([{ role: 'assistant', content: res }]);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const conversationHistory = newMessages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n\n');
    const prompt = `You are an expert SAT math tutor working 1-on-1 on the topic "${topic.title}".
Concept reference:
${topic.concept}

Conversation so far:
${conversationHistory}

Continue as the tutor. If the student answered a question, evaluate their answer and provide the next step (hint, correction, or new question). Keep it concise, encouraging, and mathematically precise.`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: 'assistant', content: res }]);
    setLoading(false);
  };

  if (!started) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="border border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{topic.title}</h3>
            <p className="text-sm text-gray-600">No practice questions are in the database for this topic yet — but your AI tutor can work through problems with you 1-on-1, just like a real session.</p>
            <Button onClick={startSession} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full gap-2">
              <Zap className="w-4 h-4" /> Start 1-on-1 Tutor Session
            </Button>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={onBack} className="w-full">Back to Lessons</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-xs text-stone-400 hover:text-stone-600 underline">Back to Lessons</button>
          <span className="text-gray-300">|</span>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">AI Tutor — {topic.title}</Badge>
        </div>
        <CalculatorPanel />
      </div>

      <Card className="border border-emerald-200 shadow-md">
        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-100 text-gray-800 border border-stone-200'
                }`}>
                  <MathText>{msg.content}</MathText>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-stone-100 p-3 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type your answer or question..."
              className="flex-1 border-emerald-200 focus:border-emerald-400"
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LessonTopicView({ topic, allQuestions, onBack }) {
  const [phase, setPhase] = useState('concept');
  const [question, setQuestion] = useState(null);
  const [noQuestions, setNoQuestions] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [usedIds, setUsedIds] = useState([]);
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

  const getSeenIds = () => {
    try { return new Set(JSON.parse(localStorage.getItem('sat_seen_ids') || '[]')); }
    catch { return new Set(); }
  };
  const markIdSeen = (id) => {
    try {
      const existing = getSeenIds();
      existing.add(id);
      localStorage.setItem('sat_seen_ids', JSON.stringify([...existing]));
    } catch {}
  };

  const pickQuestion = () => {
    const seenIds = getSeenIds();
    const pool = allQuestions.filter(q => checkMatch(q, topic.categoryKey, topic.title) && !usedIds.includes(q.id) && !seenIds.has(q.id));
    if (pool.length === 0) {
      const fallback = allQuestions.filter(q => checkMatch(q, topic.categoryKey, topic.title));
      if (fallback.length === 0) {
        setNoQuestions(true);
        setPhase('practice');
        return;
      }
      const picked = fallback[Math.floor(Math.random() * fallback.length)];
      setUsedIds([picked.id]);
      setQuestion(picked);
    } else {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setUsedIds(prev => [...prev, picked.id]);
      setQuestion(picked);
    }
    setSelectedAnswer('');
    setIsAnswered(false);
    setIsCorrect(false);
    setShowTutor(false);
    setLiveExplanation('');
    setIsGeneratingExpl(false);
    setNoQuestions(false);
    setPhase('practice');
  };

  const handleSubmit = async () => {
    if (!selectedAnswer.trim() || !question) return;
    const correct = (question.answer || '').trim().toUpperCase();
    const userAns = selectedAnswer.trim().toUpperCase();
    const result = question.options?.length > 0
      ? userAns === correct
      : userAns.replace(/\s/g, '') === correct.replace(/\s/g, '');
    setIsCorrect(result);
    setIsAnswered(true);
    markIdSeen(question.id);
    
    setLiveExplanation('');
    if (!question.explanation || question.explanation.includes('Explanation not provided')) {
      setIsGeneratingExpl(true);
      const prompt = `Solve this SAT math question step-by-step and explain the correct answer.
Question: ${question.question_text}
Options: ${JSON.stringify(question.options || [])}
Correct Answer: ${question.answer}
Provide a clear, concise, step-by-step explanation. Use LaTeX for math.`;
      base44.integrations.Core.InvokeLLM({ prompt }).then(res => {
        setLiveExplanation(res);
        setIsGeneratingExpl(false);
        setQuestion(q => ({...q, explanation: res}));
        base44.entities.CanyonMath.update(question.id, { explanation: res }).catch(()=>{});
      }).catch(() => {
        setIsGeneratingExpl(false);
      });
    }

    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.entities.PracticeSession.create({
          user_id: user.id,
          session_type: 'lesson',
          status: 'completed',
          start_time: new Date(Date.now() - 30000).toISOString(),
          end_time: new Date().toISOString(),
          questions_attempted: 1,
          questions_correct: result ? 1 : 0,
          duration_minutes: 1,
          domains_covered: [question.category || topic.categoryKey],
          question_history: [{
            question_id: question.id,
            user_answer: userAns,
            correct: result,
            time_spent_seconds: 30,
            domain: question.category || topic.categoryKey,
            difficulty: question.difficulty || 'medium',
            question_text: question.question_text,
            options: question.options,
            correct_answer: question.answer || question.correct_answer,
            explanation: question.explanation
          }],
          performance_summary: {
            accuracy_percentage: result ? 100 : 0,
            avg_time_per_question: 30,
            strongest_domain: result ? (question.category || topic.categoryKey) : '',
            weakest_domain: result ? '' : (question.category || topic.categoryKey)
          }
        });
        const gamification = await import('@/utils/gamification');
        await gamification.awardForSession(user.id, {
          questions_correct: result ? 1 : 0,
          questions_attempted: 1,
          current_difficulty: question.difficulty || 'medium'
        });
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleBackToConcept = () => {
    setPhase('concept');
    setQuestion(null);
    setSelectedAnswer('');
    setIsAnswered(false);
    setShowTutor(false);
    setLiveExplanation('');
    setIsGeneratingExpl(false);
    setNoQuestions(false);
  };

  if (phase === 'concept') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="border border-emerald-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-lg">{topic.title}</h3>
            </div>
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{topic.concept}</pre>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>Back to Lessons</Button>
          <Button onClick={pickQuestion} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 flex-1">
            <Zap className="w-4 h-4" /> Practice This Topic
          </Button>
        </div>
      </motion.div>
    );
  }

  // No DB questions — fall back to AI tutor
  if (noQuestions) {
    return <AITutorSession topic={topic} onBack={handleBackToConcept} />;
  }

  if (!question) return null;

  const isMultiChoice = question.options && question.options.length > 0;
  const correctAnswer = (question.answer || '').trim().toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={handleBackToConcept} className="text-xs text-stone-400 hover:text-stone-600 underline">Concept</button>
          <span className="text-gray-300">|</span>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{topic.title}</Badge>
          {question.difficulty && (
            <Badge variant="outline" className={`text-xs ${question.difficulty === 'easy' ? 'text-emerald-600 border-emerald-300' : question.difficulty === 'hard' ? 'text-red-600 border-red-300' : 'text-stone-600 border-stone-300'}`}>
              {question.difficulty}
            </Badge>
          )}
        </div>
        <CalculatorPanel />
      </div>

      <Card className="bg-white border border-emerald-200 shadow-sm">
        <CardContent className="p-6">
          <p className="text-base text-gray-800 mb-5 leading-relaxed whitespace-pre-line">
            <MathText>{question.question_text}</MathText>
          </p>
          {isMultiChoice ? (
            <div className="space-y-3">
              {question.options.map(opt => {
                const isSelected = selectedAnswer === opt.label;
                const isCorrectOpt = opt.label === correctAnswer;
                let cls = 'border-gray-200';
                if (isAnswered) {
                  if (isCorrectOpt) cls = 'border-emerald-500 bg-emerald-50';
                  else if (isSelected) cls = 'border-red-400 bg-red-50';
                } else if (isSelected) cls = 'border-emerald-400 bg-emerald-50/60';
                return (
                  <div key={opt.label} onClick={() => !isAnswered && setSelectedAnswer(opt.label)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${cls} ${!isAnswered ? 'hover:border-emerald-300' : ''}`}>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${isAnswered && isCorrectOpt ? 'bg-emerald-500 border-emerald-500 text-white' : isAnswered && isSelected ? 'bg-red-400 border-red-400 text-white' : isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-gray-500'}`}>
                      {opt.label}
                    </div>
                    <span className="text-sm text-gray-700 flex-1"><MathText>{opt.text}</MathText></span>
                    {isAnswered && isCorrectOpt && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                    {isAnswered && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <Input value={selectedAnswer} onChange={e => setSelectedAnswer(sanitizeMathInput(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && !isAnswered && handleSubmit()}
                disabled={isAnswered} placeholder="Enter your answer..." className="text-base p-3 border-2" />
              {isAnswered && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                  {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Correct answer: {question.answer}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {isAnswered && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {isCorrect ? 'Correct!' : `Not quite — the answer was ${question.answer}`}
            </div>
            {(!question.explanation || question.explanation.includes('Explanation not provided')) && isGeneratingExpl && (
              <Card className="border-stone-200 bg-stone-50">
                <CardContent className="p-4 text-sm text-gray-500">
                  Generating explanation...
                </CardContent>
              </Card>
            )}
            {((question.explanation && !question.explanation.includes('Explanation not provided')) || liveExplanation) && (
              <Card className="border-stone-200 bg-stone-50">
                <CardContent className="p-4 text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold text-stone-800 mb-1">Explanation</p>
                  <MathText>{liveExplanation || question.explanation}</MathText>
                </CardContent>
              </Card>
            )}
            {!showTutor ? (
              <button onClick={() => setShowTutor(true)}
                className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${!isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}>
                {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor a follow-up'}
              </button>
            ) : (
              <QuestionTutor
                question={{ question_text: question.question_text, correct_answer: question.answer, explanation: question.explanation, domain: question.category, difficulty: question.difficulty, options: question.options }}
                userAnswer={selectedAnswer} isCorrect={isCorrect} onClose={() => setShowTutor(false)}
              />
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={handleBackToConcept} className="gap-2"><BookOpen className="w-4 h-4" /> Review Concept</Button>
              <Button onClick={pickQuestion} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 flex-1"><RotateCcw className="w-4 h-4" /> Next Question</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAnswered && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!selectedAnswer.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white">Check Answer</Button>
        </div>
      )}
    </motion.div>
  );
}

export default function CanyonMathLessons({ onBack }) {
  const [openSection, setOpenSection] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ['canyonMath'],
    queryFn: () => base44.entities.CanyonMath.list('-created_date', 200),
  });

  if (activeTopic) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-stone-400">{activeTopic.sectionLabel}</p>
            <h2 className="font-bold text-gray-900">{activeTopic.topic.title}</h2>
          </div>
        </div>
        <LessonTopicView topic={activeTopic.topic} allQuestions={allQuestions} onBack={() => setActiveTopic(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Banner matching site design */}
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-white">Canyon Math Lessons</h2>
            <p className="text-white/80 text-sm">Learn a concept, then practice with real questions and AI tutor</p>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400 text-center">Loading question bank...</p>}

      {LESSONS.map((sec, si) => (
        <Card key={si} className="border border-stone-200 overflow-hidden shadow-sm">
          <button className="w-full p-4 text-left flex items-center justify-between hover:bg-stone-50 transition-colors"
            onClick={() => setOpenSection(openSection === si ? null : si)}>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900">{sec.section}</span>
              <span className="text-xs text-gray-400">{sec.topics.length} topics</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openSection === si ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openSection === si && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="border-t border-stone-100 divide-y divide-stone-100">
                  {sec.topics.map((topic, ti) => (
                    <button key={ti} className="w-full px-6 py-3.5 text-left flex items-center justify-between hover:bg-emerald-50/50 transition-colors group"
                      onClick={() => setActiveTopic({ topic, sectionLabel: sec.section })}>
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{topic.title}</span>
                        <p className="text-xs text-gray-400 mt-0.5">Concept review + practice</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}

      <button onClick={onBack} className="block text-sm text-stone-400 hover:text-stone-600 underline mx-auto pb-4">Back to SAT Practice</button>
    </div>
  );
}
