import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import LessonViewer from '@/components/sat/LessonViewer';
import UnitBrowser from '@/components/sat/UnitBrowser';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SAT_QUESTIONS as RAW_SAT_QUESTIONS } from '@/data/satQuestions';
import { SAT_QUESTIONS_EXTREME } from '@/data/satQuestionsExtreme';
import { filterValidQuestions } from '@/data/diagnosticQuestionValidator';
import { syncMasteryToKnowledgeGraph } from '@/utils/satMasterySync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Pause,
  RotateCcw,
  Award,
  Lightbulb,
  Network,
  AlertCircle,
  TrendingUp,
  Filter,
  Sparkles,
  Loader2,
  Brain } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SATWeakDomainsPanel from '@/components/sat/SATWeakDomainsPanel';
// SATModuleTest is now a full page at /SATModuleTest
import QuestionTutor from '@/components/sat/QuestionTutor';
import PYQSession from '@/components/sat/PYQSession';
import CanyonMathPractice from '@/components/sat/CanyonMathPractice';
import CanyonMathLessons from '@/components/sat/CanyonMathLessons';
import { History, Calculator, Mountain } from 'lucide-react';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import MathText from '@/components/sat/MathText';
import MathKeyboard from '@/components/sat/MathKeyboard';
import ExplanationText from '@/components/sat/ExplanationText';
import { awardForSession } from '@/utils/gamification';
import SessionRewardModal from '@/components/gamification/SessionRewardModal';
import MistakesReviewMode from '@/components/review/MistakesReviewMode';
import IDontKnowButton from '@/components/sat/IDontKnowButton';
import { IDK_ANSWER, isIdkEntry } from '@/utils/idk';
import BookmarkButton from '@/components/review/BookmarkButton';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';
import { resolveQuestionIds } from '@/utils/questionResolver';

// Normalize SAT_QUESTIONS to the format expected by this page.
// Same self-validator as the diagnostic — drops any question whose explanation
// contradicts its marked answer or contains hedging language. Students never
// see a question whose own explanation undermines its answer.
const ALL_RAW = filterValidQuestions([...RAW_SAT_QUESTIONS, ...SAT_QUESTIONS_EXTREME]);
const SAMPLE_QUESTIONS = ALL_RAW.map((q) => ({
  id: `sat_${q.id}`,
  question_text: q.question,
  domain: q.domain,
  difficulty: q.difficulty,
  options: q.options ? q.options.map((opt) => {
    const match = opt.match(/^([A-D])[).\s]\s*(.+)$/);
    if (match) return { label: match[1], text: match[2].trim() };
    return { label: opt[0], text: opt.slice(3).trim() };
  }) : null,
  correct_answer: q.correct,
  explanation: q.explanation
}));

const DOMAIN_META = {
  algebra: { label: 'Algebra' },
  advanced_algebra: { label: 'Advanced Algebra' },
  geometry: { label: 'Geometry' },
  trigonometry: { label: 'Trigonometry' },
  statistics: { label: 'Statistics' },
  problem_solving: { label: 'Problem Solving' },
  systems_of_equations: { label: 'Systems of Equations' },
  quadratics: { label: 'Quadratics' },
  exponentials: { label: 'Exponentials' },
  ratios_proportions: { label: 'Ratios & Proportions' },
  circles: { label: 'Circles' },
  polynomials: { label: 'Polynomials' }
};

