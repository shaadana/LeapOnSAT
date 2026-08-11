import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, CheckCircle, XCircle, Loader2, RotateCcw, ArrowLeft, Lightbulb, Pencil, Star, Send, Sparkles, Brain } from 'lucide-react';
import CalculatorPanel from './CalculatorPanel';
import MathText from './MathText';
import DesmosCalculatorEmbed from '@/components/desmos/DesmosCalculatorEmbed';
import { awardForSession } from '@/utils/gamification';
import SessionRewardModal from '@/components/gamification/SessionRewardModal';
import { recalculateKnowledgeGraph } from '@/utils/satMasterySync';

const DOMAIN_LABELS = {
  algebra: 'Algebra', advanced_algebra: 'Advanced Algebra', geometry: 'Geometry',
  trigonometry: 'Trigonometry', statistics: 'Statistics', problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems of Equations', quadratics: 'Quadratics',
  exponentials: 'Exponentials', ratios_proportions: 'Ratios & Proportions',
  circles: 'Circles', polynomials: 'Polynomials',
};

const SUBTOPICS = {
  algebra: [
    'Solving one-step equations', 'Solving multi-step equations', 'Literal equations (solving for a variable)',
    'Translating words into algebraic expressions', 'Combining like terms', 'Distributive property',
    'Slope: calculating from two points', 'Slope-intercept form y=mx+b', 'Point-slope form',
    'Standard form Ax+By=C', 'Parallel and perpendicular lines', 'Graphing linear equations',
    'Linear inequalities: solving and graphing', 'Compound inequalities', 'Absolute value equations',
    'Absolute value inequalities', 'Systems of equations: substitution', 'Systems of equations: elimination',
    'Number of solutions in a linear system', 'Function notation f(x)', 'Domain and range',
    'Average rate of change', 'Linear models: interpreting slope in context', 'Word problems with systems',
  ],
  advanced_algebra: [
    'Adding and subtracting polynomials', 'Multiplying polynomials (FOIL)', 'Polynomial long division',
    'Synthetic division', 'Factoring out the GCF', 'Factoring trinomials when a=1',
    'Factoring trinomials when a≠1', 'Difference of squares pattern', 'Perfect square trinomials',
    'Completing the square', 'Quadratic formula', 'Discriminant: number and type of roots',
    'Vertex form of a parabola', 'Zeros and graphs of quadratic functions', "Vieta's formulas: sum and product of roots",
    'Remainder theorem', 'Factor theorem', 'Polynomial graphs and end behavior',
    'Simplifying rational expressions', 'Solving rational equations', 'Extraneous solutions',
    'Simplifying radicals and rational exponents', 'Solving radical equations',
    'Exponential growth and decay', 'Solving exponential equations by matching bases',
    'Logarithm rules: product, quotient, power', 'Solving logarithmic equations',
    'Function composition f(g(x))', 'Inverse functions', 'Function transformations: shifts and reflections',
    'Complex numbers: operations with i',
  ],
  geometry: [
    'Supplementary and complementary angles', 'Vertical angles', 'Parallel lines cut by a transversal',
    'Triangle angle sum theorem', 'Exterior angle theorem', 'Triangle congruence criteria (SSS, SAS, ASA)',
    'Triangle similarity criteria (AA)', '30-60-90 special right triangle', '45-45-90 special right triangle',
    'Pythagorean theorem', 'Pythagorean triples', 'Distance formula between two points',
    'Midpoint formula', 'Similar figures and scale factor', 'Perimeter of polygons',
    'Area of triangles', 'Area of parallelograms and trapezoids', 'Interior angle sum of polygons',
    'Circumference and area of circles', 'Arc length formula', 'Sector area formula',
    'Inscribed angle theorem', 'Circle equation (x-h)²+(y-k)²=r²', 'Completing the square for circles',
    'Volume of prisms and cylinders', 'Volume of pyramids and cones', 'Volume of spheres',
    'Surface area of 3D figures', 'Composite and shaded area problems', 'Geometric transformations in the plane',
  ],
  trigonometry: [
    'SOH-CAH-TOA: setting up trig ratios', 'Finding a missing side using sine', 'Finding a missing side using cosine',
    'Finding a missing side using tangent', 'Finding a missing angle using inverse trig',
    'Special angle values: 30°, 45°, 60°', 'Angle of elevation problems', 'Angle of depression problems',
    'Converting between degrees and radians', 'Arc length with radians s=rθ',
    'Unit circle: coordinates and quadrants', 'Reference angles', 'Pythagorean identity sin²θ+cos²θ=1',
    'Complementary angle identity sin(90°−θ)=cosθ', 'Solving basic trig equations',
    'Graphs of y=sin(x) and y=cos(x)', 'Amplitude of a trig function', 'Period of a trig function',
    'Phase shift of a trig function', 'Law of sines', 'Law of cosines',
    'Area of a triangle using trig: (1/2)ab·sinC', 'Double angle formula: sin2θ=2sinθcosθ',
    'Inverse trig functions: domain and range',
  ],
  statistics: [
    'Calculating mean from a data set', 'Finding median from ordered data', 'Weighted averages',
    'Finding a missing value given the mean', 'Range and interquartile range (IQR)',
    'Interpreting standard deviation conceptually', 'Reading box plots (five-number summary)',
    'Reading histograms and dot plots', 'Skewed vs. symmetric distributions',
    'Mean vs. median in skewed distributions', 'Scatterplots: correlation direction and strength',
    'Line of best fit: slope and intercept interpretation', 'Residuals and residual plots',
    'Two-way tables: joint and marginal frequencies', 'Two-way tables: conditional probability',
    'Basic probability: favorable/total', 'Complementary events', 'Independent vs. dependent events',
    'Multiplication rule for independent events', 'Counting principle', 'Permutations nPr',
    'Combinations nCr', 'Statistical inference and sampling bias', 'Margin of error',
    'Normal distribution and the 68-95-99.7 rule', 'Expected value',
  ],
  problem_solving: [
    'Dimensional analysis: single-step unit conversion', 'Dimensional analysis: chain conversions',
    'Combined work rate problems (1/a + 1/b = 1/t)', 'Distance-rate-time: single trip',
    'Distance-rate-time: meeting/catch-up problems', 'Round-trip average speed',
    'Mixture concentration problems', 'Simple interest I=Prt', 'Compound interest A=P(1+r/n)^nt',
    'Percent discount problems', 'Successive percent changes', 'Direct variation y=kx',
    'Inverse variation y=k/x', 'Ratio word problems: part-to-whole',
    'Arithmetic sequences: nth term', 'Arithmetic series: sum formula',
    'Geometric sequences: nth term', 'Geometric series: sum formula',
    'Overlapping sets with Venn diagrams', 'Age and number puzzles',
    'Optimization: maximizing/minimizing with algebra', 'SAT strategy: plugging in numbers',
    'SAT strategy: working backwards from answer choices', 'Multi-part problem breakdown strategy',
  ],
  systems_of_equations: [
    'Substitution method', 'Elimination method', 'Number of solutions (1, 0, infinite)',
    'Setting up systems from word problems', 'Linear-quadratic systems',
  ],
  quadratics: [
    'Factoring to solve quadratics', 'Quadratic formula', 'Completing the square',
    'Vertex and axis of symmetry', 'Discriminant and roots', 'Projectile motion problems',
  ],
  exponentials: [
    'Exponential growth/decay models', 'Properties of exponents', 'Fractional exponents',
    'Solving exponential equations', 'Logarithms', 'Compound interest',
  ],
  ratios_proportions: [
    'Direct and inverse variation', 'Unit rates', 'Scale and proportional reasoning',
    'Similar triangles and proportions', 'Percent problems',
  ],
  circles: [
    'Circle equation in standard form', 'Arc length and sector area', 'Inscribed angles',
    'Tangent lines', 'Chords and secants', 'Completing the square for circles',
  ],
  polynomials: [
    'Factoring strategies', 'Remainder and factor theorems', 'Polynomial long division',
    "Vieta's formulas", 'Polynomial graphs and zeros',
  ],
};

