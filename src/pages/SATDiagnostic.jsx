import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { recalculateKnowledgeGraph } from '@/utils/satMasterySync';
import { sanitizeMathInput } from '@/utils/mathUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, ChevronRight, Loader2, Target, Trophy, ArrowLeft, X, Clock } from 'lucide-react';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import QuestionTutor from '@/components/sat/QuestionTutor';
import ExplanationText from '@/components/sat/ExplanationText';
import IDontKnowButton from '@/components/sat/IDontKnowButton';
import { IDK_ANSWER, isIdkEntry } from '@/utils/idk';
import { answersEquivalent } from '@/utils/mathUtils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SAT_QUESTIONS as SAT_QUESTIONS_BASE } from '@/data/satQuestions';
import { SAT_QUESTIONS_EXTREME } from '@/data/satQuestionsExtreme';
import { SUPPLEMENTAL_LEVELS, getSupplementalLevel } from '@/data/supplementalDiagnostic';
import { filterValidQuestions } from '@/data/diagnosticQuestionValidator';

// Self-policing question pool: any question whose explanation contradicts its
// marked answer or contains hedging language ("Recalc", "Hmm", "Per answer key",
// "Answer is B" when correct=A, etc.) is silently dropped before it can ever
// reach a student. This is the single source of truth for what the diagnostic
// is allowed to serve.
const SAT_QUESTIONS = filterValidQuestions([...SAT_QUESTIONS_BASE, ...SAT_QUESTIONS_EXTREME]);

const DOMAINS = [
  'algebra', 'advanced_algebra', 'geometry', 'trigonometry', 
  'statistics', 'problem_solving', 'systems_of_equations', 
  'quadratics', 'exponentials', 'ratios_proportions', 'circles', 'polynomials'
];

// Prerequisite map: if a student struggles with a domain, probe these foundational skills
const PREREQUISITES = {
  advanced_algebra: ['algebra'],
  quadratics: ['algebra', 'advanced_algebra'],
  systems_of_equations: ['algebra'],
  polynomials: ['algebra', 'advanced_algebra'],
  trigonometry: ['geometry', 'ratios_proportions'],
  circles: ['geometry'],
  exponentials: ['algebra', 'ratios_proportions'],
  statistics: ['ratios_proportions', 'problem_solving'],
  geometry: ['ratios_proportions'],
};

// Foundational prerequisite concepts (not in SAT question bank — assessed via targeted questions)
const PREREQUISITE_TOPICS = {
  algebra: {
    title: 'Pre-Algebra Foundations',
    description: 'Order of operations, integer arithmetic, fractions, basic equation solving',
    emoji: '🔢',
    questions: [
      {
        id: 'pre_algebra_1',
        question: 'What is the value of 3 + 4 × 2 − 1?',
        options: ['A) 12', 'B) 10', 'C) 13', 'D) 6'],
        correct: 'B',
        explanation: 'Order of operations (PEMDAS): multiply first: 4×2=8, then 3+8−1=10.',
        domain: 'pre_algebra', difficulty: 'easy'
      },
      {
        id: 'pre_algebra_2',
        question: 'Simplify: (2/3) + (1/4)',
        options: ['A) 3/7', 'B) 11/12', 'C) 3/12', 'D) 8/12'],
        correct: 'B',
        explanation: 'Common denominator 12: 8/12 + 3/12 = 11/12.',
        domain: 'pre_algebra', difficulty: 'easy'
      },
      {
        id: 'pre_algebra_3',
        question: 'Solve for x: 4x − 3 = 13',
        options: ['A) 2.5', 'B) 3', 'C) 4', 'D) 5'],
        correct: 'C',
        explanation: '4x = 16, x = 4.',
        domain: 'pre_algebra', difficulty: 'easy'
      },
    ]
  },
  ratios_proportions: {
    title: 'Ratios & Fractions Foundations',
    description: 'Unit rates, proportional reasoning, percent basics',
    emoji: '⚖️',
    questions: [
      {
        id: 'pre_ratio_1',
        question: 'If a car travels 60 miles in 2 hours, how many miles does it travel in 5 hours at the same speed?',
        options: ['A) 120', 'B) 150', 'C) 180', 'D) 200'],
        correct: 'B',
        explanation: 'Speed = 30 mph. In 5 hours: 30 × 5 = 150 miles.',
        domain: 'pre_ratio', difficulty: 'easy'
      },
      {
        id: 'pre_ratio_2',
        question: 'What is 35% of 200?',
        options: ['A) 35', 'B) 60', 'C) 70', 'D) 80'],
        correct: 'C',
        explanation: '0.35 × 200 = 70.',
        domain: 'pre_ratio', difficulty: 'easy'
      },
    ]
  },
  geometry: {
    title: 'Basic Geometry Foundations',
    description: 'Area, perimeter, angle relationships, Pythagorean theorem',
    emoji: '📐',
    questions: [
      {
        id: 'pre_geo_1',
        question: 'What is the perimeter of a rectangle with length 8 and width 5?',
        options: ['A) 13', 'B) 26', 'C) 40', 'D) 20'],
        correct: 'B',
        explanation: 'Perimeter = 2(8 + 5) = 26.',
        domain: 'pre_geometry', difficulty: 'easy'
      },
      {
        id: 'pre_geo_2',
        question: 'Angles in a triangle sum to:',
        options: ['A) 90°', 'B) 180°', 'C) 270°', 'D) 360°'],
        correct: 'B',
        explanation: 'The interior angles of any triangle always sum to 180°.',
        domain: 'pre_geometry', difficulty: 'easy'
      },
    ]
  },
};