export default function SATPractice() {
  const [searchParams] = useSearchParams();
  const sessionType = searchParams.get('type') || null;
  const topicParam = searchParams.get('topic') || null;
  const queryClient = useQueryClient();

  // Assignment-driven config (set by teacher, encoded in the URL by StudentAssignments)
  const assignmentId = searchParams.get('assignmentId') || null;
  const autoStart = searchParams.get('autoStart') === '1';
  const fromStudyPlan = searchParams.get('studyPlan') === 'true';
  const fixedDifficulty = searchParams.get('difficulty') || null;
  const fixedDuration = parseInt(searchParams.get('duration') || '', 10) || null;
  const fixedCount = parseInt(searchParams.get('count') || '', 10) || null;
  const fixedSource = searchParams.get('source') || null;
  const fixedQids = (searchParams.get('qids') || '').split(',').filter(Boolean);
  const toolsOff = (searchParams.get('toolsOff') || '').split(',').filter(Boolean);
  const assignedTools = toolsOff.length ?
  Object.fromEntries(toolsOff.map((k) => [k, false])) :
  null;
  const tutorAllowed = !assignedTools || assignedTools.ai_tutor !== false;
  const explanationsAllowed = !assignedTools || assignedTools.explanations !== false;

  const [user, setUser] = useState(null);
  const [lessonMode, setLessonMode] = useState(() => searchParams.get('mode') === 'lesson');
  const [pyqMode, setPyqMode] = useState(false);
  const [canyonMode, setCanyonMode] = useState(null); // null | 'practice' | 'lessons'
  const [unitMode, setUnitMode] = useState(false); // unit curriculum vs free lessons
  const [mistakesMode, setMistakesMode] = useState(false);
  const [lessonDomain, setLessonDomain] = useState(() => searchParams.get('domain') || null);
  const [lessonSubtopic, setLessonSubtopic] = useState(() => {
    const s = searchParams.get('subtopic');return s ? decodeURIComponent(s) : '';
  });
  const [currentSession, setCurrentSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]); // array for multi-select support
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [questionHistory, setQuestionHistory] = useState([]);
  // Legacy single-answer state kept for compatibility
  const selectedAnswer = selectedAnswers[0] || '';
  const [choiceConfig, setChoiceConfig] = useState({ duration: null, questionPool: [] });
  const [questionOptions, setQuestionOptions] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState(() => {
    // Support comma-separated topics or a single topic from URL param
    if (!topicParam) return [];
    return topicParam.split(',').filter(Boolean);
  });
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [sessionReward, setSessionReward] = useState(null);
  const [recallPrediction, setRecallPrediction] = useState('');
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [practiceConfig, setPracticeConfig] = useState({ count: 10, domains: [], adaptiveChoice: false });
  const aiQueueRef = useRef([]);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Auto-start a session when the student lands here from an assignment link.
  // Waits until the user is loaded so we can attribute the session correctly.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!autoStart || !user?.id || currentSession || lessonMode) return;
    autoStartedRef.current = true;
    const t = sessionType || 'custom';
    if (t === 'choice') {
      const minutes = fixedDuration || 15;
      startSession('choice', { duration: minutes, questionPool: [] });
    } else {
      startSession(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, user?.id, lessonMode]);

  // Persist seen question IDs across sessions in localStorage
  const getSeenIds = () => {
    try {return new Set(JSON.parse(localStorage.getItem('sat_seen_ids') || '[]'));}
    catch {return new Set();}
  };
  const markIdsSeen = (ids) => {
    try {
      const existing = getSeenIds();
      ids.forEach((id) => existing.add(id));
      localStorage.setItem('sat_seen_ids', JSON.stringify([...existing]));
    } catch {}
  };

  const fetchAIQuestions = async (domain, difficulty, usedTexts = []) => {
    const res = await base44.functions.invoke('generateSATQuestion', {
      domain, difficulty, excludeQuestions: usedTexts.slice(0, 5)
    });
    return res.data?.questions || [];
  };

  const startSimilarSession = async (mistakeText, domain, difficulty) => {
    setIsGeneratingQuestion(true);
    try {
      // Fetch the first question quickly to start the session immediately
      const res = await base44.functions.invoke('generateSATQuestion', {
        domain, difficulty, similarToQuestionText: mistakeText, subject: 'math', count: 1
      });
      const aiQs = res.data?.questions || [];
      if (aiQs.length > 0) {
        setSessionQuestions(aiQs);
        const session = {
          user_id: user?.id,
          session_type: 'similar',
          status: 'in_progress',
          start_time: new Date().toISOString(),
          questions_attempted: 0,
          questions_correct: 0,
          current_difficulty: difficulty,
          domains_covered: [domain],
          question_history: [],
          from_study_plan: fromStudyPlan
        };
        const created = await base44.entities.PracticeSession.create(session);
        setCurrentSession(created);
        setCurrentQuestionIndex(0);
        setQuestionHistory([]);
        setTimer(0);
        setIsTimerRunning(true);
        setSelectedAnswers([]);
        setShowExplanation(false);
        setIsAnswered(false);
        setMistakesMode(false);

        // Fetch remaining questions in the background
        base44.functions.invoke('generateSATQuestion', {
          domain, difficulty, similarToQuestionText: mistakeText, subject: 'math', count: 2
        }).then((moreRes) => {
          const moreQs = moreRes.data?.questions || [];
          if (moreQs.length > 0) {
            setSessionQuestions((prev) => [...prev, ...moreQs]);
          }
        }).catch((err) => console.error('Failed to stream remaining questions:', err));
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingQuestion(false);
  };

  const startSession = async (type, config = null) => {
    if (type === 'setup') {
      setCurrentSession({ session_type: 'setup', status: 'config' });
      return;
    }

    const userProfile = profile?.[0];
    const ef = userProfile?.executive_functioning || {};

    const currentTopics = config && config.domains || selectedTopics;

    // Filter by selected topics if any
    let pool = [...SAMPLE_QUESTIONS];
    let workingPool = [];
    let questionCount = type === 'blitz' ? 5 : type === 'recall' ? 4 : type === 'class' ? 12 : 5;

    // Assignment-specific filtering — teacher's choices are LOCKED
    let activeQids = fixedQids;
    if (assignmentId && fixedSource === 'specific') {
      try {
        const assignmentRes = await base44.entities.Assignment.filter({ id: assignmentId });
        if (assignmentRes && assignmentRes.length > 0 && assignmentRes[0].assignment_config?.specific_question_ids) {
          activeQids = assignmentRes[0].assignment_config.specific_question_ids;
        }
      } catch (e) {
        console.error("Failed to load assignment config", e);
      }
    }

    if (fixedSource === 'specific' && activeQids.length > 0) {
      workingPool = await resolveQuestionIds(activeQids, 'SATQuestion');
      // Lock question count to exactly the number of picked questions
      questionCount = workingPool.length;
    } else if (fixedSource === 'pyq') {
      const pyqSources = (searchParams.get('pyqSources') || '').split(',').filter(Boolean);
      let pyqQs = await base44.entities.PYQQuestion.list();
      if (pyqSources.length > 0) {
        pyqQs = pyqQs.filter((q) => pyqSources.includes(q.source));
      }
      workingPool = pyqQs.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        domain: q.domain,
        difficulty: q.difficulty,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation
      }));
      questionCount = workingPool.length;
    } else if (fixedSource === 'canyon') {
      const canyonQs = await base44.entities.CanyonMath.list();
      workingPool = canyonQs.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        domain: q.category || 'problem_solving',
        difficulty: q.difficulty || 'hard',
        options: q.options,
        correct_answer: q.answer,
        explanation: q.explanation
      }));
      questionCount = workingPool.length;
    } else {
      // General SAT practice flow (not a locked specific/source assignment)
      if (currentTopics.length > 0) {
        pool = pool.filter((q) => currentTopics.includes(q.domain));
      }

      if (fixedDifficulty && fixedDifficulty !== 'mixed') {
        const filtered = pool.filter((q) => q.difficulty === fixedDifficulty);
        if (filtered.length >= 3) pool = filtered;
      }

      const seenIds = getSeenIds();
      const unseenPool = pool.filter((q) => !seenIds.has(q.id));

      const seenRatio = pool.length > 0 ? (pool.length - unseenPool.length) / pool.length : 0;
      if (unseenPool.length < 5 || seenRatio > 0.7) {
        setIsGeneratingQuestion(true);
        const domainsToGenerate = currentTopics.length > 0 ?
        currentTopics :
        [...new Set(pool.map((q) => q.domain))].slice(0, 4);
        for (const domain of domainsToGenerate) {
          const aiQs = await fetchAIQuestions(domain, 'medium');
          pool = [...pool, ...aiQs];
        }
        setIsGeneratingQuestion(false);
      }

      let finalPool = pool.filter((q) => !seenIds.has(q.id));

      // ADAPTIVE SESSION LENGTH based on EF profile
      questionCount = type === 'blitz' ? 5 : type === 'recall' ? 4 : type === 'class' ? 12 : 5;
      if (ef.task_initiation < 8 && type === 'class') questionCount = 8;
      if (ef.sustained_attention < 8) questionCount = type === 'blitz' ? 3 : type === 'class' ? 6 : questionCount;
      if (fixedDuration) questionCount = Math.max(3, Math.ceil(fixedDuration / 2));
      if (fixedCount) questionCount = fixedCount;
      if (config && config.count) questionCount = config.count;

      if (finalPool.length < questionCount) {
        setIsGeneratingQuestion(true);
        const neededDomains = currentTopics.length > 0 ? currentTopics : Object.keys(DOMAIN_META);
        for (let i = 0; i < 3 && finalPool.length < questionCount; i++) {
          const dom = neededDomains[Math.floor(Math.random() * neededDomains.length)];
          const aiQs = await fetchAIQuestions(dom, 'medium');
          const unseenAiQs = aiQs.filter((q) => !seenIds.has(q.id));
          pool = [...pool, ...unseenAiQs];
          finalPool = [...finalPool, ...unseenAiQs];
        }
        setIsGeneratingQuestion(false);
      }

      workingPool = [...finalPool];
      if (workingPool.length < questionCount) {
        const needed = questionCount - workingPool.length;
        const seenQs = pool.filter((q) => seenIds.has(q.id));
        workingPool = [...workingPool, ...seenQs.sort(() => Math.random() - 0.5).slice(0, needed)];
      }
    }

    // Override length if assignment explicitly set duration but NOT specific questions
    if (fixedDuration && fixedSource !== 'specific') {
      questionCount = Math.max(3, Math.ceil(fixedDuration / 2));
    }
    if (fixedCount && fixedSource !== 'specific') {
      questionCount = fixedCount;
    }

    // Do not shuffle if the teacher hand-picked specific questions
    const shuffled = fixedSource === 'specific' ?
    [...workingPool] :
    workingPool.sort(() => Math.random() - 0.5);

    if (type === 'choice' && config) {
      questionCount = config.count || 10;
      setChoiceConfig({ duration: questionCount * 2, questionPool: [], count: questionCount });
      const limitPool = shuffled.slice(0, Math.max(questionCount * 3, 15));
      setChoiceConfig((prev) => ({ ...prev, questionPool: limitPool }));
      setQuestionOptions([limitPool[0], limitPool[1]]);
    } else {
      // Allow using all working pool if it's specific source (pyq/canyon) and not general
      if (fixedSource && fixedSource !== 'general') {
        questionCount = Math.min(questionCount, shuffled.length);
      }
      setSessionQuestions(shuffled.slice(0, questionCount));
    }

    const session = {
      user_id: user.id,
      session_type: type,
      status: 'in_progress',
      start_time: new Date().toISOString(),
      questions_attempted: 0,
      questions_correct: 0,
      current_difficulty: 'medium',
      domains_covered: [],
      question_history: [],
      from_study_plan: fromStudyPlan,
      ...(assignmentId ? { assignment_id: assignmentId } : {})
    };

    const created = await base44.entities.PracticeSession.create(session);
    setCurrentSession(created);
    setCurrentQuestionIndex(0);
    setQuestionHistory([]);
    setTimer(0);
    setIsTimerRunning(type !== 'choice' || !!config);
    setSelectedAnswers([]);
    setShowExplanation(false);
    setIsAnswered(false);
  };

  const getAdaptiveQuestions = () => {
    const recentHistory = questionHistory.slice(-3);
    const recentCorrect = recentHistory.filter((h) => h.correct).length;
    const accuracy = recentHistory.length > 0 ? recentCorrect / recentHistory.length : 0.5;

    // Determine target difficulty
    let targetDifficulty;
    if (accuracy >= 0.7) {
      targetDifficulty = ['hard', 'medium'];
    } else if (accuracy >= 0.4) {
      targetDifficulty = ['medium', 'easy'];
    } else {
      targetDifficulty = ['easy', 'medium'];
    }

    // Get weak domains
    const domainPerformance = {};
    questionHistory.forEach((h) => {
      if (!domainPerformance[h.domain]) {
        domainPerformance[h.domain] = { correct: 0, total: 0 };
      }
      domainPerformance[h.domain].total++;
      if (h.correct) domainPerformance[h.domain].correct++;
    });

    const weakDomains = Object.entries(domainPerformance).
    filter(([_, perf]) => perf.total >= 2 && perf.correct / perf.total < 0.6).
    map(([domain, _]) => domain);

    // Filter unused questions
    const usedIds = new Set(questionHistory.map((h) => h.question_id));
    const available = choiceConfig.questionPool.filter((q) => !usedIds.has(q.id));

    // Prioritize weak domains and target difficulty
    let options = available.filter((q) =>
    weakDomains.includes(q.domain) && targetDifficulty.includes(q.difficulty)
    );

    if (options.length < 2) {
      options = available.filter((q) => targetDifficulty.includes(q.difficulty));
    }

    if (options.length < 2) {
      options = available;
    }

    // Shuffle and return 2
    const shuffled = options.sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1] || available[0]].filter(Boolean);
  };

  const handleQuestionChoice = (question) => {
    setSessionQuestions((prev) => [...prev, question]);
    setCurrentQuestionIndex(sessionQuestions.length);
    setSelectedAnswers([]);
    setShowExplanation(false);
    setIsAnswered(false);
    setTimer(0);
  };

  const normalizeAnswer = (answer) => {
    return answer.toLowerCase().trim().
    replace(/[\s,]+/g, '').
    replace(/x=/g, '').
    replace(/y=/g, '').
    replace(/=/g, '');
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswers.length === 0) return;

    const currentQuestion = sessionQuestions[currentQuestionIndex];
    const correctAnswers = currentQuestion.correct_answer.split(',').map((a) => a.trim().toUpperCase()).sort();
    const userAnswers = [...selectedAnswers].sort();
    // For multi-answer, all correct answers must be selected and nothing extra
    const isCorrect = correctAnswers.join(',') === userAnswers.join(',');

    const historyEntry = {
      question_id: currentQuestion.id,
      user_answer: selectedAnswers.join(','),
      correct: isCorrect,
      time_spent_seconds: timer,
      domain: currentQuestion.domain,
      difficulty: currentQuestion.difficulty,
      question_text: currentQuestion.question_text || currentQuestion.question,
      options: currentQuestion.options,
      correct_answer: currentQuestion.correct_answer || currentQuestion.correct,
      explanation: currentQuestion.explanation
    };

    setQuestionHistory((prev) => [...prev, historyEntry]);
    setIsAnswered(true);
    setShowExplanation(true);
    setIsTimerRunning(false);
  };

  const handleIDontKnow = () => {
    const currentQuestion = sessionQuestions[currentQuestionIndex];
    const historyEntry = {
      question_id: currentQuestion.id,
      user_answer: IDK_ANSWER,
      idk: true,
      correct: false,
      time_spent_seconds: timer,
      domain: currentQuestion.domain,
      difficulty: currentQuestion.difficulty,
      question_text: currentQuestion.question_text || currentQuestion.question,
      options: currentQuestion.options,
      correct_answer: currentQuestion.correct_answer || currentQuestion.correct,
      explanation: currentQuestion.explanation
    };
    setSelectedAnswers([]);
    setQuestionHistory((prev) => [...prev, historyEntry]);
    setIsAnswered(true);
    setShowExplanation(true);
    setIsTimerRunning(false);
  };

  const handleNextQuestion = async () => {
    setShowTutor(false);
    if (currentSession.session_type === 'choice') {
      // Check if count is reached
      if (choiceConfig.count && questionHistory.length + 1 >= choiceConfig.count) {
        await endSession();
        return;
      } else {
        // Fallback to time limit for older assignments
        const totalTime = questionHistory.reduce((sum, h) => sum + h.time_spent_seconds, 0) + timer;
        const timeLimit = choiceConfig.duration * 60; // convert to seconds

        if (totalTime >= timeLimit) {
          await endSession();
          return;
        }
      }

      // Show next question choices
      const nextOptions = getAdaptiveQuestions();
      if (nextOptions.length >= 2) {
        setQuestionOptions(nextOptions);
        setCurrentQuestionIndex((prev) => prev + 1);
        setIsTimerRunning(false);
      } else {
        await endSession();
      }
    } else if (currentQuestionIndex < sessionQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswers([]);
      setShowExplanation(false);
      setIsAnswered(false);
      setTimer(0);
      setIsTimerRunning(true);
      setRecallPrediction('');
      setRecallRevealed(false);
    } else {
      await endSession();
    }
  };

  const endSession = async () => {
    const correct = questionHistory.filter((h) => h.correct).length;
    const attempted = questionHistory.length;
    const avgTime = questionHistory.reduce((sum, h) => sum + h.time_spent_seconds, 0) / (attempted || 1);

    // Domain performance breakdown
    const domainCounts = {};
    questionHistory.forEach((h) => {
      if (!domainCounts[h.domain]) domainCounts[h.domain] = { correct: 0, total: 0 };
      domainCounts[h.domain].total++;
      if (h.correct) domainCounts[h.domain].correct++;
    });

    const sortedDomains = Object.entries(domainCounts).sort(
      (a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total
    );

    const accuracy = Math.round(correct / attempted * 100);

    await base44.entities.PracticeSession.update(currentSession.id, {
      status: 'completed',
      end_time: new Date().toISOString(),
      questions_attempted: attempted,
      questions_correct: correct,
      question_history: questionHistory,
      duration_minutes: Math.round(questionHistory.reduce((sum, h) => sum + h.time_spent_seconds, 0) / 60),
      domains_covered: [...new Set(questionHistory.map((h) => h.domain))],
      performance_summary: {
        accuracy_percentage: accuracy,
        avg_time_per_question: Math.round(avgTime),
        strongest_domain: sortedDomains[0]?.[0] || '',
        weakest_domain: sortedDomains[sortedDomains.length - 1]?.[0] || ''
      }
    });

    // Mark this specific assignment as completed if the student arrived here from one
    if (assignmentId) {
      const progressEntries = await base44.entities.StudentAssignmentProgress.filter({
        student_id: user.id,
        assignment_id: assignmentId
      });
      if (progressEntries?.[0]) {
        await base44.entities.StudentAssignmentProgress.update(progressEntries[0].id, {
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          score: accuracy,
          question_history: questionHistory
        });
      } else {
        await base44.entities.StudentAssignmentProgress.create({
          student_id: user.id,
          assignment_id: assignmentId,
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          score: accuracy,
          question_history: questionHistory
        });
      }
    }

    // --- Sync mastery to Knowledge Graph nodes (upsert, no duplicates) ---
    if (user?.id) {
      const domainMasteryMap = {};
      for (const [domain, perf] of Object.entries(domainCounts)) {
        const acc = perf.correct / perf.total;
        domainMasteryMap[domain] = acc >= 0.8 ? 'mastered' : acc >= 0.6 ? 'practiced' : acc >= 0.3 ? 'learning' : 'not_started';
      }
      await syncMasteryToKnowledgeGraph(user.id, domainMasteryMap, base44);
    }

    // Mark all questions from this session as seen
    markIdsSeen(questionHistory.map((h) => h.question_id));

    // Award gamification XP / coins / badges — EF-customized via UserProfile
    if (user?.id) {
      try {
        const ef = profile?.[0]?.executive_functioning || null;
        const reward = await awardForSession(user.id, {
          questions_correct: correct,
          questions_attempted: attempted,
          current_difficulty: currentSession.current_difficulty
        }, ef);
        if (reward) setSessionReward(reward);
        queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user.id] });
      } catch (e) {/* non-critical, never block session completion */}
    }

    setIsTimerRunning(false);
    setCurrentSession((prev) => ({ ...prev, status: 'completed' }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSessionSelection = () => {
    const userProfile = profile?.[0];
    const motivation = userProfile?.motivation_assessment || {};
    const seenCount = getSeenIds().size;
    const totalStatic = SAMPLE_QUESTIONS.length;
    const mostlySeen = seenCount >= totalStatic * 0.6;

    let motivationMessage = "Choose your practice mode to get started";
    if (motivation.intrinsic_motivation < 40 && userProfile?.motivation_assessment?.responses?.[0]) {
      motivationMessage = `Remember: ${userProfile.motivation_assessment.responses[0]}`;
    } else if (motivation.intrinsic_motivation > 70) {
      motivationMessage = "Ready to challenge yourself and grow?";
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">SAT Math Practice</h1>
              <p className="text-white/80 text-sm">{motivationMessage}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setLessonMode(true)} className="bg-white/20 hover:bg-white/30 text-white rounded-full font-bold shadow-lg gap-2 border border-white/30">
            <BookOpen className="w-4 h-4" />
            Lessons
          </Button>
          </div>
        </div>
      </div>

      {/* Your Why */}
      {userProfile?.motivation_assessment?.responses?.[0] && motivation.intrinsic_motivation < 50 &&
        <Card className="mb-5 bg-emerald-50 border border-emerald-200">
          <CardContent className="p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 mb-0.5">Your Why</p>
              <p className="text-sm text-emerald-800">{userProfile.motivation_assessment.responses[0]}</p>
            </div>
          </CardContent>
        </Card>
        }

      <SATWeakDomainsPanel userId={user?.id} />

      {mostlySeen &&
        <Card className="mb-5 bg-emerald-50 border border-emerald-200">
          <CardContent className="p-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              You've seen most questions ({seenCount} total). AI will generate fresh ones for every session!
            </p>
          </CardContent>
        </Card>
        }

      {isGeneratingQuestion &&
        <div className="flex items-center gap-2 text-sm text-emerald-600 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating questions...
        </div>
        }

      {/* Main Category Cards */}
      {!selectedCategory ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Structured Learning */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-emerald-700 border-4 border-emerald-600 shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('structured')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">Structured Learning</h3>
                  <p className="text-sm text-emerald-50">Master SAT concepts with Desmos lessons and advanced Canyon Math classified problems.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Casual Practice */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-emerald-600 border-4 border-emerald-500 shadow-xl hover:shadow-2xl hover:border-emerald-400 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('casual')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">Casual Practice</h3>
                  <p className="text-sm text-emerald-50">Quick drills, targeted topics, and reviewing your past mistakes to sharpen your skills.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* SAT-Style Practice */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-stone-700 border-4 border-stone-600 shadow-xl hover:shadow-2xl hover:border-stone-500 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('sat-style')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">SAT-Style Practice</h3>
                  <p className="text-sm text-stone-50">Take a full adaptive module test or practice with authentic previous years' questions.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="mb-2 hover:bg-white text-stone-600 hover:text-emerald-700">
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" /> Back to Categories
          </Button>

          {selectedCategory === 'structured' && (
            <div className="grid md:grid-cols-2 gap-4">
              <Link to={createPageUrl('DesmosLessons')} className="block">
                <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg"><BookOpen className="w-6 h-6 text-white" /></div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Desmos Lessons</h3>
                      <p className="text-sm text-gray-500">Interactive calculator-based lessons to master SAT Math concepts visually</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={() => setCanyonMode('practice')}>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg"><Mountain className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Canyon Math</h3>
                    <p className="text-sm text-gray-500">Advanced classified problems from Canyon resources</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedCategory === 'casual' && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={() => startSession('setup')}>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg"><Target className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Custom Practice</h3>
                    <p className="text-sm text-gray-500">Choose your topics, question count, and session mode</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={() => setMistakesMode(true)}>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg"><RotateCcw className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Your Mistakes</h3>
                    <p className="text-sm text-gray-500">Review past incorrect answers and practice targeted questions</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedCategory === 'sat-style' && (
            <div className="grid md:grid-cols-2 gap-4">
              <Link to={createPageUrl('SATModuleTest')} className="block">
                <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-stone-200 transition-all rounded-3xl h-full">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-700 flex items-center justify-center flex-shrink-0 shadow-lg"><Target className="w-6 h-6 text-white" /></div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Full Module Test</h3>
                      <p className="text-sm text-gray-500">Take a complete adaptive SAT Math module test</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-stone-200 transition-all rounded-3xl h-full" onClick={() => setPyqMode(true)}>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-600 flex items-center justify-center flex-shrink-0 shadow-lg"><History className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Previous Years' Questions</h3>
                    <p className="text-sm text-gray-500">Practice with authentic past SAT exam questions</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      )}
    </div>);

  };

  const renderChoiceConfig = () => {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Configure Practice</h1>
          <p className="text-gray-600">Customize your session</p>
        </div>

        <Card className="bg-white border-4 border-emerald-200 shadow-xl rounded-3xl overflow-hidden mb-6">
          <CardContent className="p-6 space-y-8 mt-4">
            {/* Number of Questions */}
            <div>
              <Label className="text-base font-bold text-gray-900 mb-3 block">How many questions?</Label>
              <div className="flex gap-3 flex-wrap">
                {[5, 10, 15, 20].map((num) =>
                <button
                  key={num}
                  onClick={() => setPracticeConfig((prev) => ({ ...prev, count: num }))}
                  className={`px-6 py-2 rounded-full font-semibold transition-all border-2 ${
                  practiceConfig.count === num ?
                  'bg-emerald-500 text-white border-emerald-500' :
                  'bg-white text-gray-600 border-emerald-200 hover:border-emerald-400'}`
                  }>
                  
                    {num}
                  </button>
                )}
              </div>
            </div>

            {/* Domains */}
            <div>
              <Label className="text-base font-bold text-gray-900 mb-3 block">Which domains? (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DOMAIN_META).map(([key, meta]) => {
                  const isSelected = practiceConfig.domains.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setPracticeConfig((prev) => ({
                        ...prev,
                        domains: isSelected ?
                        prev.domains.filter((d) => d !== key) :
                        [...prev.domains, key]
                      }))}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      isSelected ?
                      'bg-emerald-500 text-white border-emerald-500 shadow-sm' :
                      'bg-stone-50 text-gray-600 border-stone-200 hover:border-emerald-300'}`
                      }>
                      
                      {meta.label}
                    </button>);

                })}
              </div>
            </div>

            {/* Choose Next Question */}
            <div>
              <Label className="text-base font-bold text-gray-900 mb-3 block">Session Mode</Label>
              <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-stone-100 bg-stone-50">
                <input
                  type="checkbox"
                  id="adaptiveChoice"
                  checked={practiceConfig.adaptiveChoice}
                  onChange={(e) => setPracticeConfig((prev) => ({ ...prev, adaptiveChoice: e.target.checked }))}
                  className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                
                <div>
                  <label htmlFor="adaptiveChoice" className="font-semibold text-gray-900 block cursor-pointer">
                    Choose the next question after finishing one
                  </label>
                  <p className="text-sm text-gray-500">
                    Instead of a fixed list, we'll give you two adaptive choices after each question.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full py-6 text-lg rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              onClick={() => {
                const finalType = practiceConfig.adaptiveChoice ? 'choice' : 'custom';
                setSelectedTopics(practiceConfig.domains);
                startSession(finalType, { count: practiceConfig.count, domains: practiceConfig.domains, adaptive: practiceConfig.adaptiveChoice });
              }}>
              
              Start Practice
            </Button>
          </CardContent>
        </Card>
      </div>);

  };

  const renderQuestionChoice = () => {
    const totalTime = questionHistory.reduce((sum, h) => sum + h.time_spent_seconds, 0);
    const timeLimit = choiceConfig.duration * 60;
    const timeRemaining = Math.max(0, timeLimit - totalTime);

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Choose Your Next Question</h2>
          <p className="text-gray-600">Pick the one you want to practice</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-emerald-600">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {questionOptions.map((q, idx) =>
          <motion.div key={q.id} whileHover={{ scale: 1.02 }}>
              <Card
              className="cursor-pointer bg-white border-4 border-emerald-200 shadow-xl hover:shadow-2xl transition-all h-full"
              onClick={() => {
                handleQuestionChoice(q);
                setIsTimerRunning(true);
              }}>
              
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {q.domain.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${
                  q.difficulty === 'easy' ? 'border-emerald-300 text-emerald-600' :
                  q.difficulty === 'medium' ? 'border-stone-300 text-stone-600' :
                  q.difficulty === 'hard' ? 'border-stone-500 text-stone-700' :
                  'border-stone-700 text-stone-800'}`
                  }>
                      {q.difficulty}
                    </Badge>
                  </div>
                  <p className="text-gray-800 leading-relaxed line-clamp-4"><MathText>{q.question_text}</MathText></p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>);

  };

  const renderQuestion = () => {
    if (sessionQuestions.length === 0) return null;
    const question = sessionQuestions[currentQuestionIndex];
    const progress = (currentQuestionIndex + 1) / sessionQuestions.length * 100;

    const userProfile = profile?.[0];
    const ef = userProfile?.executive_functioning || {};

    // Show progress encouragement for low task initiation
    const showProgressEncouragement = ef.task_initiation < 8 && currentQuestionIndex > 0;
    const showBreakReminder = ef.sustained_attention < 8 && currentQuestionIndex > 0 && currentQuestionIndex % 2 === 0;

    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="min-w-0">
              <Badge className={`${
            currentSession.session_type === 'blitz' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
            currentSession.session_type === 'recall' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
            currentSession.session_type === 'class' ? 'bg-stone-100 text-stone-800 border border-stone-300' :
            'bg-emerald-100 text-emerald-800 border border-emerald-300'}`
            }>
                {currentSession.session_type === 'recall' ? 'Recall' : currentSession.session_type.charAt(0).toUpperCase() + currentSession.session_type.slice(1)} Session
              </Badge>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-end flex-shrink-0">
              <CalculatorPanel tools={assignedTools} />
              <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timer)}</span>
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {currentQuestionIndex + 1} / {sessionQuestions.length}
              </span>
            </div>
          </div>

        <Progress value={progress} className="h-2 mb-6 bg-gray-100" />

        {/* Adaptive Encouragement */}
        {showProgressEncouragement && !isAnswered &&
        <Card className="mb-4 bg-emerald-50 border-2 border-emerald-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <p className="text-sm text-emerald-800">
                Great progress! You've completed {currentQuestionIndex} question{currentQuestionIndex > 1 ? 's' : ''} - keep going!
              </p>
            </CardContent>
          </Card>
        }

        {showBreakReminder && !isAnswered &&
        <Card className="mb-4 bg-stone-50 border-2 border-stone-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Pause className="w-5 h-5 text-stone-500" />
              <p className="text-sm text-stone-700">
                Feeling focused? Take a 30-second breath break if needed before continuing.
              </p>
            </CardContent>
          </Card>
        }

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}>
            
            <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)] mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {question.domain.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                  <Badge variant="outline" className={`text-xs whitespace-nowrap ${
                  question.difficulty === 'easy' ? 'border-emerald-300 text-emerald-600' :
                  question.difficulty === 'medium' ? 'border-stone-300 text-stone-600' :
                  question.difficulty === 'hard' ? 'border-stone-500 text-stone-700' :
                  'border-stone-700 text-stone-800'}`
                  }>
                    {question.difficulty}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <BookmarkButton questionData={{ ...question, subject: 'math' }} />
                  </div>
                </div>

                <div className="text-lg text-gray-800 mb-6 leading-relaxed">
                  <MathText>{question.question_text}</MathText>
                </div>

                {/* Recall mode prediction gate */}
                {currentSession?.session_type === 'recall' && !recallRevealed && !isAnswered &&
                <div className="mb-6 p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-sm text-blue-900">Predict First</h4>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      Before seeing the answer choices, write down what process you'd use to solve this and what you predict the answer will be.
                    </p>
                    <textarea
                    className="w-full rounded-xl border-2 border-blue-200 bg-white p-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
                    rows={3}
                    placeholder="I would start by... I predict the answer is..."
                    value={recallPrediction}
                    onChange={(e) => setRecallPrediction(e.target.value)} />
                  
                    <Button
                    onClick={() => setRecallRevealed(true)}
                    disabled={recallPrediction.trim().length < 5}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm">
                    
                      Reveal Choices & Solve
                    </Button>
                  </div>
                }

                {(currentSession?.session_type !== 'recall' || recallRevealed || isAnswered) && Array.isArray(question.options) && question.options.length > 0 && question.options.some((opt) => opt && (opt.label || typeof opt === 'string')) ? (() => {
                  const correctAnswers = String(question.correct_answer || '').split(',').map((a) => a.trim().toUpperCase());
                  const isMultiSelect = correctAnswers.length > 1;
                  return (
                    <>
                      {isMultiSelect && !isAnswered &&
                      <p className="text-xs text-emerald-700 font-medium mb-2">
                          Select all that apply ({correctAnswers.length} correct answers)
                        </p>
                      }
                      <div className="space-y-3">
                        {question.options.map((option) => {
                          const isSelected = selectedAnswers.includes(option.label);
                          const isCorrectOption = correctAnswers.includes(option.label);

                          let optionClass = "border-gray-200";
                          if (isAnswered) {
                            if (isCorrectOption) optionClass = "border-emerald-500 bg-emerald-50";else
                            if (isSelected && !isCorrectOption) optionClass = "border-red-500 bg-red-50";
                          } else if (isSelected) {
                            optionClass = "border-emerald-400 bg-emerald-50/60";
                          }

                          const toggleAnswer = () => {
                            if (isAnswered) return;
                            if (isMultiSelect) {
                              setSelectedAnswers((prev) =>
                              prev.includes(option.label) ?
                              prev.filter((a) => a !== option.label) :
                              [...prev, option.label]
                              );
                            } else {
                              setSelectedAnswers([option.label]);
                            }
                          };

                          return (
                            <div
                              key={option.label}
                              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${optionClass} ${!isAnswered ? 'hover:border-emerald-300 hover:bg-emerald-50/40' : ''}`}
                              onClick={toggleAnswer}>
                              
                              <div className={`w-7 h-7 ${isMultiSelect ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                              isAnswered && isCorrectOption ? 'bg-emerald-500 border-emerald-500 text-white' :
                              isAnswered && isSelected && !isCorrectOption ? 'bg-red-500 border-red-500 text-white' :
                              isSelected ? 'bg-emerald-500 border-emerald-500 text-white' :
                              'border-gray-300 text-gray-500'}`
                              }>
                                {option.label}
                              </div>
                              <div className="text-gray-700 flex-1 leading-relaxed text-sm">
                                <MathText>{option.text}</MathText>
                              </div>
                              {isAnswered && isCorrectOption && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                              {isAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                            </div>);

                        })}
                      </div>
                    </>);

                })() : currentSession?.session_type !== 'recall' || recallRevealed || isAnswered ?
                <div>
                    <Input
                    type="text"
                    value={selectedAnswers[0] || ''}
                    onChange={(e) => setSelectedAnswers(e.target.value ? [e.target.value] : [])}
                    disabled={isAnswered}
                    placeholder="Enter your answer..."
                    className="text-lg p-4 border-2" />
                  
                    {!isAnswered &&
                  <MathKeyboard onInsert={(val) => {
                    const current = selectedAnswers[0] || '';
                    setSelectedAnswers([current + val]);
                  }} />
                  }
                    {isAnswered &&
                  <div className={`mt-3 flex items-center gap-2 ${
                  normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correct_answer) ?
                  'text-emerald-600' :
                  'text-red-600'}`
                  }>
                        {normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correct_answer) ?
                    <CheckCircle className="w-5 h-5" /> :
                    <XCircle className="w-5 h-5" />}
                        <span>Correct answer: {question.correct_answer}</span>
                      </div>
                  }
                  </div> :
                null}
              </CardContent>
            </Card>

            {/* Explanation + Tutor */}
            {showExplanation && explanationsAllowed &&
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}>
              
                {(() => {
                const correctAnswers = question.correct_answer.split(',').map((a) => a.trim().toUpperCase()).sort();
                const userAnswersSorted = [...selectedAnswers].sort();
                const isCorrect = correctAnswers.join(',') === userAnswersSorted.join(',');
                return (
                  <Card className={`border-2 mb-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-300'}`}>
                       <CardContent className="p-5">
                         <div className="flex items-center gap-2 mb-3">
                           <Lightbulb className={`w-5 h-5 ${isCorrect ? 'text-emerald-700' : 'text-stone-600'}`} />
                           <h3 className={`font-semibold text-sm ${isCorrect ? 'text-emerald-900' : 'text-stone-800'}`}>
                            {isCorrect ? 'Correct! Here\'s the solution:' : 'Not quite — here\'s the full solution:'}
                          </h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-emerald-200">
                            <span className="text-xs font-semibold text-emerald-600">Correct answer{correctAnswers.length > 1 ? 's' : ''}:</span>
                            <span className="font-bold text-emerald-700">{question.correct_answer}</span>
                          </div>
                          {question.explanation ?
                        <ExplanationText isCorrect={isCorrect}>
                              {question.explanation}
                            </ExplanationText> :

                        <p className="text-sm text-gray-500 italic">No detailed explanation available for this question.</p>
                        }
                        </div>
                      </CardContent>
                    </Card>);

              })()}

                {/* AI Tutor */}
                {tutorAllowed && (() => {
                const correctAnswers = question.correct_answer.split(',').map((a) => a.trim().toUpperCase()).sort();
                const isCorrect = correctAnswers.join(',') === [...selectedAnswers].sort().join(',');
                return !showTutor ?
                <button
                  onClick={() => setShowTutor(true)}
                  className={`w-full mb-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  !isCorrect ?
                  'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                  'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'}`
                  }>
                  
                      {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                    </button> :

                <QuestionTutor
                  question={question}
                  userAnswer={selectedAnswer}
                  isCorrect={isCorrect}
                  onClose={() => setShowTutor(false)} />;


              })()}
              </motion.div>
            }

            {/* Recall: Show prediction comparison after answering */}
            {currentSession?.session_type === 'recall' && isAnswered && recallPrediction &&
            <Card className="border-2 border-blue-200 bg-blue-50 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Your Prediction</span>
                  </div>
                  <p className="text-sm text-blue-800 italic">{recallPrediction}</p>
                </CardContent>
              </Card>
            }

            {/* Actions */}
            {/* Question Actions footer */}
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
                  } />
                
              </div>

              <div className="flex justify-end gap-3">
                {!isAnswered && (currentSession?.session_type !== 'recall' || recallRevealed) ?
                <>
                    <IDontKnowButton onClick={handleIDontKnow} />
                    <Button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswers.length === 0}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    
                      Submit Answer
                    </Button>
                  </> :
                isAnswered ?
                <Button
                  onClick={handleNextQuestion}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  
                    {currentSession.session_type === 'choice' ? 'Proceed' :
                  currentQuestionIndex < sessionQuestions.length - 1 ? 'Next Question' : 'Finish Session'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button> :
                null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>);

  };

  const renderSessionComplete = () => {
    const correct = questionHistory.filter((h) => h.correct).length;
    const total = questionHistory.length;
    const idkCount = questionHistory.filter(isIdkEntry).length;
    const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

    const userProfile = profile?.[0];
    const motivation = userProfile?.motivation_assessment || {};

    // Generate personalized completion message
    let completionMessage = "Great work on your practice session";
    if (motivation.intrinsic_motivation < 40 && accuracy >= 60) {
      completionMessage = `You're building the skills to achieve your goals. ${correct} correct answers is real progress!`;
    } else if (accuracy >= 80) {
      completionMessage = "Outstanding performance! Your hard work is paying off";
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center">
        
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
          <Award className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Session Complete!</h1>
        <p className="text-gray-600 mb-8">{completionMessage}</p>
        
        {userProfile?.motivation_assessment?.responses?.[0] && motivation.intrinsic_motivation < 50 &&
        <Card className="mb-6 bg-emerald-50 border-2 border-emerald-200">
            <CardContent className="p-4">
              <p className="text-sm text-emerald-800">
                Remember why this matters: <em>{userProfile.motivation_assessment.responses[0]}</em>
              </p>
            </CardContent>
          </Card>
        }

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-emerald-50 border-2 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-800">{correct}/{total}</p>
              <p className="text-sm text-gray-600">Correct</p>
              {idkCount > 0 &&
              <p className="text-xs text-amber-600 font-semibold mt-1">{idkCount} not known</p>
              }
            </CardContent>
          </Card>
          <Card className="bg-stone-50 border-2 border-stone-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-stone-800">{accuracy}%</p>
              <p className="text-sm text-gray-600">Accuracy</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-2 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-800">
                {Math.round(questionHistory.reduce((sum, h) => sum + h.time_spent_seconds, 0) / (total || 1))}s
              </p>
              <p className="text-sm text-gray-600">Avg Time</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentSession(null);
              setSessionQuestions([]);
              setQuestionHistory([]);
            }}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            
            <RotateCcw className="w-4 h-4 mr-2" />
            New Session
          </Button>
          <Link to={createPageUrl('KnowledgeGraph')}>
            <Button variant="outline" className="border-stone-700 text-stone-700 hover:bg-stone-700 hover:text-white gap-2">
              <Network className="w-4 h-4" />
              View Knowledge Graph
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>);

  };

  if (mistakesMode) {
    return (
      <div className="relative">
        {isGeneratingQuestion &&
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl min-h-[400px]">
             <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
             <p className="text-emerald-700 font-medium">Generating similar practice questions...</p>
           </div>
        }
        <MistakesReviewMode
          user={user}
          subject="math"
          allQuestionsLookup={SAMPLE_QUESTIONS}
          onBack={() => setMistakesMode(false)}
          onPracticeSimilar={(domain, difficulty, mistakeText) => {
            startSimilarSession(mistakeText, domain, difficulty);
          }} />
        
      </div>);

  }

  // Canyon Math modes
  if (canyonMode === 'practice') {
    return <CanyonMathPractice onBack={() => setCanyonMode(null)} />;
  }
  if (canyonMode === 'lessons') {
    return <CanyonMathLessons onBack={() => setCanyonMode(null)} />;
  }

  // PYQ mode
  if (pyqMode) {
    return (
      <PYQSession user={user} onBack={() => setPyqMode(false)} />);

  }

  // Lessons mode
  if (lessonMode) {
    return (
      <div className="max-w-2xl mx-auto">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>
        <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl mb-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-white">SAT Math Lessons</h1>
              <p className="text-white/80 text-sm">Master any concept with guided instruction</p>
            </div>
          </div>
        </div>
        {unitMode && lessonDomain ?
        <UnitBrowser domain={lessonDomain} onBack={() => {setLessonDomain(null);setUnitMode(false);}} /> :
        lessonDomain && !unitMode ?
        <LessonViewer
          domain={lessonDomain}
          subtopic={lessonSubtopic}
          onBack={() => setLessonDomain(null)} /> :


        <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex rounded-xl border-2 border-emerald-200 overflow-hidden">
              <button
              onClick={() => setUnitMode(false)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              !unitMode ? 'bg-emerald-500 text-white' : 'bg-white text-stone-600 hover:bg-emerald-50'}`
              }>
              
                Free Lessons
              </button>
              <button
              onClick={() => setUnitMode(true)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              unitMode ? 'bg-emerald-500 text-white' : 'bg-white text-stone-600 hover:bg-emerald-50'}`
              }>
              
                Unit Curriculum
              </button>
            </div>
            {unitMode &&
          <p className="text-xs text-stone-500 text-center">Structured units with checkpoint quizzes and unit tests — track your progress systematically.</p>
          }
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Choose a domain</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(DOMAIN_META).map(([key, meta]) =>
            <button
              key={key}
              onClick={() => setLessonDomain(key)}
              className="text-left p-4 rounded-2xl border-2 border-white bg-white shadow-md hover:border-emerald-300 hover:shadow-emerald-100 transition-all group">
              
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-stone-800 group-hover:text-emerald-700">{meta.label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-500" />
                  </div>
                </button>
            )}
            </div>
            <button onClick={() => setLessonMode(false)} className="text-sm text-stone-400 hover:text-stone-600 underline mt-2">
              ← Back to Practice
            </button>
          </div>
        }
      </div>);

  }

  if (!currentSession) {
    return renderSessionSelection();
  }

  if (currentSession.status === 'config') {
    return renderChoiceConfig();
  }

  if (currentSession.session_type === 'choice' && questionOptions.length > 0 &&
  currentQuestionIndex >= sessionQuestions.length) {
    return renderQuestionChoice();
  }

  if (currentSession.status === 'completed' ||
  sessionQuestions.length > 0 && currentQuestionIndex >= sessionQuestions.length) {
    return (
      <>
        {renderSessionComplete()}
        {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
      </>);

  }

  if (sessionQuestions.length === 0) {
    return null;
  }

  return (
    <>
      {renderQuestion()}
      {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
    </>);

}