export default function LessonViewer({ domain, subtopic: initialSubtopic, onBack, onLessonComplete }) {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('picker');
  const [selectedSubtopic, setSelectedSubtopic] = useState(initialSubtopic || '');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionReward, setSessionReward] = useState(null);

  // Chat state
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Tracking
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        if (profiles[0]) setProfile(profiles[0]);
      }
    }).catch(() => {});
  }, []);

  // Auto-start the lesson if an initial subtopic was provided via URL
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!user) return; // need user loaded before starting agent conversation
    if (initialSubtopic && initialSubtopic.trim()) {
      autoStartedRef.current = true;
      startInteractiveLesson(initialSubtopic);
    }
  }, [initialSubtopic, user]);

  const logLessonSession = async (finalScore, totalProblems) => {
    if (!user) return;
    const accuracy = totalProblems > 0 ? Math.round((finalScore / totalProblems) * 100) : 100;
    
    const endTime = new Date();
    const durationMinutes = sessionStartTime ? Math.round((endTime.getTime() - sessionStartTime) / 60000) : 0;

    await base44.entities.PracticeSession.create({
      user_id: user.id,
      session_type: 'lesson',
      status: 'completed',
      from_study_plan: searchParams.get('studyPlan') === 'true',
      start_time: sessionStartTime ? new Date(sessionStartTime).toISOString() : new Date().toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: Math.max(1, durationMinutes),
      questions_attempted: totalProblems,
      questions_correct: finalScore,
      domains_covered: [domain],
      performance_summary: { accuracy_percentage: accuracy },
    });

    try {
      await recalculateKnowledgeGraph(user.id, base44);
    } catch (e) {
      console.error('Failed to sync mastery to graph', e);
    }
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles[0]) {
      const satPerf = profiles[0].sat_performance || {};
      const domainScores = satPerf.domain_scores || {};
      const prev = domainScores[domain];
      const newScore = prev != null ? Math.round((prev + accuracy) / 2) : accuracy;
      await base44.entities.UserProfile.update(profiles[0].id, {
        sat_performance: {
          ...satPerf,
          domain_scores: { ...domainScores, [domain]: newScore },
          total_questions_attempted: (satPerf.total_questions_attempted || 0) + totalProblems,
          total_correct: (satPerf.total_correct || 0) + finalScore,
          last_diagnostic_date: new Date().toISOString(),
        },
      });
      
      try {
        const ef = profiles[0]?.executive_functioning || null;
        const reward = await awardForSession(user.id, {
          questions_correct: finalScore,
          questions_attempted: totalProblems,
          current_difficulty: 'medium',
        }, ef);
        if (reward) setSessionReward(reward);
      } catch (e) { /* silent fail */ }
    }
  };

  const startInteractiveLesson = async (topic) => {
    setSelectedSubtopic(topic);
    setSessionStartTime(Date.now());
    setPhase('loading');
    
    try {
      const convo = await base44.agents.createConversation({
        agent_name: 'lesson_tutor',
        metadata: { topic, domain }
      });
      setConversationId(convo.id);
      
      const domainLabel = DOMAIN_LABELS[domain] || domain;
      await base44.agents.addMessage({ id: convo.id }, {
        role: 'user',
        content: `I'm ready to learn about "${topic}" in ${domainLabel}. Please give a brief 1-2 sentence welcome and ask me how I want to begin. (I can choose between a concept breakdown, worked example, graphing example, a practice problem, predict next step, or find the mistake). Remember to format any multiple choice options as [OPTION_A], [OPTION_B], [OPTION_C], [OPTION_D], [OPTION_E], and [OPTION_F] at the very end.`
      });
      
      setPhase('interactive');
    } catch (e) {
      console.error(e);
      setPhase('picker');
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages);
      
      // Update score tracking
      let correct = 0;
      let attempts = 0;
      data.messages.forEach(m => {
        if (m.role === 'assistant' && m.content) {
          if (m.content.includes('[RESULT: CORRECT]')) correct++;
          if (m.content.includes('[RESULT: CORRECT]') || m.content.includes('[RESULT: INCORRECT]')) attempts++;
        }
      });
      setCorrectCount(correct);
      setAttemptCount(attempts);
      
      // Auto-scroll
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, [conversationId]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    const val = text.trim();
    setInputValue('');
    setIsTyping(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, {
        role: 'user',
        content: val
      });
    } catch (e) {
      console.error(e);
    }
    setIsTyping(false);
  };

  const finishLesson = () => {
    logLessonSession(correctCount, Math.max(attemptCount, 1));
    setPhase('complete');
  };

  const parseContent = (content) => {
    if (!content) return { displayContent: '', options: [], hasDesmos: false };
    const options = [];
    
    const hasDesmos = /\[DESMOS_EMBED\]/gi.test(content);
    
    let cleanContent = content
      .replace(/\[RESULT:\s*CORRECT\]/gi, '')
      .replace(/\[RESULT:\s*INCORRECT\]/gi, '')
      .replace(/\[DESMOS_EMBED\]/gi, '');
    
    const optionRegex = /\[OPTION_([A-F])\](.*)/gi;
    let match;
    while ((match = optionRegex.exec(cleanContent)) !== null) {
      options.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
    }
    
    cleanContent = cleanContent.replace(/\[OPTION_[A-F]\].*/gi, '').trim();
    return { displayContent: cleanContent, options, hasDesmos };
  };

  const MessageBubble = ({ message, isLast }) => {
    const isUser = message.role === 'user';
    const { displayContent, options, hasDesmos } = parseContent(message.content);
    
    // Hide the initial system-like prompt from the user
    if (isUser && displayContent.includes("Please give a brief 1-2 sentence welcome")) {
      return null;
    }

    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border border-emerald-200">
            <Brain className="w-5 h-5 text-emerald-600" />
          </div>
        )}
        <div className={`max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
          <div className={`rounded-2xl px-5 py-4 ${
            isUser ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-emerald-100 shadow-sm'
          }`}>
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
            ) : (
              <div className="text-sm prose prose-emerald max-w-none text-stone-700 space-y-3">
                {displayContent.split('\n').map((line, i) => {
                  const t = line.trim();
                  if (!t) return <div key={i} className="h-2" />;
                  return <div key={i} className="leading-relaxed"><MathText>{t}</MathText></div>;
                })}
              </div>
            )}
          </div>
          
          {!isUser && hasDesmos && (
            <div className="mt-4 w-full max-w-xl bg-white border-2 border-emerald-100 rounded-2xl p-4 shadow-sm">
              <DesmosCalculatorEmbed />
            </div>
          )}
          
          {!isUser && options.length > 0 && isLast && (
            <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-md">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(`I choose option ${opt.letter}: ${opt.text}`)}
                  disabled={isTyping}
                  className="text-left p-3 rounded-xl border-2 border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    {opt.letter}
                  </span>
                  <div className="text-sm font-medium text-stone-700"><MathText>{opt.text}</MathText></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (phase === 'picker') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-stone-900">{DOMAIN_LABELS[domain] || domain} Lessons</h2>
            <p className="text-sm text-stone-500">Interactive AI Tutor</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {(SUBTOPICS[domain] || ['General concepts']).map(topic => (
            <button
              key={topic}
              onClick={() => startInteractiveLesson(topic)}
              className="text-left p-4 rounded-2xl border-2 border-emerald-100 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-stone-800 group-hover:text-emerald-700">{topic}</span>
                <ChevronRight className="w-4 h-4 text-stone-300 ml-auto group-hover:text-emerald-500" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center shadow-inner border border-emerald-200">
          <Brain className="w-10 h-10 text-emerald-500 animate-pulse" />
        </div>
        <p className="text-xl font-bold text-stone-800 mb-2">Connecting to AI Tutor...</p>
        <p className="text-sm text-stone-500">Preparing your personalized interactive lesson</p>
      </div>
    );
  }

  if (phase === 'interactive') {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] bg-[#fcfcfc] rounded-3xl border-2 border-emerald-100 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-white border-b border-emerald-100 p-3 md:p-4 flex flex-col gap-3 z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => setPhase('picker')} className="text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 p-2 rounded-full hover:bg-stone-100 flex-shrink-0 mt-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-stone-800 leading-tight truncate" title={selectedSubtopic}>{selectedSubtopic}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0">
                  {DOMAIN_LABELS[domain] || domain}
                </Badge>
                <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
                  {correctCount} correct / {attemptCount} attempts
                </span>
              </div>
            </div>
            <Button onClick={finishLesson} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm h-9 md:h-10 px-4 md:px-5 shadow-sm flex-shrink-0 whitespace-nowrap">
              Finish <span className="hidden md:inline">Lesson</span> <CheckCircle className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
          <div className="flex items-center justify-start gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <CalculatorPanel />
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          )}
          
          {messages.map((m, idx) => (
            <MessageBubble 
              key={m.id || idx} 
              message={m} 
              isLast={idx === messages.length - 1} 
            />
          ))}
          
          {isTyping && (
            <div className="flex gap-3 justify-start mb-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-200 shadow-sm">
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="bg-white border-2 border-emerald-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-emerald-100 shadow-[0_-4px_15px_rgba(0,0,0,0.02)] flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Give me a concept breakdown")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Concept Breakdown</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Show me a worked example")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Worked Example</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Show me a graphing example")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Graphing Example</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Give me a practice problem")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Practice Problem</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Let's do a 'Predict Next Step' exercise: break down a problem step-by-step, pausing after each step for me to predict what comes next.")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Predict Next Step</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => sendMessage("Let's do a 'Find the Mistake' exercise: give me a solution with an intentional mistake and ask me to find it.")} disabled={isTyping} className="rounded-full whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">Find the Mistake</Button>
          </div>
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
            className="flex gap-2 max-w-4xl mx-auto relative w-full"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer, or ask for a hint..."
              className="flex-1 rounded-full border-2 border-stone-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 pl-5 pr-14 h-12 text-[15px] shadow-inner bg-stone-50"
              disabled={isTyping}
            />
            <Button 
              type="submit" 
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-1.5 top-1.5 bottom-1.5 rounded-full w-9 h-9 p-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all disabled:opacity-50 disabled:scale-95"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Powered by LeapOn AI Tutor
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const pct = attemptCount > 0 ? Math.round((correctCount / Math.max(attemptCount, 1)) * 100) : 100;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-8">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl border-4 border-emerald-100">
          <Star className="w-12 h-12 text-white fill-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-stone-900 mb-2">Lesson Complete!</h2>
          <p className="text-lg text-stone-500 font-medium">{selectedSubtopic}</p>
        </div>
        <div className="inline-block bg-white border-2 border-emerald-100 rounded-3xl px-10 py-6 shadow-sm">
          <p className="text-5xl font-bold text-emerald-600 mb-2">{pct}%</p>
          <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">{correctCount} correct of {attemptCount} attempts</p>
        </div>
        <div className="flex gap-4 justify-center flex-wrap mt-8">
          <Button variant="outline" onClick={() => startInteractiveLesson(selectedSubtopic)} className="rounded-full border-stone-300 gap-2 h-12 px-6">
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Button>
          <Button onClick={() => setPhase('picker')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-12 px-6 shadow-md">
            New Topic <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          {onLessonComplete && (
            <Button onClick={onLessonComplete} className="bg-stone-800 hover:bg-stone-900 text-white rounded-full h-12 px-8 shadow-md">
              Return to Practice <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
        {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
      </motion.div>
    );
  }

  return null;
}