export default function SATDiagnostic() {
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('intro'); // intro, testing, results, previous
  const [previousResults, setPreviousResults] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [domainResults, setDomainResults] = useState({});
  const [prerequisiteGaps, setPrerequisiteGaps] = useState({}); // tracks which prereqs were probed & results
  const [probedPrereqs, setProbedPrereqs] = useState(new Set()); // prereq topic keys already added
  const [showTutor, setShowTutor] = useState(false);
  // Supplemental section state
  const [supplementalLevel, setSupplementalLevel] = useState(null); // 1, 2, or 3
  const [supplementalIndex, setSupplementalIndex] = useState(0);
  const [supplementalResponses, setSupplementalResponses] = useState([]);
  const [supplementalSelected, setSupplementalSelected] = useState('');
  const [supplementalAnswered, setSupplementalAnswered] = useState(false);
  const [supplementalInput, setSupplementalInput] = useState('');
  const [supplementalStartTime, setSupplementalStartTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const navigate = useNavigate();

  // Live timer for current question
  useEffect(() => {
    if (stage !== 'testing' && stage !== 'supplemental') return;
    const startRef = stage === 'supplemental' ? supplementalStartTime : questionStartTime;
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startRef) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, questionStartTime, supplementalStartTime]);

  useEffect(() => {
    const init = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      // Load previous concept nodes for this user
      try {
        const nodes = await base44.entities.ConceptNode.filter({ user_id: userData.id, study_plan_title: 'SAT Math Practice' });
        if (nodes.length > 0) setPreviousResults(nodes);
      } catch {}

      const urlParams = new URLSearchParams(window.location.search);
      const querySupplementalLevel = urlParams.get('supplementalLevel');
      if (querySupplementalLevel) {
        setSupplementalLevel(parseInt(querySupplementalLevel, 10));
        setStage('supplemental');
      }
      
    };
    init().catch(() => base44.auth.redirectToLogin());
  }, []);

  // Track domain coverage to ensure breadth across all 12 SAT domains
  const getAdaptiveQuestion = (responsesSoFar, usedIds, currentProbedPrereqs) => {
    // Probe prerequisites after Q5 and Q10
    if (responsesSoFar.length >= 5 && responsesSoFar.length % 5 === 0) {
      const prereqQuestion = getPrerequisiteQuestion(responsesSoFar, usedIds, currentProbedPrereqs);
      if (prereqQuestion) return prereqQuestion;
    }

    // --- Adaptive difficulty: aggressive Elo-style scoring (starts at hard) ---
    const window4 = responsesSoFar.slice(-4);
    const window6 = responsesSoFar.slice(-6);
    const recentAccuracy4 = window4.length > 0 ? window4.filter(r => r.correct).length / window4.length : 0.5;
    const recentAccuracy6 = window6.length > 0 ? window6.filter(r => r.correct).length / window6.length : 0.5;
    const recentAccuracy = responsesSoFar.length < 6 ? recentAccuracy6 : (recentAccuracy4 * 0.6 + recentAccuracy6 * 0.4);

    // Difficulty calibration: starts at hard, moves to expert quickly
    let targetDifficulty;
    if (responsesSoFar.length === 0) {
      targetDifficulty = 'hard'; // Always start with a hard question
    } else if (recentAccuracy >= 0.75) {
      targetDifficulty = 'expert';
    } else if (recentAccuracy >= 0.50) {
      targetDifficulty = 'hard';
    } else if (recentAccuracy >= 0.30) {
      targetDifficulty = 'medium';
    } else {
      targetDifficulty = responsesSoFar.length > 6 ? 'easy' : 'medium';
    }

    // --- Domain coverage: identify least-covered domains ---
    const domainCounts = {};
    DOMAINS.forEach(d => { domainCounts[d] = 0; });
    responsesSoFar.filter(r => !r.isPrerequisite).forEach(r => {
      if (domainCounts[r.domain] !== undefined) domainCounts[r.domain]++;
    });

    // Priority domains: those with fewest questions asked so far
    const minCoverage = Math.min(...Object.values(domainCounts));
    const priorityDomains = DOMAINS.filter(d => domainCounts[d] <= minCoverage + 1);

    // Struggle domains: accuracy ≤ 50% in domain — boost presence
    const domainPerf = {};
    responsesSoFar.filter(r => !r.isPrerequisite).forEach(r => {
      if (!domainPerf[r.domain]) domainPerf[r.domain] = { total: 0, correct: 0 };
      domainPerf[r.domain].total++;
      if (r.correct) domainPerf[r.domain].correct++;
    });
    const struggleDomains = Object.entries(domainPerf)
      .filter(([, p]) => p.total >= 1 && p.correct / p.total <= 0.5)
      .map(([d]) => d);

    // Build candidate pool with preference: priority + struggle domains at target difficulty
    let candidates = SAT_QUESTIONS.filter(q =>
      !usedIds.has(q.id) &&
      q.difficulty === targetDifficulty &&
      (priorityDomains.includes(q.domain) || struggleDomains.includes(q.domain))
    );

    // Fallback 1: target difficulty only (any domain)
    if (candidates.length === 0) {
      candidates = SAT_QUESTIONS.filter(q => !usedIds.has(q.id) && q.difficulty === targetDifficulty);
    }

    // Fallback 2: adjacent difficulty
    if (candidates.length === 0) {
      const adjacent = targetDifficulty === 'expert' ? ['hard'] :
                       targetDifficulty === 'hard' ? ['medium', 'expert'] :
                       targetDifficulty === 'medium' ? ['hard', 'easy'] : ['medium'];
      candidates = SAT_QUESTIONS.filter(q => !usedIds.has(q.id) && adjacent.includes(q.difficulty));
    }

    // Fallback 3: any unused question
    if (candidates.length === 0) candidates = SAT_QUESTIONS.filter(q => !usedIds.has(q.id));
    if (candidates.length === 0) candidates = SAT_QUESTIONS;

    // Weighted random: slightly prefer priority/struggle domains
    const weighted = [];
    candidates.forEach(q => {
      const weight = (priorityDomains.includes(q.domain) || struggleDomains.includes(q.domain)) ? 3 : 1;
      for (let i = 0; i < weight; i++) weighted.push(q);
    });

    return weighted[Math.floor(Math.random() * weighted.length)];
  };

  // Find a prerequisite question to probe if student is struggling in a domain
  const getPrerequisiteQuestion = (responsesSoFar, usedIds, currentProbedPrereqs) => {
    // Find domains where student got ≤ 50% correct
    const domainPerf = {};
    responsesSoFar.forEach(r => {
      if (!domainPerf[r.domain]) domainPerf[r.domain] = { total: 0, correct: 0 };
      domainPerf[r.domain].total++;
      if (r.correct) domainPerf[r.domain].correct++;
    });

    const strugglingDomains = Object.entries(domainPerf)
      .filter(([, perf]) => perf.total >= 1 && perf.correct / perf.total <= 0.5)
      .map(([domain]) => domain);

    // Find which prerequisites haven't been probed yet
    for (const domain of strugglingDomains) {
      const prereqs = PREREQUISITES[domain] || [];
      for (const prereqDomain of prereqs) {
        if (PREREQUISITE_TOPICS[prereqDomain] && !currentProbedPrereqs.has(prereqDomain)) {
          const topic = PREREQUISITE_TOPICS[prereqDomain];
          const unusedQ = topic.questions.find(q => !usedIds.has(q.id));
          if (unusedQ) return { ...unusedQ, isPrerequisite: true, prereqKey: prereqDomain };
        }
      }
    }
    return null;
  };

  const generateQuestions = async () => {
    setLoading(true);
    setStage('testing');
    
    // Start with first adaptive question
    const firstQuestion = getAdaptiveQuestion([], new Set());
    setQuestions([firstQuestion]);
    setUsedQuestionIds(new Set([firstQuestion.id]));
    setQuestionStartTime(Date.now());
    setLoading(false);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if ((urlParams.get('start') === 'true' || urlParams.get('autoStart') === '1') && stage === 'intro') {
      generateQuestions();
      // Remove start param from URL so it doesn't trigger again on refresh
      urlParams.delete('start');
      urlParams.delete('autoStart');
      const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [stage]);

  const handleAnswer = (option) => {
    if (answered) return;
    setSelectedAnswer(option);
    setAnswered(true);
    
    const q = questions[currentQuestion];
    const isMC = q.options && q.options.length > 0;
    
    let correct = false;
    if (isMC) {
      correct = option.startsWith(q.correct);
    } else {
      correct = answersEquivalent(option, q.correct);
    }

    // Track prerequisite results separately
    if (q.isPrerequisite) {
      setPrerequisiteGaps(prev => ({
        ...prev,
        [q.prereqKey]: { ...prev[q.prereqKey], correct: (prev[q.prereqKey]?.correct || 0) + (correct ? 1 : 0), total: (prev[q.prereqKey]?.total || 0) + 1 }
      }));
      setProbedPrereqs(prev => new Set([...prev, q.prereqKey]));
    }

    setResponses(prev => [...prev, { 
      question_id: q.id,
      user_answer: option,
      domain: q.domain,
      difficulty: q.difficulty,
      correct,
      isPrerequisite: !!q.isPrerequisite,
      prereqKey: q.prereqKey,
      question_text: q.question,
      options: q.options?.map(opt => ({ label: opt[0], text: opt.slice(3) })) || [],
      correct_answer: q.correct,
      explanation: q.explanation,
      time_spent_seconds: Math.floor((Date.now() - questionStartTime) / 1000)
    }]);
  };

  const handleIDontKnow = () => {
    if (answered) return;
    setSelectedAnswer(IDK_ANSWER);
    setAnswered(true);
    const q = questions[currentQuestion];

    if (q.isPrerequisite) {
      setPrerequisiteGaps(prev => ({
        ...prev,
        [q.prereqKey]: { ...prev[q.prereqKey], correct: (prev[q.prereqKey]?.correct || 0), total: (prev[q.prereqKey]?.total || 0) + 1 }
      }));
      setProbedPrereqs(prev => new Set([...prev, q.prereqKey]));
    }

    setResponses(prev => [...prev, {
      question_id: q.id,
      user_answer: IDK_ANSWER,
      idk: true,
      domain: q.domain,
      difficulty: q.difficulty,
      correct: false,
      isPrerequisite: !!q.isPrerequisite,
      prereqKey: q.prereqKey,
      question_text: q.question,
      options: q.options?.map(opt => ({ label: opt[0], text: opt.slice(3) })) || [],
      correct_answer: q.correct,
      explanation: q.explanation,
      time_spent_seconds: Math.floor((Date.now() - questionStartTime) / 1000)
    }]);
  };

    const TOTAL_QUESTIONS = 24; // Extended adaptive diagnostic

  const nextQuestion = async () => {
    setShowTutor(false);
    const newResponseCount = responses.length + 1;
    if (newResponseCount < TOTAL_QUESTIONS) {
      const newUsedIds = new Set([...usedQuestionIds]);
      const nextQ = getAdaptiveQuestion(responses, newUsedIds, probedPrereqs);
      newUsedIds.add(nextQ.id);
      setUsedQuestionIds(newUsedIds);
      setQuestions(prev => [...prev, nextQ]);
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer('');
      setAnswered(false);
      setQuestionStartTime(Date.now());
    } else {
      await calculateAndSaveResults();
    }
  };

  const calculateAndSaveResults = async () => {
    setLoading(true);

    // Determine supplemental level immediately from accuracy and show results fast.
    const quickAccuracy = responses.length > 0
      ? Math.round((responses.filter(r => r.correct).length / responses.length) * 100)
      : 0;
    setSupplementalLevel(getSupplementalLevel(quickAccuracy));
    setStage('results');
    setLoading(false);

    // Calculate domain mastery based on responses
    const masteryByDomain = {};
    DOMAINS.forEach(domain => {
      const domainResponses = responses.filter(r => r.domain === domain);
      if (domainResponses.length === 0) {
        masteryByDomain[domain] = 'not_started';
        return;
      }

      const correctCount = domainResponses.filter(r => r.correct).length;
      const accuracy = correctCount / domainResponses.length;

      if (accuracy === 1) masteryByDomain[domain] = 'mastered';
      else if (accuracy >= 0.67) masteryByDomain[domain] = 'practiced';
      else if (accuracy >= 0.33) masteryByDomain[domain] = 'learning';
      else masteryByDomain[domain] = 'not_started';
    });

    setDomainResults(masteryByDomain);

    // Overall accuracy across all responses
    const overallAccuracy = responses.length > 0
      ? Math.round((responses.filter(r => r.correct).length / responses.length) * 100)
      : 0;

    // Compute prerequisite gap results
    const prereqResults = {};
    Object.entries(prerequisiteGaps).forEach(([key, perf]) => {
      prereqResults[key] = perf.total === 0 ? 'not_started'
        : perf.correct / perf.total === 1 ? 'mastered'
        : perf.correct / perf.total >= 0.5 ? 'learning'
        : 'not_started';
    });

    // Update user profile with diagnostic completion + save SAT diagnostic scores
    if (user?.id) {
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });

      // Build exact domain_scores object from responses
      const domain_scores = {};
      DOMAINS.forEach(domain => {
        const domainResponses = responses.filter(r => r.domain === domain);
        if (domainResponses.length > 0) {
          domain_scores[domain] = Math.round((domainResponses.filter(r => r.correct).length / domainResponses.length) * 100);
        } else {
          domain_scores[domain] = 0;
        }
      });

      // Determine overall level
      const masteredCount = Object.values(masteryByDomain).filter(v => v === 'mastered').length;
      const practicedCount = Object.values(masteryByDomain).filter(v => v === 'practiced').length;
      const total = DOMAINS.length;
      const overallLevel = masteredCount / total >= 0.6 ? 'expert'
        : (masteredCount + practicedCount) / total >= 0.5 ? 'advanced'
        : (masteredCount + practicedCount) / total >= 0.25 ? 'intermediate'
        : 'beginner';

      const satPerformanceData = {
        overall_level: overallLevel,
        domain_scores,
        total_questions_attempted: responses.length,
        total_correct: responses.filter(r => r.correct).length,
        average_time_per_question: responses.length ? Math.round(responses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / responses.length) : 0,
        diagnostic_accuracy: overallAccuracy,
        last_diagnostic_date: new Date().toISOString(),
        responses,
      };

      if (profiles.length > 0) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          diagnostic_completed: true,
          sat_performance: satPerformanceData,
        });
      } else {
        await base44.entities.UserProfile.create({
          user_id: user.id,
          diagnostic_completed: true,
          sat_performance: satPerformanceData,
        });
      }

      await base44.entities.PracticeSession.create({
        user_id: user.id,
        session_type: 'diagnostic',
        status: 'completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: Math.ceil(responses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / 60),
        questions_attempted: satPerformanceData.total_questions_attempted,
        questions_correct: satPerformanceData.total_correct,
        domains_covered: [...new Set(responses.map(r => r.domain))],
        question_history: responses,
        performance_summary: {
          accuracy_percentage: satPerformanceData.diagnostic_accuracy,
          avg_time_per_question: satPerformanceData.average_time_per_question,
        }
      });

      // Sync mastery to the static Knowledge Graph nodes (now that the session is created)
      await recalculateKnowledgeGraph(user.id, base44);
    }

    // Mark assignment complete if one is provided
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignmentId');
    if (assignmentId && user?.id) {
      try {
        const progress = await base44.entities.StudentAssignmentProgress.filter({
          assignment_id: assignmentId,
          student_id: user.id
        });
        if (progress.length > 0) {
          await base44.entities.StudentAssignmentProgress.update(progress[0].id, {
            status: 'completed',
            progress_percentage: 100,
            question_history: responses
          });
        }
      } catch (e) {
        console.error('Error marking assignment complete', e);
      }
    }
  };

  // Start the supplemental section
  const startSupplemental = () => {
    setSupplementalIndex(0);
    setSupplementalResponses([]);
    setSupplementalSelected('');
    setSupplementalAnswered(false);
    setSupplementalInput('');
    setSupplementalStartTime(Date.now());
    setStage('supplemental');
  };

  const handleSupplementalAnswer = (option) => {
    if (supplementalAnswered) return;
    const q = SUPPLEMENTAL_LEVELS[supplementalLevel].questions[supplementalIndex];
    const isMC = q.options && q.options.length > 0;
    let correct = false;
    let chosen = option;

    if (isMC) {
      correct = option.startsWith(q.correct);
    } else {
      chosen = supplementalInput;
      correct = answersEquivalent(supplementalInput, q.correct);
    }

    setSupplementalSelected(chosen);
    setSupplementalAnswered(true);
    setSupplementalResponses(prev => [...prev, { 
      question_id: q.id,
      domain: q.domain, 
      difficulty: q.difficulty, 
      correct,
      question_text: q.question,
      user_answer: chosen,
      correct_answer: q.correct,
      explanation: q.explanation,
      time_spent_seconds: Math.floor((Date.now() - supplementalStartTime) / 1000)
    }]);
  };

  const handleSupplementalIDontKnow = () => {
    if (supplementalAnswered) return;
    const q = SUPPLEMENTAL_LEVELS[supplementalLevel].questions[supplementalIndex];
    setSupplementalSelected(IDK_ANSWER);
    setSupplementalAnswered(true);
    setSupplementalResponses(prev => [...prev, {
      question_id: q.id,
      domain: q.domain,
      difficulty: q.difficulty,
      correct: false,
      idk: true,
      question_text: q.question,
      user_answer: IDK_ANSWER,
      correct_answer: q.correct,
      explanation: q.explanation,
      time_spent_seconds: Math.floor((Date.now() - supplementalStartTime) / 1000)
    }]);
  };

  const nextSupplemental = async () => {
    const total = SUPPLEMENTAL_LEVELS[supplementalLevel].questions.length;
    if (supplementalIndex + 1 < total) {
      setSupplementalIndex(prev => prev + 1);
      setSupplementalSelected('');
      setSupplementalAnswered(false);
      setSupplementalInput('');
      setShowTutor(false);
      setSupplementalStartTime(Date.now());
    } else {
      if (user?.id) {
        try {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            const profile = profiles[0];
            const newPerformance = { ...profile.sat_performance };
            newPerformance.supplemental_results = {
              level: supplementalLevel,
              responses: supplementalResponses,
              accuracy: Math.round((supplementalResponses.filter(r => r.correct).length / supplementalResponses.length) * 100)
            };
            await base44.entities.UserProfile.update(profile.id, {
              sat_performance: newPerformance
            });
          } else {
             await base44.entities.UserProfile.create({
               user_id: user.id,
               sat_performance: {
                 supplemental_results: {
                   level: supplementalLevel,
                   responses: supplementalResponses,
                   accuracy: Math.round((supplementalResponses.filter(r => r.correct).length / supplementalResponses.length) * 100)
                 }
               }
             });
          }

          await base44.entities.PracticeSession.create({
            user_id: user.id,
            session_type: 'supplemental_diagnostic',
            status: 'completed',
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            duration_minutes: Math.ceil(supplementalResponses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / 60),
            questions_attempted: supplementalResponses.length,
            questions_correct: supplementalResponses.filter(r => r.correct).length,
            domains_covered: [...new Set(supplementalResponses.map(r => r.domain))],
            question_history: supplementalResponses,
            performance_summary: {
              accuracy_percentage: Math.round((supplementalResponses.filter(r => r.correct).length / supplementalResponses.length) * 100),
              avg_time_per_question: supplementalResponses.length ? Math.round(supplementalResponses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / supplementalResponses.length) : 0,
              supplemental_level: supplementalLevel
            }
          });

          await recalculateKnowledgeGraph(user.id, base44);

          // Mark assignment complete if one is provided
          const urlParams = new URLSearchParams(window.location.search);
          const assignmentId = urlParams.get('assignmentId');
          if (assignmentId) {
            const progress = await base44.entities.StudentAssignmentProgress.filter({
              assignment_id: assignmentId,
              student_id: user.id
            });
            if (progress.length > 0) {
              await base44.entities.StudentAssignmentProgress.update(progress[0].id, {
                status: 'completed',
                progress_percentage: 100
              });
            }
          }
        } catch (error) {
          console.error('Error saving supplemental results:', error);
        }
      }
      setStage('supplemental_done');
    }
  };

  if (!user) return null;

  const TOTAL_QUESTIONS_DISPLAY = 24;
  const progress = Math.min(((currentQuestion + 1) / TOTAL_QUESTIONS_DISPLAY) * 100, 100);
  const correctCount = responses.filter(r => r.correct).length;
  const accuracy = responses.length > 0 ? Math.round((correctCount / responses.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="bg-stone-700 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">SAT Math Diagnostic</h1>
            <p className="text-white/80 text-sm">Let's calibrate your mastery across all domains</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* INTRO */}
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle className="font-display text-xl text-stone-900">Calibrate Your Knowledge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                 <p className="text-stone-600">This <strong>adaptive diagnostic</strong> uses a smart algorithm that adjusts difficulty in real time based on your performance, ensures <strong>broad coverage across all 12 SAT Math domains</strong>, and probes <strong>prerequisite foundations</strong> when gaps are detected — giving you the most accurate baseline possible. <strong>Note: You will not be able to go back to previous questions once you submit your answer.</strong></p>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map(d => (
                    <div key={d} className="p-2 rounded-lg bg-stone-50 text-sm text-stone-700">
                      {d.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-stone-500">Based on your answers, your Knowledge Graph will populate with accurate baseline mastery levels — including any foundational prerequisite gaps. This helps us recommend personalized practice paths.</p>
                <div className="flex gap-3 text-xs text-stone-600 bg-stone-50 rounded-xl p-3 border border-stone-200">
                 <span>⏱ ~8–12 min</span>
                 <span>•</span>
                 <span>📊 24 adaptive questions</span>
                 <span>•</span>
                 <span>🧠 Starts hard, escalates to expert</span>
                </div>
                <Button 
                  onClick={generateQuestions}
                  className="w-full bg-stone-700 hover:bg-stone-800 text-white rounded-full font-bold h-12"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Start Adaptive Diagnostic
                </Button>
                 {previousResults && previousResults.length > 0 && (
                   <Button
                     variant="outline"
                     onClick={() => setStage('previous')}
                     className="w-full border-2 border-stone-300 text-stone-700 hover:bg-stone-50 rounded-full font-bold h-12"
                   >
                     <Trophy className="w-5 h-5 mr-2" />
                     View Previous Results
                   </Button>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* TESTING */}
        {stage === 'testing' && !loading && questions.length > 0 && (
          <motion.div key="testing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader className="border-b border-stone-100 px-4 py-3 space-y-2">
               {/* Row 1: Question number, domain, and Exit */}
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 min-w-0">
                   <CardTitle className="font-display text-lg leading-tight flex-shrink-0">Q{currentQuestion + 1}<span className="text-stone-300 font-normal text-sm">/{TOTAL_QUESTIONS_DISPLAY}</span></CardTitle>
                   <span className="text-stone-300">·</span>
                   {questions[currentQuestion]?.isPrerequisite ? (
                     <span className="text-sm text-stone-600 font-medium truncate">🔍 {PREREQUISITE_TOPICS[questions[currentQuestion]?.prereqKey]?.title}</span>
                   ) : (
                     <span className="text-sm text-stone-600 truncate">{questions[currentQuestion]?.domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                   )}
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('Dashboard'))} className="rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 font-medium h-7 px-2 text-xs flex-shrink-0">
                   <X className="w-3.5 h-3.5 mr-1" />Exit
                 </Button>
               </div>
               {/* Row 2: Tools and badges */}
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <CalculatorPanel />
                   {!answered && (
                     <span className="flex items-center gap-1 text-xs text-stone-400 tabular-nums">
                       <Clock className="w-3.5 h-3.5" />{elapsedSeconds}s
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-1.5">
                   {questions[currentQuestion] && (
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md leading-none ${
                       questions[currentQuestion].difficulty === 'expert' ? 'bg-stone-700 text-white' :
                       questions[currentQuestion].difficulty === 'hard' ? 'bg-stone-500 text-white' :
                       questions[currentQuestion].difficulty === 'medium' ? 'bg-stone-300 text-stone-800' :
                       'bg-emerald-100 text-emerald-700'
                     }`}>
                       {questions[currentQuestion].difficulty}
                     </span>
                   )}
                   <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 leading-none">{accuracy}%</span>
                 </div>
               </div>
               <Progress value={progress} className="h-1.5" />
              </CardHeader>
              <CardContent className="p-6">
                {questions[currentQuestion] ? (() => {
                  const q = questions[currentQuestion];
                  return (
                    <div className="space-y-5">
                      <p className="text-base font-medium text-stone-800 leading-relaxed">{q.question}</p>
                      {q.options && q.options.length > 0 ? (
                        <div className="space-y-2">
                          {q.options.map((option, i) => {
                            const letter = option[0];
                            const isSelected = selectedAnswer === option;
                            const isCorrect = letter === q.correct;
                            let cls = 'border-2 border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50';
                            if (answered) {
                              if (isCorrect) cls = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900';
                              else if (isSelected) cls = 'border-2 border-red-400 bg-red-50 text-red-800';
                              else cls = 'border-2 border-stone-100 bg-stone-50 text-stone-400';
                            }
                            return (
                              <button
                                key={i}
                                onClick={() => handleAnswer(option)}
                                disabled={answered}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${cls}`}
                              >
                                <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">{letter}</span>
                                <span className="text-sm">{option.slice(3)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={selectedAnswer}
                            onChange={(e) => setSelectedAnswer(sanitizeMathInput(e.target.value))}
                            disabled={answered}
                            placeholder="Enter your answer"
                            className="w-full p-4 rounded-2xl border-2 border-stone-200 focus:border-stone-500 focus:outline-none text-base"
                          />
                          {!answered && (
                            <Button
                              onClick={() => handleAnswer(selectedAnswer)}
                              disabled={!selectedAnswer.trim()}
                              className="w-full bg-stone-700 hover:bg-stone-800 text-white rounded-full font-bold h-11"
                            >
                              Submit Answer
                            </Button>
                          )}
                        </div>
                      )}
                      {!answered && (
                        <IDontKnowButton onClick={handleIDontKnow} className="w-full h-11" />
                      )}
                      {answered && (() => {
                        const q = questions[currentQuestion];
                        const isMC = Array.isArray(q.options) && q.options.length > 0 && q.options.some(opt => opt && (opt.label || typeof opt === 'string'));
                        let isCorrect = false;
                        if (isMC) {
                          isCorrect = selectedAnswer[0] === q.correct;
                        } else {
                          isCorrect = answersEquivalent(selectedAnswer, q.correct);
                        }
                        const isIdk = selectedAnswer === IDK_ANSWER;
                        return (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                            {/* Explanation card */}
                            <div className={`rounded-2xl border-2 p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : isIdk ? 'bg-amber-50 border-amber-200' : 'bg-stone-100 border-stone-300'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : isIdk ? 'text-amber-700' : 'text-stone-700'}`}>
                                  {isCorrect ? '✓ Correct!' : isIdk ? '🤔 You marked "I Don\'t Know"' : '✗ Incorrect'}
                                </span>
                                {!isCorrect && (
                                  <span className="text-xs text-stone-500 font-medium">
                                    — Answer: <strong>{q.correct}</strong>
                                  </span>
                                )}
                              </div>
                              <ExplanationText isCorrect={isCorrect}>
                                {q.explanation}
                              </ExplanationText>
                            </div>
                            {/* AI Tutor toggle */}
                            {!showTutor ? (
                              <button
                                onClick={() => setShowTutor(true)}
                                className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  !isCorrect
                                    ? 'border-stone-400 bg-stone-100 text-stone-700 hover:bg-stone-200'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                🤖 {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                              </button>
                            ) : (
                              <QuestionTutor
                                question={{ ...q, question_text: q.question, correct_answer: q.correct }}
                                userAnswer={selectedAnswer}
                                isCorrect={isCorrect}
                                onClose={() => setShowTutor(false)}
                              />
                            )}
                            <div className="flex justify-end">
                              <Button onClick={() => { setShowTutor(false); nextQuestion(); }} className="bg-stone-700 hover:bg-stone-800 rounded-full font-bold">
                                {responses.length + 1 < TOTAL_QUESTIONS ? 'Next Question' : 'Finish Diagnostic'}
                                <ChevronRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </div>
                  );
                })() : null}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* RESULTS */}
        {stage === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="bg-gradient-to-r from-emerald-50 to-stone-50 border-4 border-emerald-300 rounded-3xl shadow-xl">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-emerald-900 mb-2">Diagnostic Complete!</h2>
                <p className="text-stone-600 mb-4">Your Knowledge Graph has been calibrated with your baseline mastery levels.</p>
                <div className="flex justify-center gap-4 mb-6">
                  <div className="bg-white/60 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-stone-800">{accuracy}%</p>
                    <p className="text-sm text-stone-600">Overall Accuracy</p>
                    {responses.filter(isIdkEntry).length > 0 && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">{responses.filter(isIdkEntry).length} marked "I Don't Know"</p>
                    )}
                  </div>
                  <div className="bg-white/60 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-stone-800">{responses.length > 0 ? Math.round(responses.reduce((s, r) => s + (r.time_spent_seconds || 0), 0) / responses.length) : 0}s</p>
                    <p className="text-sm text-stone-600">Avg Time / Q</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supplemental Section Invitation — moved to top */}
            {supplementalLevel && (
              <Card className="border-4 border-stone-300 shadow-xl rounded-3xl bg-gradient-to-br from-white to-stone-50">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
                    <span className="text-2xl">{SUPPLEMENTAL_LEVELS[supplementalLevel].emoji}</span>
                    Supplemental Section: {SUPPLEMENTAL_LEVELS[supplementalLevel].title}
                  </CardTitle>
                  <p className="text-sm text-stone-600">{SUPPLEMENTAL_LEVELS[supplementalLevel].description}</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-stone-100 rounded-xl p-3 mb-3 text-xs text-stone-600">
                    Based on your <strong>{accuracy}%</strong> performance, we've assigned you <strong>Level {supplementalLevel}</strong> ({SUPPLEMENTAL_LEVELS[supplementalLevel].questions.length} questions) to refine your calibration.
                  </div>
                  <Button
                    onClick={startSupplemental}
                    className="w-full bg-stone-700 hover:bg-stone-800 text-white rounded-full font-bold h-12"
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    Start Level {supplementalLevel} ({SUPPLEMENTAL_LEVELS[supplementalLevel].questions.length} Q)
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-4 border-white shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="font-display text-lg text-stone-900">Domain Mastery Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(domainResults).map(([domain, level]) => {
                  const colors = {
                    mastered: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                    practiced: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    learning: 'bg-stone-100 text-stone-600 border-stone-300',
                    not_started: 'bg-stone-50 text-stone-500 border-stone-200'
                  };
                  const icons = { mastered: '✓', practiced: '→', learning: '◐', not_started: '○' };
                  return (
                    <div key={domain} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-sm font-medium text-stone-700">
                        {domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <Badge className={`${colors[level] || colors.not_started}`}>
                        {icons[level]} {level.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Prerequisite Gaps Section */}
            {Object.keys(prerequisiteGaps).length > 0 && (
              <Card className="border-4 border-stone-300 shadow-xl rounded-3xl bg-stone-50">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-stone-800 flex items-center gap-2">
                    🔍 Prerequisite Gaps Found
                  </CardTitle>
                  <p className="text-sm text-stone-600">Based on your struggles in certain domains, we probed these foundational skills:</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(prerequisiteGaps).map(([key, perf]) => {
                    const topic = PREREQUISITE_TOPICS[key];
                    if (!topic) return null;
                    const ratio = perf.correct / perf.total;
                    const hasGap = ratio < 1;
                    return (
                      <div key={key} className={`flex items-start justify-between p-3 rounded-xl border ${hasGap ? 'bg-stone-100 border-stone-300' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{topic.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-stone-800">{topic.title}</p>
                            <p className="text-xs text-stone-500">{topic.description}</p>
                          </div>
                        </div>
                        <Badge className={hasGap ? 'bg-stone-200 text-stone-700 border-stone-400 ml-2 flex-shrink-0' : 'bg-emerald-100 text-emerald-700 border-emerald-300 ml-2 flex-shrink-0'}>
                          {hasGap ? '⚠ Gap' : '✓ OK'}
                        </Badge>
                      </div>
                    );
                  })}
                  <p className="text-xs text-stone-500 pt-1">These foundational gaps have been added to your Knowledge Graph as priority learning nodes.</p>
                </CardContent>
              </Card>
            )}

            {!supplementalLevel && (
              <Button
                onClick={() => navigate(createPageUrl('KnowledgeGraph'))}
                variant="outline"
                className="w-full border-2 border-stone-300 text-stone-700 hover:bg-stone-50 rounded-full font-bold h-12 mt-4"
              >
                <Target className="w-5 h-5 mr-2" />
                View Your Knowledge Graph
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </motion.div>
        )}

        {/* SUPPLEMENTAL TESTING */}
        {stage === 'supplemental' && supplementalLevel && (() => {
          const level = SUPPLEMENTAL_LEVELS[supplementalLevel];
          const q = level.questions[supplementalIndex];
          const total = level.questions.length;
          const isMC = q.options && q.options.length > 0;
          const supAccuracy = supplementalResponses.length > 0
            ? Math.round((supplementalResponses.filter(r => r.correct).length / supplementalResponses.length) * 100)
            : 0;
          const isCorrect = supplementalAnswered && supplementalResponses[supplementalResponses.length - 1]?.correct;
          return (
            <motion.div key="supplemental" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="border-4 border-white shadow-2xl rounded-3xl">
                <CardHeader className="border-b border-stone-100 px-4 py-3 space-y-2">
                  {/* Row 1: Question number, domain */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">{level.emoji}</span>
                      <CardTitle className="font-display text-lg leading-tight flex-shrink-0">L{supplementalLevel} · Q{supplementalIndex + 1}<span className="text-stone-300 font-normal text-sm">/{total}</span></CardTitle>
                      <span className="text-stone-300">·</span>
                      <span className="text-sm text-stone-600 truncate">{q.domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                  </div>
                  {/* Row 2: Tools and badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalculatorPanel />
                      {!supplementalAnswered && (
                        <span className="flex items-center gap-1 text-xs text-stone-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />{elapsedSeconds}s
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md leading-none ${
                        q.difficulty === 'expert' ? 'bg-stone-700 text-white' :
                        q.difficulty === 'hard' ? 'bg-stone-500 text-white' :
                        q.difficulty === 'medium' ? 'bg-stone-300 text-stone-800' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>{q.difficulty}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 leading-none">{supAccuracy}%</span>
                    </div>
                  </div>
                  <Progress value={((supplementalIndex + 1) / total) * 100} className="h-1.5" />
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-5">
                    <p className="text-base font-medium text-stone-800 leading-relaxed whitespace-pre-line">{q.question}</p>

                    {isMC ? (
                      <div className="space-y-2">
                        {q.options.map((option, i) => {
                          const letter = option[0];
                          const isSelected = supplementalSelected === option;
                          const isCorrectOpt = letter === q.correct;
                          let cls = 'border-2 border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50';
                          if (supplementalAnswered) {
                            if (isCorrectOpt) cls = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900';
                            else if (isSelected) cls = 'border-2 border-red-400 bg-red-50 text-red-800';
                            else cls = 'border-2 border-stone-100 bg-stone-50 text-stone-400';
                          }
                          return (
                            <button
                              key={i}
                              onClick={() => handleSupplementalAnswer(option)}
                              disabled={supplementalAnswered}
                              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${cls}`}
                            >
                              <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">{letter}</span>
                              <span className="text-sm">{option.slice(3)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={supplementalInput}
                          onChange={(e) => setSupplementalInput(e.target.value)}
                          disabled={supplementalAnswered}
                          placeholder="Enter your answer"
                          className="w-full p-4 rounded-2xl border-2 border-stone-200 focus:border-stone-500 focus:outline-none text-base"
                        />
                        {!supplementalAnswered && (
                          <Button
                            onClick={() => handleSupplementalAnswer(supplementalInput)}
                            disabled={!supplementalInput.trim()}
                            className="w-full bg-stone-700 hover:bg-stone-800 text-white rounded-full font-bold h-11"
                          >
                            Submit Answer
                          </Button>
                        )}
                      </div>
                    )}
                    {!supplementalAnswered && (
                      <IDontKnowButton onClick={handleSupplementalIDontKnow} className="w-full h-11" />
                    )}

                    {supplementalAnswered && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                        <div className={`rounded-2xl border-2 p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : supplementalSelected === IDK_ANSWER ? 'bg-amber-50 border-amber-200' : 'bg-stone-100 border-stone-300'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : supplementalSelected === IDK_ANSWER ? 'text-amber-700' : 'text-stone-700'}`}>
                              {isCorrect ? '✓ Correct!' : supplementalSelected === IDK_ANSWER ? '🤔 You marked "I Don\'t Know"' : '✗ Incorrect'}
                            </span>
                            {!isCorrect && (
                              <span className="text-xs text-stone-500 font-medium">— Answer: <strong>{q.correct}</strong></span>
                            )}
                          </div>
                          <ExplanationText isCorrect={isCorrect}>{q.explanation}</ExplanationText>
                        </div>

                        {!showTutor ? (
                          <button
                            onClick={() => setShowTutor(true)}
                            className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              !isCorrect
                                ? 'border-stone-400 bg-stone-100 text-stone-700 hover:bg-stone-200'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            🤖 {!isCorrect ? 'Get help from AI Tutor' : 'Ask AI Tutor about this question'}
                          </button>
                        ) : (
                          <QuestionTutor
                            question={{ ...q, question_text: q.question, correct_answer: q.correct }}
                            userAnswer={supplementalSelected}
                            isCorrect={isCorrect}
                            onClose={() => setShowTutor(false)}
                          />
                        )}

                        <div className="flex justify-end">
                          <Button onClick={nextSupplemental} className="bg-stone-700 hover:bg-stone-800 rounded-full font-bold">
                            {supplementalIndex + 1 < total ? 'Next Question' : 'Finish Section'}
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* SUPPLEMENTAL DONE */}
        {stage === 'supplemental_done' && supplementalLevel && (() => {
          const level = SUPPLEMENTAL_LEVELS[supplementalLevel];
          const correctCount = supplementalResponses.filter(r => r.correct).length;
          const total = supplementalResponses.length;
          const supAccuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
          return (
            <motion.div key="supp-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="bg-gradient-to-r from-emerald-50 to-stone-50 border-4 border-emerald-300 rounded-3xl shadow-xl">
                <CardContent className="p-8 text-center">
                  <span className="text-5xl">{level.emoji}</span>
                  <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-emerald-900 mb-2 mt-3">Level {supplementalLevel} Complete!</h2>
                  <p className="text-stone-600 mb-4">{level.title}</p>
                  <div className="flex justify-center gap-4 mb-2">
                    <div className="bg-white/60 rounded-2xl p-4">
                      <p className="text-3xl font-bold text-stone-800">{correctCount} / {total}</p>
                      <p className="text-sm text-stone-600">{supAccuracy}% on supplemental section</p>
                      {supplementalResponses.filter(isIdkEntry).length > 0 && (
                        <p className="text-xs text-amber-600 font-semibold mt-1">{supplementalResponses.filter(isIdkEntry).length} marked "I Don't Know"</p>
                      )}
                    </div>
                    <div className="bg-white/60 rounded-2xl p-4">
                      <p className="text-3xl font-bold text-stone-800">{total > 0 ? Math.round(supplementalResponses.reduce((s, r) => s + (r.time_spent_seconds || 0), 0) / total) : 0}s</p>
                      <p className="text-sm text-stone-600">Avg Time / Q</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button
                onClick={() => navigate(createPageUrl('KnowledgeGraph'))}
                className="w-full bg-stone-700 hover:bg-stone-800 text-white rounded-full font-bold h-12"
              >
                <Target className="w-5 h-5 mr-2" />
                View Your Knowledge Graph
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          );
        })()}

        {/* PREVIOUS RESULTS */}
        {stage === 'previous' && previousResults && (
          <motion.div key="previous" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border-4 border-white shadow-xl rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-lg text-stone-900">Your SAT Diagnostic History</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setStage('intro')} className="rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                </div>
                <p className="text-sm text-stone-500">Mastery levels from your most recent diagnostic</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {previousResults
                  .filter(n => !n.tags?.includes('prerequisite'))
                  .sort((a, b) => {
                    const order = ['mastered', 'practiced', 'learning', 'not_started'];
                    return order.indexOf(a.mastery_level) - order.indexOf(b.mastery_level);
                  })
                  .map(node => {
                    const colors = {
                      mastered: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                      practiced: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                      learning: 'bg-stone-100 text-stone-600 border-stone-300',
                      not_started: 'bg-stone-50 text-stone-500 border-stone-200'
                    };
                    const icons = { mastered: '✓', practiced: '→', learning: '◐', not_started: '○' };
                    const level = node.mastery_level || 'not_started';
                    return (
                      <div key={node.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="flex items-center gap-2">
                          <span>{node.emoji || '📚'}</span>
                          <span className="text-sm font-medium text-stone-700">{node.title}</span>
                        </div>
                        <Badge className={colors[level] || colors.not_started}>
                          {icons[level]} {level.replace('_', ' ')}
                        </Badge>
                      </div>
                    );
                  })}
                {previousResults.some(n => n.tags?.includes('prerequisite')) && (
                  <div className="pt-2 border-t border-stone-100">
                    <p className="text-xs font-semibold text-stone-600 mb-2">🔍 Prerequisite Foundations</p>
                    {previousResults
                      .filter(n => n.tags?.includes('prerequisite'))
                      .map(node => {
                        const level = node.mastery_level || 'not_started';
                        const colors = {
                          mastered: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                          practiced: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                          learning: 'bg-stone-100 text-stone-600 border-stone-300',
                          not_started: 'bg-stone-50 text-stone-500 border-stone-200'
                        };
                        return (
                          <div key={node.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 mb-2">
                            <div className="flex items-center gap-2">
                              <span>{node.emoji || '🔢'}</span>
                              <span className="text-sm font-medium text-stone-700">{node.title}</span>
                            </div>
                            <Badge className={colors[level]}>
                              {level.replace('_', ' ')}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Button
              onClick={generateQuestions}
              className="w-full bg-stone-700 hover:bg-stone-800 text-white rounded-full font-bold h-12"
            >
              <Brain className="w-5 h-5 mr-2" />
              Retake Diagnostic
            </Button>
          </motion.div>
        )}

        {/* LOADING */}
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-stone-700 flex items-center justify-center shadow-xl">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-stone-900 mb-2">Preparing your diagnostic...</h2>
            <p className="text-stone-500">Generating questions across all domains</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
