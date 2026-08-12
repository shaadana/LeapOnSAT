import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, ChevronRight, Loader2, PenTool, Trophy, ArrowLeft, XCircle, X } from 'lucide-react';
import EnglishTutorChat from '@/components/english/EnglishTutorChat';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ENGLISH_QUESTIONS, ENGLISH_DOMAIN_LABELS } from '@/data/englishQuestions';
import IDontKnowButton from '@/components/sat/IDontKnowButton';
import { IDK_ANSWER, isIdkEntry } from '@/utils/idk';

// Real SAT RW section domains aligned with College Board's 4 content domains
const DOMAINS = [
  // Information & Ideas
  'reading_comprehension', 'main_idea', 'inference', 'evidence_support',
  // Craft & Structure
  'vocabulary', 'tone_purpose', 'transitions',
  // Standard English Conventions
  'apostrophes', 'semicolons_periods', 'commas', 'colons',
  'subject_verb_agreement', 'pronoun_agreement', 'verb_tense', 'modifiers',
  'parallel_structure', 'conciseness', 'who_which_whom', 'idioms_diction'
];

// SAT RW section: 54 questions, ~27 per module — we use 27 for the diagnostic
const TOTAL_QUESTIONS = 27;

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

export default function SATEnglishDiagnostic() {
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('intro'); // intro | testing | results
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [usedIds, setUsedIds] = useState(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [domainResults, setDomainResults] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if ((urlParams.get('start') === 'true' || urlParams.get('autoStart') === '1') && stage === 'intro') {
      startDiagnostic();
      // Remove start param from URL so it doesn't trigger again on refresh
      urlParams.delete('start');
      urlParams.delete('autoStart');
      const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [stage]);

  // Real SAT RW content domain groupings (for proportional coverage)
  const SAT_DOMAIN_GROUPS = {
    information_ideas: ['reading_comprehension', 'main_idea', 'inference', 'evidence_support'],
    craft_structure: ['vocabulary', 'tone_purpose', 'transitions'],
    conventions: ['apostrophes', 'semicolons_periods', 'commas', 'colons', 'subject_verb_agreement', 'pronoun_agreement', 'verb_tense', 'modifiers', 'who_which_whom', 'idioms_diction'],
    expression: ['parallel_structure', 'conciseness'],
  };

  // Target proportions per SAT RW section (of 27 questions)
  const GROUP_TARGETS = {
    information_ideas: 7,  // ~26%
    craft_structure: 8,    // ~28%
    conventions: 8,        // ~28% (split across many sub-domains)
    expression: 4,         // ~20% (conciseness + parallelism)
  };

  const getAdaptiveQuestion = (responsesSoFar, currentUsedIds) => {
    // Elo-style difficulty — start at hard, push to expert quickly
    const recent = responsesSoFar.slice(-4);
    const recentAcc = recent.length > 0 ? recent.filter(r => r.correct).length / recent.length : 0.7;
    let targetDifficulty;
    if (responsesSoFar.length === 0) targetDifficulty = 'hard';
    else if (recentAcc >= 0.75) targetDifficulty = responsesSoFar.length >= 6 ? 'expert' : 'hard';
    else if (recentAcc >= 0.50) targetDifficulty = 'hard';
    else if (recentAcc >= 0.30) targetDifficulty = 'medium';
    else targetDifficulty = 'medium';

    // Track how many from each SAT group have been asked
    const groupCounts = { information_ideas: 0, craft_structure: 0, conventions: 0, expression: 0 };
    responsesSoFar.forEach(r => {
      for (const [grp, doms] of Object.entries(SAT_DOMAIN_GROUPS)) {
        if (doms.includes(r.domain)) { groupCounts[grp]++; break; }
      }
    });

    // Prioritize groups that are behind their target proportions
    const underrepresentedGroups = Object.entries(GROUP_TARGETS)
      .filter(([grp, target]) => {
        const fraction = groupCounts[grp] / Math.max(responsesSoFar.length, 1);
        return fraction < (target / TOTAL_QUESTIONS) + 0.05;
      })
      .map(([grp]) => grp);

    const priorityDomains = underrepresentedGroups.length > 0
      ? underrepresentedGroups.flatMap(grp => SAT_DOMAIN_GROUPS[grp])
      : DOMAINS;

    // Within-group: favor domains with fewer questions asked
    const domainCounts = {};
    DOMAINS.forEach(d => { domainCounts[d] = 0; });
    responsesSoFar.forEach(r => { if (domainCounts[r.domain] !== undefined) domainCounts[r.domain]++; });
    const minInPriority = Math.min(...priorityDomains.map(d => domainCounts[d] ?? 0));
    const leastCoveredPriority = priorityDomains.filter(d => (domainCounts[d] ?? 0) <= minInPriority + 1);

    // Struggle domains (answered ≤50% correct)
    const domainPerf = {};
    responsesSoFar.forEach(r => {
      if (!domainPerf[r.domain]) domainPerf[r.domain] = { total: 0, correct: 0 };
      domainPerf[r.domain].total++;
      if (r.correct) domainPerf[r.domain].correct++;
    });
    const struggleDomains = Object.entries(domainPerf)
      .filter(([, p]) => p.total >= 1 && p.correct / p.total <= 0.5)
      .map(([d]) => d);

    const targetDomains = [...new Set([...leastCoveredPriority, ...struggleDomains])];

    let candidates = ENGLISH_QUESTIONS.filter(q =>
      !currentUsedIds.has(q.id) && q.difficulty === targetDifficulty && targetDomains.includes(q.domain)
    );
    if (candidates.length === 0)
      candidates = ENGLISH_QUESTIONS.filter(q => !currentUsedIds.has(q.id) && q.difficulty === targetDifficulty && priorityDomains.includes(q.domain));
    if (candidates.length === 0)
      candidates = ENGLISH_QUESTIONS.filter(q => !currentUsedIds.has(q.id) && q.difficulty === targetDifficulty);
    if (candidates.length === 0) {
      const adjacent = targetDifficulty === 'expert' ? ['hard'] :
                       targetDifficulty === 'hard' ? ['medium', 'expert'] :
                       targetDifficulty === 'medium' ? ['hard', 'easy'] : ['medium'];
      candidates = ENGLISH_QUESTIONS.filter(q => !currentUsedIds.has(q.id) && adjacent.includes(q.difficulty));
    }
    if (candidates.length === 0) candidates = ENGLISH_QUESTIONS.filter(q => !currentUsedIds.has(q.id));
    if (candidates.length === 0) candidates = ENGLISH_QUESTIONS;

    const weighted = [];
    candidates.forEach(q => {
      const w = (targetDomains.includes(q.domain)) ? 3 : (priorityDomains.includes(q.domain) ? 2 : 1);
      for (let i = 0; i < w; i++) weighted.push(q);
    });
    return weighted[Math.floor(Math.random() * weighted.length)];
  };

  const startDiagnostic = () => {
    setLoading(true);
    const firstQ = getAdaptiveQuestion([], new Set());
    setQuestions([firstQ]);
    setUsedIds(new Set([firstQ.id]));
    setResponses([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setStage('testing');
    setLoading(false);
  };

  const handleAnswer = (label) => {
    if (answered) return;
    setSelectedAnswer(label);
    setAnswered(true);
    const q = questions[currentQuestion];
    const correct = label === q.correct_answer;
    setResponses(prev => [...prev, { 
      question_id: q.id,
      user_answer: label,
      domain: q.domain, 
      difficulty: q.difficulty, 
      correct,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      time_spent_seconds: Math.floor((Date.now() - questionStartTime) / 1000)
    }]);
  };

  const handleIDontKnow = () => {
    if (answered) return;
    setSelectedAnswer(IDK_ANSWER);
    setAnswered(true);
    const q = questions[currentQuestion];
    setResponses(prev => [...prev, {
      question_id: q.id,
      user_answer: IDK_ANSWER,
      idk: true,
      domain: q.domain,
      difficulty: q.difficulty,
      correct: false,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      time_spent_seconds: Math.floor((Date.now() - questionStartTime) / 1000)
    }]);
  };

  const handleNext = () => {
    const newResponseCount = responses.length + 1;
    if (newResponseCount < TOTAL_QUESTIONS) {
      const newUsedIds = new Set([...usedIds]);
      const nextQ = getAdaptiveQuestion(responses, newUsedIds);
      newUsedIds.add(nextQ.id);
      setUsedIds(newUsedIds);
      setQuestions(prev => [...prev, nextQ]);
      setCurrentQuestion(c => c + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setQuestionStartTime(Date.now());
    } else {
      calculateAndSaveResults();
    }
  };

  const calculateAndSaveResults = async () => {
    setLoading(true);
    const masteryByDomain = {};
    DOMAINS.forEach(domain => {
      const dr = responses.filter(r => r.domain === domain);
      if (dr.length === 0) { masteryByDomain[domain] = 'not_started'; return; }
      const acc = dr.filter(r => r.correct).length / dr.length;
      if (acc === 1) masteryByDomain[domain] = 'mastered';
      else if (acc >= 0.67) masteryByDomain[domain] = 'practiced';
      else if (acc >= 0.33) masteryByDomain[domain] = 'learning';
      else masteryByDomain[domain] = 'not_started';
    });
    setDomainResults(masteryByDomain);

    const overallAcc = responses.length > 0
      ? Math.round((responses.filter(r => r.correct).length / responses.length) * 100) : 0;

    if (user?.id) {
      // Build exact domain_scores object from responses
      const domain_scores = {};
      DOMAINS.forEach(domain => {
        const dr = responses.filter(r => r.domain === domain);
        if (dr.length > 0) {
          domain_scores[domain] = Math.round((dr.filter(r => r.correct).length / dr.length) * 100);
        } else {
          domain_scores[domain] = 0;
        }
      });

      const masteredCount = Object.values(masteryByDomain).filter(v => v === 'mastered').length;
      const practicedCount = Object.values(masteryByDomain).filter(v => v === 'practiced').length;
      const total = DOMAINS.length;
      const overallLevel = masteredCount / total >= 0.6 ? 'expert'
        : (masteredCount + practicedCount) / total >= 0.5 ? 'advanced'
        : (masteredCount + practicedCount) / total >= 0.25 ? 'intermediate'
        : 'beginner';

      const englishPerf = {
        overall_level: overallLevel,
        domain_scores,
        total_questions_attempted: responses.length,
        total_correct: responses.filter(r => r.correct).length,
        diagnostic_accuracy: overallAcc,
        last_session_date: new Date().toISOString(),
        responses,
      };

      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          english_performance: { ...profiles[0].english_performance, ...englishPerf },
        });
      } else {
        await base44.entities.UserProfile.create({ user_id: user.id, english_performance: englishPerf });
      }

      // Save as a diagnostic session
      await base44.entities.EnglishPracticeSession.create({
        user_id: user.id,
        session_type: 'diagnostic',
        status: 'completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: Math.ceil(responses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / 60),
        questions_attempted: responses.length,
        questions_correct: responses.filter(r => r.correct).length,
        domains_covered: [...new Set(responses.map(r => r.domain))],
        question_history: responses,
        performance_summary: { 
          accuracy_percentage: overallAcc,
          avg_time_per_question: responses.length ? Math.round(responses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / responses.length) : 0,
        },
      });
    }

    setStage('results');
    setLoading(false);
  };

  if (!user) return null;

  const progress = Math.min(((currentQuestion + 1) / TOTAL_QUESTIONS) * 100, 100);
  const correctCount = responses.filter(r => r.correct).length;
  const accuracy = responses.length > 0 ? Math.round((correctCount / responses.length) * 100) : 0;

  const q = questions[currentQuestion];
  const isCorrect = q && selectedAnswer === q.correct_answer;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-emerald-600 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <PenTool className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">SAT English Diagnostic</h1>
            <p className="text-white/80 text-sm">Calibrate your mastery across all English domains</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* INTRO */}
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl text-stone-900">Calibrate Your English Knowledge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-stone-600">This <strong>adaptive diagnostic</strong> mirrors the real SAT Reading and Writing section — 27 questions across College Board's 4 content domains, with adaptive difficulty calibrated to your performance. <strong>Note: You will not be able to go back to previous questions once you submit your answer.</strong></p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Information & Ideas", desc: "Central ideas, inference, evidence", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                    { label: "Craft & Structure", desc: "Vocabulary, tone, transitions", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                    { label: "Standard English Conventions", desc: "Grammar, punctuation, usage", color: "bg-stone-50 border-stone-200 text-stone-700" },
                    { label: "Expression of Ideas", desc: "Conciseness, parallelism, style", color: "bg-stone-50 border-stone-200 text-stone-700" },
                  ].map(d => (
                    <div key={d.label} className={`p-3 rounded-xl border text-sm ${d.color}`}>
                      <p className="font-semibold">{d.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">{d.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap text-xs text-stone-600 bg-stone-50 rounded-xl p-3 border border-stone-200">
                  <span>~12–15 min</span>
                  <span>•</span>
                  <span>27 adaptive questions</span>
                  <span>•</span>
                  <span>19 domains covered</span>
                  <span>•</span>
                  <span>Aligned to real SAT RW</span>
                </div>
                <Button
                  onClick={startDiagnostic}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold h-12"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Start Diagnostic (27 Questions)
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* TESTING */}
        {stage === 'testing' && !loading && questions.length > 0 && (
          <motion.div key="testing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader className="border-b border-stone-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('SATEnglishPractice'))} className="rounded-xl text-stone-500 hover:text-red-600 hover:bg-red-50 border-stone-200 font-semibold px-4">
                      Exit
                    </Button>
                    <div>
                      <CardTitle className="text-lg">Question {currentQuestion + 1}</CardTitle>
                      <p className="text-xs text-stone-500">{ENGLISH_DOMAIN_LABELS[q?.domain] || q?.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {q && (
                      <Badge className={
                        q.difficulty === 'expert' ? 'bg-stone-700 text-white' :
                        q.difficulty === 'hard' ? 'bg-stone-500 text-white' :
                        q.difficulty === 'medium' ? 'bg-stone-300 text-stone-800' :
                        'bg-emerald-100 text-emerald-700'
                      }>
                        {q.difficulty}
                      </Badge>
                    )}
                    <Badge className="bg-emerald-100 text-emerald-700">{accuracy}%</Badge>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </CardHeader>
              <CardContent className="p-6">
                {q && (
                  <div className="space-y-5">
                    <p className="text-base font-medium text-stone-800 leading-relaxed whitespace-pre-line">{q.question_text}</p>
                    <div className="space-y-2">
                      {q.options?.map((option) => {
                        let cls = 'border-2 border-stone-200 bg-white text-stone-700 hover:border-emerald-400 hover:bg-emerald-50';
                        if (answered) {
                          if (option.label === q.correct_answer) cls = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900';
                          else if (option.label === selectedAnswer) cls = 'border-2 border-red-400 bg-red-50 text-red-800';
                          else cls = 'border-2 border-stone-100 bg-stone-50 text-stone-400';
                        } else if (selectedAnswer === option.label) {
                          cls = 'border-2 border-emerald-500 bg-emerald-50';
                        }
                        return (
                          <button
                            key={option.label}
                            onClick={() => handleAnswer(option.label)}
                            disabled={answered}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${cls}`}
                          >
                            <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{option.label}</span>
                            <span className="text-sm">{option.text}</span>
                            {answered && option.label === q.correct_answer && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />}
                            {answered && option.label === selectedAnswer && option.label !== q.correct_answer && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {!answered && (
                      <IDontKnowButton onClick={handleIDontKnow} className="w-full h-11" />
                    )}

                    {answered && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className={`rounded-2xl border-2 p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : selectedAnswer === IDK_ANSWER ? 'bg-amber-50 border-amber-200' : 'bg-stone-100 border-stone-300'}`}>
                          <p className={`text-sm font-bold mb-1 ${isCorrect ? 'text-emerald-700' : selectedAnswer === IDK_ANSWER ? 'text-amber-700' : 'text-stone-700'}`}>
                            {isCorrect ? '✓ Correct!' : selectedAnswer === IDK_ANSWER ? `🤔 You marked "I Don't Know" — Answer: ${q.correct_answer}` : `✗ Incorrect — Answer: ${q.correct_answer}`}
                          </p>
                          <p className="text-sm text-gray-700">{q.explanation}</p>
                          {q.rule_reference && <p className="text-xs text-gray-500 italic mt-1">{q.rule_reference}</p>}
                        </div>

                        <EnglishTutorChat context={{
                          questionText: q.question_text,
                          correctAnswer: q.correct_answer,
                          correctAnswerText: q.options?.find(o => o.label === q.correct_answer)?.text || '',
                          studentAnswer: selectedAnswer,
                          studentAnswerText: q.options?.find(o => o.label === selectedAnswer)?.text || '',
                          explanation: q.explanation,
                          ruleReference: q.rule_reference,
                          skill: q.domain,
                          isCorrect,
                        }} />

                        <div className="flex justify-end">
                          <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold">
                            {responses.length + 1 < TOTAL_QUESTIONS ? 'Next Question' : 'Finish Diagnostic'}
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* RESULTS */}
        {stage === 'results' && (() => {
          const correctCount = responses.filter(r => r.correct).length;
          const totalCount = responses.length;
          const finalAccuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

          const masteryOrder = { mastered: 4, practiced: 3, learning: 2, not_started: 1 };
          const masteryPct = { mastered: 100, practiced: 67, learning: 33, not_started: 0 };
          const masteryColors = {
            mastered: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: '✓ Mastered' },
            practiced: { bar: 'bg-stone-400', badge: 'bg-stone-100 text-stone-700 border-stone-200', label: '→ Practiced' },
            learning: { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: '◐ Learning' },
            not_started: { bar: 'bg-stone-300', badge: 'bg-stone-100 text-stone-500 border-stone-200', label: '○ Not Yet Tested' },
          };

          const sortedDomains = Object.entries(domainResults).sort(
            (a, b) => (masteryOrder[b[1]] || 0) - (masteryOrder[a[1]] || 0)
          );
          const strengths = sortedDomains.filter(([, lv]) => lv === 'mastered' || lv === 'practiced');
          const weaknesses = sortedDomains.filter(([, lv]) => lv === 'learning' || lv === 'not_started');

          const overallLevelLabel = {
            expert: 'Expert',
            advanced: 'Advanced',
            intermediate: 'Intermediate',
            beginner: 'Beginner',
          };
          const savedLevel = Object.values(domainResults).length > 0
            ? (() => {
                const mc = Object.values(domainResults).filter(v => v === 'mastered').length;
                const pc = Object.values(domainResults).filter(v => v === 'practiced').length;
                const t = DOMAINS.length;
                return mc / t >= 0.6 ? 'expert' : (mc + pc) / t >= 0.5 ? 'advanced' : (mc + pc) / t >= 0.25 ? 'intermediate' : 'beginner';
              })()
            : 'beginner';

          return (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Hero card */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 rounded-3xl shadow-2xl">
                <CardContent className="p-8 text-center text-white">
                  <Trophy className="w-16 h-16 mx-auto mb-3 opacity-90" />
                  <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold mb-1">Diagnostic Complete!</h2>
                  <p className="text-emerald-100 text-sm mb-5">Your English mastery baseline has been saved.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/15 rounded-2xl p-4">
                      <p className="text-3xl font-bold">{finalAccuracy}%</p>
                      <p className="text-xs text-emerald-100 mt-0.5">Accuracy</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-4">
                      <p className="text-3xl font-bold">{correctCount}/{totalCount}</p>
                      <p className="text-xs text-emerald-100 mt-0.5">Correct</p>
                      {responses.filter(isIdkEntry).length > 0 && (
                        <p className="text-[10px] text-amber-200 font-semibold mt-0.5">{responses.filter(isIdkEntry).length} didn't know</p>
                      )}
                    </div>
                    <div className="bg-white/15 rounded-2xl p-4">
                      <p className="text-3xl font-bold">{totalCount > 0 ? Math.round(responses.reduce((s, r) => s + (r.time_spent_seconds || 0), 0) / totalCount) : 0}s</p>
                      <p className="text-xs text-emerald-100 mt-0.5">Avg Time / Q</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-4">
                      <p className="text-xl font-bold leading-tight">{overallLevelLabel[savedLevel] || savedLevel}</p>
                      <p className="text-xs text-emerald-100 mt-0.5">Level</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Weaknesses summary */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-2 border-emerald-200 bg-emerald-50 rounded-2xl">
                  <CardContent className="p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Strengths ({strengths.length})</p>
                    {strengths.length === 0
                      ? <p className="text-xs text-stone-500">Keep practicing!</p>
                      : strengths.slice(0, 4).map(([d]) => (
                          <p key={d} className="text-xs text-emerald-800 mb-1">
                            • {ENGLISH_DOMAIN_LABELS[d] || d.replace(/_/g, ' ')}
                          </p>
                        ))
                    }
                  </CardContent>
                </Card>
                <Card className="border-2 border-amber-200 bg-amber-50 rounded-2xl">
                  <CardContent className="p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Focus Areas ({weaknesses.length})</p>
                    {weaknesses.length === 0
                      ? <p className="text-xs text-stone-500">Great job!</p>
                      : weaknesses.slice(0, 4).map(([d]) => (
                          <p key={d} className="text-xs text-amber-800 mb-1">
                            • {ENGLISH_DOMAIN_LABELS[d] || d.replace(/_/g, ' ')}
                          </p>
                        ))
                    }
                  </CardContent>
                </Card>
              </div>

              {/* SAT Content Domain Group Summary */}
              {(() => {
                const groups = [
                  { label: "Information & Ideas", doms: ['reading_comprehension', 'main_idea', 'inference', 'evidence_support'] },
                  { label: "Craft & Structure", doms: ['vocabulary', 'tone_purpose', 'transitions'] },
                  { label: "Standard English Conventions", doms: ['apostrophes', 'semicolons_periods', 'commas', 'colons', 'subject_verb_agreement', 'pronoun_agreement', 'verb_tense', 'modifiers', 'who_which_whom', 'idioms_diction'] },
                  { label: "Expression of Ideas", doms: ['parallel_structure', 'conciseness'] },
                ];
                return (
                  <Card className="border-2 border-emerald-100 rounded-2xl">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-stone-700">SAT Content Domain Performance</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {groups.map(g => {
                        const groupResponses = responses.filter(r => g.doms.includes(r.domain));
                        if (groupResponses.length === 0) return null;
                        const gc = groupResponses.filter(r => r.correct).length;
                        const pct = Math.round((gc / groupResponses.length) * 100);
                        return (
                          <div key={g.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-stone-700">{g.label}</span>
                              <span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{gc}/{groupResponses.length} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Domain breakdown with progress bars */}
              <Card className="border-2 border-stone-100 shadow-lg rounded-3xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-stone-900">Domain-by-Domain Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedDomains.map(([domain, level]) => {
                    const pct = masteryPct[level] ?? 0;
                    const colors = masteryColors[level] || masteryColors.not_started;
                    return (
                      <div key={domain}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-stone-700 font-medium">
                            {ENGLISH_DOMAIN_LABELS[domain] || domain.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors.badge}`}>
                            {colors.label}
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${colors.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Next steps */}
              {weaknesses.length > 0 && (
                <Card className="border-2 border-emerald-200 bg-emerald-50 rounded-2xl">
                  <CardContent className="p-4">
                    <p className="text-sm font-bold text-emerald-800 mb-2">Recommended Next Steps</p>
                    <p className="text-xs text-emerald-700 mb-2">Target these domains in your next practice session:</p>
                    <div className="flex flex-wrap gap-2">
                      {weaknesses.slice(0, 5).map(([d]) => (
                        <span key={d} className="px-2 py-1 bg-white border border-emerald-200 rounded-full text-xs text-emerald-800 font-medium">
                          {ENGLISH_DOMAIN_LABELS[d] || d.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate(createPageUrl('EnglishKnowledgeGraph'))}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold h-12"
                >
                  <PenTool className="w-5 h-5 mr-2" />
                  Knowledge Graph
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('SATEnglishPractice'))}
                  variant="outline"
                  className="flex-1 rounded-full font-bold h-12 border-2"
                >
                  Practice English
                </Button>
              </div>
            </motion.div>
          );
        })()}

        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-stone-900 mb-2">Preparing your diagnostic...</h2>
            <p className="text-stone-500">27 adaptive questions across all SAT Reading & Writing domains</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
