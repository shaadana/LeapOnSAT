import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, BookOpen, PenTool, Brain, 
  GraduationCap, Clock, ChevronRight, Sparkles, RotateCcw,
  Settings2, X, Shuffle, Eye
} from 'lucide-react';
import { MASTERY_THRESHOLDS } from '@/utils/performanceMetrics';
import SessionReviewCard from '@/components/student/SessionReviewCard';
import { UNIT_CURRICULUM } from '@/data/unitCurriculum';

const MATH_DOMAIN_LABELS = {
  algebra: 'Algebra', advanced_algebra: 'Advanced Algebra', geometry: 'Geometry',
  trigonometry: 'Trigonometry', statistics: 'Statistics', problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems', quadratics: 'Quadratics',
  exponentials: 'Exponentials', ratios_proportions: 'Ratios & Proportions',
  circles: 'Circles', polynomials: 'Polynomials',
};

const ENGLISH_DOMAIN_LABELS = {
  apostrophes: 'Apostrophes', semicolons_periods: 'Semicolons & Periods',
  commas: 'Commas', colons: 'Colons', dashes: 'Dashes', conciseness: 'Conciseness',
  parallel_structure: 'Parallel Structure', subject_verb_agreement: 'Subject-Verb Agreement',
  pronoun_agreement: 'Pronoun Agreement', verb_tense: 'Verb Tense',
  transitions: 'Transitions', vocabulary: 'Vocabulary',
  reading_comprehension: 'Reading Comprehension', main_idea: 'Main Idea',
  inference: 'Inference', evidence_support: 'Evidence Support', tone_purpose: 'Tone & Purpose',
  modifiers: 'Modifiers', pronoun_case: 'Pronoun Case', idioms_diction: 'Idioms & Diction',
};

// English domain → specific subtopic mapping for lesson recommendations
const ENGLISH_DOMAIN_TO_SUBTOPICS = {
  apostrophes: ["Apostrophes for possessives (singular and plural)", "Apostrophes for contractions vs. possessive pronouns (its vs. it's)"],
  semicolons_periods: ["Run-on sentences: how to fix them", "Semicolons: joining two independent clauses"],
  commas: ["Commas in a series (Oxford comma)", "Commas after introductory elements", "Commas with non-essential (parenthetical) clauses"],
  colons: ["Colons: introducing a list, explanation, or quotation"],
  dashes: ["Em dashes and parentheses for non-essential inserts"],
  conciseness: ["Eliminating redundancy and wordiness", "Combining sentences for clarity and concision"],
  parallel_structure: ["Parallel structure in lists", "Parallel structure with correlative conjunctions (not only...but also)"],
  subject_verb_agreement: ["Subject-verb agreement: basic rules", "Subject-verb agreement: tricky cases (each, everyone, inverted sentences)"],
  pronoun_agreement: ["Pronoun-antecedent agreement in number", "Clear pronoun reference: avoiding ambiguous 'it' and 'they'"],
  verb_tense: ["Verb tense consistency within a passage", "Perfect tenses: present perfect, past perfect, future perfect"],
  transitions: ["Choosing the right transition word (however, therefore, furthermore)", "Cause-and-effect transitions: consequently, as a result"],
  vocabulary: ["Words in context: choosing the best word based on surrounding text", "Connotation and nuance: distinguishing close synonyms"],
  reading_comprehension: ["Active reading strategy for SAT passages", "Central idea vs. supporting details"],
  main_idea: ["Central idea vs. supporting details", "Function of a paragraph within a passage"],
  inference: ["Drawing inferences without over-reading", "Locating textual evidence for a claim"],
  evidence_support: ["Locating textual evidence for a claim", "Using quantitative data (graphs/tables) to support a claim"],
  tone_purpose: ["Identifying the author's tone in a single passage", "Identifying the author's purpose"],
  modifiers: ["Dangling modifiers: modifier must be next to what it describes", "Misplaced modifiers: 'only' and 'almost' placement"],
  pronoun_case: ["Pronoun case: subject (I, he) vs. object (me, him); who vs. whom"],
  idioms_diction: ["Commonly confused words: effect/affect, lie/lay, fewer/less, comprise/compose"],
};

/**
 * Pick a specific subtopic from UNIT_CURRICULUM for a given math domain.
 * Uses a simple progression: returns the first lesson from the first unit.
 * The shuffleSeed rotates which lesson is picked to add variety.
 */
function getSpecificMathSubtopic(domain, seed) {
  const units = UNIT_CURRICULUM[domain];
  if (!units || units.length === 0) return null;
  // Flatten all lessons across all units for this domain
  const allLessons = units.flatMap(u => u.lessons);
  if (allLessons.length === 0) return null;
  return allLessons[seed % allLessons.length];
}

function getSpecificEnglishSubtopic(domain, seed) {
  const subtopics = ENGLISH_DOMAIN_TO_SUBTOPICS[domain];
  if (!subtopics || subtopics.length === 0) return null;
  return subtopics[seed % subtopics.length];
}

// Map grammar-level domain keys to the EnglishLessonViewer's SAT category domains
const ENGLISH_DOMAIN_TO_SAT_CATEGORY = {
  apostrophes: 'Standard English Conventions',
  semicolons_periods: 'Standard English Conventions',
  commas: 'Standard English Conventions',
  colons: 'Standard English Conventions',
  dashes: 'Standard English Conventions',
  conciseness: 'Expression of Ideas',
  parallel_structure: 'Standard English Conventions',
  subject_verb_agreement: 'Standard English Conventions',
  pronoun_agreement: 'Standard English Conventions',
  verb_tense: 'Standard English Conventions',
  transitions: 'Expression of Ideas',
  vocabulary: 'Craft and Structure',
  reading_comprehension: 'Information and Ideas',
  main_idea: 'Information and Ideas',
  inference: 'Information and Ideas',
  evidence_support: 'Information and Ideas',
  tone_purpose: 'Craft and Structure',
  modifiers: 'Standard English Conventions',
  pronoun_case: 'Standard English Conventions',
  idioms_diction: 'Craft and Structure',
  adjectives_adverbs: 'Standard English Conventions',
  word_pairs: 'Craft and Structure',
  who_which_whom: 'Standard English Conventions',
};

function classifySubjectLevel(scores, overallAcc) {
  const vals = Object.values(scores);
  const avg = vals.length > 0
    ? vals.reduce((a, b) => a + b, 0) / vals.length
    : (overallAcc || 0);
  if (avg < 50) return 'beginner';
  if (avg < 75) return 'intermediate';
  return 'advanced';
}

function buildAssignmentUrl(assignment) {
  if (assignment.assignment_type === 'lesson') {
    const cfg = assignment.assignment_config || {};
    if (cfg.lesson_subject === 'english') {
      return `${createPageUrl('SATEnglishPractice')}?mode=lesson&domain=${cfg.lesson_domain || ''}&assignmentId=${assignment.id}`;
    }
    return `${createPageUrl('SATPractice')}?mode=lesson&domain=${cfg.lesson_domain || ''}&subtopic=${encodeURIComponent(cfg.lesson_subtopic || '')}&assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'diagnostic') {
    return `${createPageUrl('SATDiagnostic')}?assignmentId=${assignment.id}&autoStart=1&start=true`;
  }
  if (assignment.assignment_type === 'english_diagnostic') {
    return `${createPageUrl('SATEnglishDiagnostic')}?assignmentId=${assignment.id}&autoStart=1&start=true`;
  }
  if (assignment.assignment_type === 'independent_study') {
    return `${createPageUrl('IndependentStudy')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'supplemental_diagnostic') {
    const cfg = assignment.assignment_config || {};
    return `${createPageUrl('SATDiagnostic')}?assignmentId=${assignment.id}&supplementalLevel=${cfg.supplemental_level || 1}&autoStart=1&start=true`;
  }
  if (assignment.assignment_type === 'document_markup') {
    return `${createPageUrl('DocumentMarkup')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'auto_extract') {
    return `${createPageUrl('AutoExtractPractice')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'canyon_pdf') {
    return `${createPageUrl('CanyonPDFPractice')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'english_practice') {
    const cfg = assignment.assignment_config || {};
    const params = new URLSearchParams();
    params.set('assignmentId', assignment.id);
    params.set('autoStart', '1');
    if (cfg.session_type)     params.set('type',       cfg.session_type);
    if (cfg.duration_minutes) params.set('duration',   String(cfg.duration_minutes));
    if (cfg.difficulty)       params.set('difficulty', cfg.difficulty);
    if (cfg.domains?.length)  params.set('topic',      cfg.domains.join(','));
    if (cfg.tools_enabled) {
      const off = Object.entries(cfg.tools_enabled).filter(([, v]) => v === false).map(([k]) => k);
      if (off.length) params.set('toolsOff', off.join(','));
    }
    return `${createPageUrl('SATEnglishPractice')}?${params.toString()}`;
  }
  const cfg = assignment.assignment_config || {};
  const params = new URLSearchParams();
  params.set('assignmentId', assignment.id);
  params.set('autoStart', '1');
  if (cfg.session_type)     params.set('type',       cfg.session_type);
  if (cfg.duration_minutes) params.set('duration',   String(cfg.duration_minutes));
  if (cfg.difficulty)       params.set('difficulty', cfg.difficulty);
  if (cfg.domains?.length)  params.set('topic',      cfg.domains.join(','));
  if (cfg.question_source)  params.set('source',     cfg.question_source);
  if (cfg.specific_question_ids?.length) params.set('qids', cfg.specific_question_ids.join(','));
  if (cfg.pyq_sources?.length) params.set('pyqSources', cfg.pyq_sources.join(','));
  if (cfg.tools_enabled) {
    const off = Object.entries(cfg.tools_enabled).filter(([, v]) => v === false).map(([k]) => k);
    if (off.length) params.set('toolsOff', off.join(','));
  }
  return `${createPageUrl('SATPractice')}?${params.toString()}`;
}

function classifyStudentLevels(userProfile) {
  const mathScores = userProfile?.sat_performance?.domain_scores || {};
  const englishScores = userProfile?.english_performance?.domain_scores || {};
  const suppResults = userProfile?.sat_performance?.supplemental_results;
  const overallMathAcc = userProfile?.sat_performance?.diagnostic_accuracy;
  const overallEngAcc = userProfile?.english_performance?.diagnostic_accuracy;

  // Math level: supplemental diagnostic overrides if available
  let mathLevel;
  if (suppResults?.level === 1) mathLevel = 'beginner';
  else if (suppResults?.level === 2) mathLevel = 'intermediate';
  else if (suppResults?.level === 3) mathLevel = 'advanced';
  else mathLevel = classifySubjectLevel(mathScores, overallMathAcc);

  const englishLevel = classifySubjectLevel(englishScores, overallEngAcc);

  return { math: mathLevel, english: englishLevel };
}

const LEVEL_DISTRIBUTION = {
  beginner:     { concept: 0.70, retrieval: 0.20, challenge: 0.10 },
  intermediate: { concept: 0.40, retrieval: 0.40, challenge: 0.20 },
  advanced:     { concept: 0.20, retrieval: 0.50, challenge: 0.30 },
};

const LEVEL_LABELS = {
  beginner: 'Foundational',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const TASK_COUNT = 5;

function getDaysUntilSAT(userProfile) {
  const targetDate = userProfile?.sat_target_date;
  if (!targetDate) return null;
  const diff = new Date(targetDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getScoreGap(userProfile) {
  const mathCurrent = userProfile?.sat_math_score || 0;
  const mathGoal = userProfile?.sat_math_goal || 0;
  const engCurrent = userProfile?.sat_english_score || 0;
  const engGoal = userProfile?.sat_english_goal || 0;
  return {
    math: mathGoal > mathCurrent ? mathGoal - mathCurrent : 0,
    english: engGoal > engCurrent ? engGoal - engCurrent : 0,
  };
}

function getWeakDomains(domainScores, recentDomains) {
  return Object.entries(domainScores)
    .filter(([, score]) => score < MASTERY_THRESHOLDS.mastered)
    .sort((a, b) => a[1] - b[1])
    .map(([domain, score]) => ({
      domain,
      score,
      recent: recentDomains.has(domain),
    }));
}

export default function DailyStudyPlan({ 
  userProfile, 
  mathSessions = [], 
  englishSessions = [],
  diagnosticCompleted,
  userId,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [removedTaskIds, setRemovedTaskIds] = useState(() => {
    try {
      const saved = localStorage.getItem('studyplan_removed');
      const parsed = saved ? JSON.parse(saved) : {};
      const today = new Date().toDateString();
      return parsed.date === today ? parsed.ids || [] : [];
    } catch {
      return [];
    }
  });
  const [shuffleSeed, setShuffleSeed] = useState(() => {
    try {
      const saved = localStorage.getItem('studyplan_seed');
      const parsed = saved ? JSON.parse(saved) : {};
      const today = new Date().toDateString();
      return parsed.date === today ? parsed.seed || 0 : 0;
    } catch {
      return 0;
    }
  });

  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['pendingReviews', userId],
    queryFn: () => base44.entities.SessionReviewForm.filter({ student_id: userId, status: 'pending' }),
    enabled: !!userId,
  });

  const { data: pendingAssignments = [] } = useQuery({
    queryKey: ['studentAssignments', userId],
    queryFn: async () => {
      const progress = await base44.entities.StudentAssignmentProgress.filter(
        { student_id: userId }, '-created_date', 1000
      );
      if (!progress.length) return [];
      
      const pendingProgress = progress.filter(p => p.status !== 'completed');
      if (!pendingProgress.length) return [];
      
      const assignmentIds = pendingProgress.map(p => p.assignment_id);
      
      let allAssignments = [];
      try {
        allAssignments = await base44.entities.Assignment.filter({ 
          id: { $in: assignmentIds } 
        }, '-created_date', 1000);
      } catch (_e) {
        const uniqueIds = [...new Set(assignmentIds)];
        for (const id of uniqueIds) {
          try {
            const res = await base44.entities.Assignment.filter({ id });
            if (res && res.length) allAssignments.push(res[0]);
          } catch(_err) {}
        }
      }
      
      const now = new Date();
      return pendingProgress.map((p) => {
        const assignment = allAssignments.find(a => a.id === p.assignment_id);
        if (!assignment) return null;
        if (assignment.publish_at && new Date(assignment.publish_at) > now) return null;
        return { ...assignment, progress: p };
      }).filter(Boolean);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('studyplan_removed', JSON.stringify({ date: today, ids: removedTaskIds }));
  }, [removedTaskIds]);

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('studyplan_seed', JSON.stringify({ date: today, seed: shuffleSeed }));
  }, [shuffleSeed]);

  // Check for completed challenge sessions today
  const { data: todayChallengeSessions = [] } = useQuery({
    queryKey: ['todayChallenges', userId],
    queryFn: async () => {
      const all = await base44.entities.ChallengeSession.filter({ user_id: userId, status: 'completed' }, '-created_date', 5);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return all.filter(s => new Date(s.end_time || s.created_date) >= todayStart && s.from_study_plan === true);
    },
    enabled: !!userId,
  });

  const levels = useMemo(() => classifyStudentLevels(userProfile), [userProfile]);
  const mathDist = LEVEL_DISTRIBUTION[levels.math];
  const engDist = LEVEL_DISTRIBUTION[levels.english];
  const daysUntil = useMemo(() => getDaysUntilSAT(userProfile), [userProfile]);
  const scoreGap = useMemo(() => getScoreGap(userProfile), [userProfile]);

  const allTasks = useMemo(() => {
    if (!diagnosticCompleted) {
      return [{
        id: 'do-diagnostic',
        title: 'Complete your Math Diagnostic',
        description: 'Take a 15-minute diagnostic so we can build your personalized study plan.',
        icon: Brain,
        time: '15 min',
        url: '/SATDiagnostic?autoStart=1',
        priority: 'onboarding',
        color: 'bg-emerald-500',
        category: 'concept',
      }];
    }

    const mathDomainScores = userProfile?.sat_performance?.domain_scores || {};
    const englishDomainScores = userProfile?.english_performance?.domain_scores || {};
    const hasEnglishData = Object.keys(englishDomainScores).length > 0;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMathDomains = new Set();
    mathSessions
      .filter(s => new Date(s.start_time || s.created_date) > oneDayAgo)
      .forEach(s => (s.question_history || []).forEach(q => { if (q.domain) recentMathDomains.add(q.domain); }));
    const recentEnglishDomains = new Set();
    englishSessions
      .filter(s => new Date(s.start_time || s.created_date) > oneDayAgo)
      .forEach(s => (s.question_history || []).forEach(q => { if (q.domain) recentEnglishDomains.add(q.domain); }));

    const weakMath = getWeakDomains(mathDomainScores, recentMathDomains);
    const weakEnglish = getWeakDomains(englishDomainScores, recentEnglishDomains);

    const mathWeight = scoreGap.math > 0 ? scoreGap.math : 50;
    const engWeight = scoreGap.english > 0 ? scoreGap.english : 50;
    const mathFocus = mathWeight / (mathWeight + engWeight);

    // Blend the per-subject distributions weighted by focus
    const blendedDist = {
      concept: mathDist.concept * mathFocus + engDist.concept * (1 - mathFocus),
      retrieval: mathDist.retrieval * mathFocus + engDist.retrieval * (1 - mathFocus),
      challenge: mathDist.challenge * mathFocus + engDist.challenge * (1 - mathFocus),
    };
    const conceptCount = Math.max(1, Math.round(TASK_COUNT * blendedDist.concept));
    const retrievalCount = Math.max(1, Math.round(TASK_COUNT * blendedDist.retrieval));
    const challengeCount = Math.max(1, TASK_COUNT - conceptCount - retrievalCount);

    const generated = [];
    let mathIdx = 0;
    let engIdx = 0;

    const pickDomain = (preferMath) => {
      if (preferMath && weakMath[mathIdx]) {
        const d = weakMath[mathIdx]; mathIdx++; return { ...d, subject: 'math' };
      }
      if (weakEnglish[engIdx]) {
        const d = weakEnglish[engIdx]; engIdx++; return { ...d, subject: 'english' };
      }
      if (weakMath[mathIdx]) {
        const d = weakMath[mathIdx]; mathIdx++; return { ...d, subject: 'math' };
      }
      return null;
    };

    // CONCEPT / GUIDED PRACTICE tasks
    for (let i = 0; i < conceptCount; i++) {
      const preferMath = (i % 2 === 0) ? mathFocus >= 0.5 : mathFocus < 0.5;
      const target = pickDomain(preferMath);
      if (!target) continue;

      if (target.subject === 'math') {
        const specificSubtopic = getSpecificMathSubtopic(target.domain, shuffleSeed + i);
        const subtopicLabel = specificSubtopic || MATH_DOMAIN_LABELS[target.domain];
        const subtopicParam = specificSubtopic ? encodeURIComponent(specificSubtopic) : '';
        if (target.score < MASTERY_THRESHOLDS.learning) {
          generated.push({
            id: `concept-lesson-${target.domain}-${i}-s${shuffleSeed}`,
            title: `Lesson: ${subtopicLabel}`,
            description: levels.math === 'beginner' 
              ? `${MATH_DOMAIN_LABELS[target.domain]} · ${target.score}%. Build foundations with a guided lesson — predict-then-learn.`
              : `${MATH_DOMAIN_LABELS[target.domain]} · ${target.score}%. Review this skill to strengthen your understanding.`,
            icon: GraduationCap, time: '10–15 min',
            url: `${createPageUrl('SATPractice')}?mode=lesson&domain=${target.domain}${subtopicParam ? `&subtopic=${subtopicParam}` : ''}&studyPlan=true`,
            priority: 'high', color: 'bg-emerald-600', score: target.score, category: 'concept',
          });
        } else {
          generated.push({
            id: `concept-practice-${target.domain}-${i}-s${shuffleSeed}`,
            title: `Practice: ${subtopicLabel}`,
            description: `${MATH_DOMAIN_LABELS[target.domain]} · ${target.score}%. Practice with hints to solidify this skill.`,
            icon: Target, time: '5–10 min',
            url: `${createPageUrl('SATPractice')}?type=choice&topic=${target.domain}&autoStart=1&studyPlan=true`,
            priority: 'medium', color: 'bg-emerald-500', score: target.score, category: 'concept',
          });
        }
      } else {
        const specificSubtopic = getSpecificEnglishSubtopic(target.domain, shuffleSeed + i);
        const subtopicLabel = specificSubtopic || ENGLISH_DOMAIN_LABELS[target.domain];
        const satCategory = ENGLISH_DOMAIN_TO_SAT_CATEGORY[target.domain] || 'Standard English Conventions';
        const subtopicParam = specificSubtopic ? encodeURIComponent(specificSubtopic) : '';
        if (target.score < MASTERY_THRESHOLDS.learning) {
          generated.push({
            id: `concept-eng-lesson-${target.domain}-${i}-s${shuffleSeed}`,
            title: `Lesson: ${subtopicLabel}`,
            description: `${ENGLISH_DOMAIN_LABELS[target.domain]} · ${target.score}%. A focused lesson with prediction exercises.`,
            icon: BookOpen, time: '10–15 min',
            url: `${createPageUrl('SATEnglishPractice')}?mode=lesson&domain=${encodeURIComponent(satCategory)}${subtopicParam ? `&subtopic=${subtopicParam}` : ''}&studyPlan=true`,
            priority: 'high', color: 'bg-teal-600', score: target.score, category: 'concept',
          });
        } else {
          generated.push({
            id: `concept-eng-practice-${target.domain}-${i}-s${shuffleSeed}`,
            title: `Practice: ${subtopicLabel}`,
            description: `${ENGLISH_DOMAIN_LABELS[target.domain]} · ${target.score}%. Strengthen this skill with guided practice.`,
            icon: PenTool, time: '5–10 min',
            url: `${createPageUrl('SATEnglishPractice')}?topic=${target.domain}&autoStart=1&studyPlan=true`,
            priority: 'medium', color: 'bg-teal-500', score: target.score, category: 'concept',
          });
        }
      }
    }

    // RETRIEVAL PRACTICE tasks — distinct from blitz sessions
    // Recall sessions use a predict→attempt→compare→review scaffolding
    const totalSessions = mathSessions.filter(s => s.status === 'completed').length + 
                          englishSessions.filter(s => s.status === 'completed').length;
    
    for (let i = 0; i < retrievalCount; i++) {
      if (i === 0 && totalSessions > 3) {
        generated.push({
          id: `retrieval-mistakes-s${shuffleSeed}`,
          title: 'Review Your Mistakes',
          description: 'Active recall: revisit questions you got wrong. Mistakes are your best teachers.',
          icon: RotateCcw, time: '5–10 min',
          url: `${createPageUrl('DeepReview')}?studyPlan=true`,
          priority: (levels.math === 'advanced' || levels.english === 'advanced') ? 'high' : 'medium',
          color: 'bg-amber-500', category: 'retrieval',
        });
      } else if (i <= 1) {
        // Pick a specific weak domain for the recall session
        const isMath = mathFocus >= 0.5 || i % 2 === 0;
        const recallTarget = isMath ? weakMath[0] : (weakEnglish[0] || weakMath[0]);
        const recallDomain = recallTarget?.domain;
        const recallSubtopic = recallDomain && isMath
          ? getSpecificMathSubtopic(recallDomain, shuffleSeed + conceptCount + i)
          : null;
        const recallLabel = recallSubtopic || (recallDomain 
          ? (isMath ? MATH_DOMAIN_LABELS[recallDomain] : ENGLISH_DOMAIN_LABELS[recallDomain]) 
          : 'Mixed Topics');
        
        const recallSubjectLevel = isMath ? levels.math : levels.english;
        const safeDomain = recallDomain || 'mixed';
        generated.push({
          id: `retrieval-recall-${safeDomain}-${i}-s${shuffleSeed}`,
          title: `Recall: ${recallLabel}`,
          description: recallSubjectLevel === 'advanced' 
            ? 'Predict the process before seeing choices, then solve and self-check.'
            : 'Predict what you remember, attempt the problem, then compare with the solution.',
          icon: Eye,
          time: '5–8 min',
          url: isMath 
            ? `${createPageUrl('SATPractice')}?type=recall${recallDomain ? `&topic=${recallDomain}` : ''}&autoStart=1&studyPlan=true`
            : `${createPageUrl('SATEnglishPractice')}?type=recall${recallDomain ? `&topic=${recallDomain}` : ''}&autoStart=1&studyPlan=true`,
          priority: 'medium', color: 'bg-blue-500', category: 'retrieval',
        });
      } else {
        generated.push({
          id: `retrieval-vocab-${i}-s${shuffleSeed}`,
          title: 'Vocabulary Active Recall',
          description: 'Strengthen word knowledge through flashcard-style retrieval.',
          icon: BookOpen, time: '5 min',
          url: `${createPageUrl('SATEnglishPractice')}?mode=vocab&studyPlan=true`,
          priority: 'low', color: 'bg-indigo-500', category: 'retrieval',
        });
      }
    }

    // CHALLENGE / HARD QUESTION tasks
    for (let i = 0; i < challengeCount; i++) {
      if (i === 0) {
        generated.push({
          id: `challenge-hard-s${shuffleSeed}`,
          title: levels.math === 'advanced' ? 'Hard Question Strategy' : 'Challenge Session',
          description: levels.math === 'advanced'
            ? 'Solve hard problems, explain your reasoning to the AI tutor, and get graded on both.'
            : 'Push your limits — solve, explain your thinking, and get AI feedback on your reasoning.',
          icon: Sparkles, time: '15–25 min',
          url: `/ChallengeSession?difficulty=hard&autoStart=1&studyPlan=true`,
          priority: levels.math === 'advanced' ? 'high' : 'low',
          color: 'bg-teal-500', category: 'challenge',
        });
      } else {
        generated.push({
          id: `challenge-eng-${i}-s${shuffleSeed}`,
          title: 'English Challenge',
          description: 'Tackle hard English questions and explain your reasoning for AI grading.',
          icon: PenTool, time: '15–20 min',
          url: `/ChallengeSession?difficulty=hard&autoStart=1&studyPlan=true`,
          priority: 'low', color: 'bg-teal-400', category: 'challenge',
        });
      }
    }

    if (!hasEnglishData) {
      generated.push({
        id: 'do-english-diagnostic',
        title: 'Take your English Diagnostic',
        description: 'Unlock personalized English recommendations.',
        icon: BookOpen, time: '15 min',
        url: `${createPageUrl('SATEnglishDiagnostic')}?autoStart=1`,
        priority: 'onboarding', color: 'bg-teal-500', category: 'concept',
      });
    }

    const assignmentTasks = pendingAssignments.map((a) => {
      const time = a.assignment_config?.duration_minutes 
        ? `${a.assignment_config.duration_minutes} min` 
        : '15-20 min';
      return {
        id: `assignment-${a.id}`,
        title: a.title,
        description: a.description || 'Teacher assigned task',
        icon: Target,
        time,
        url: buildAssignmentUrl(a),
        priority: 'teacher',
        color: 'bg-fuchsia-600',
        category: 'assignment',
      };
    });

    return [...assignmentTasks, ...generated];
  }, [userProfile, mathSessions, englishSessions, diagnosticCompleted, shuffleSeed, scoreGap, mathDist, engDist, levels, pendingAssignments]);

  // Build a set of domain-based prefixes that are completed today
  const completedPrefixes = useMemo(() => {
    const prefixes = new Set();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayMath = mathSessions.filter(s => s.status === 'completed' && new Date(s.end_time || s.created_date) >= todayStart && s.from_study_plan === true);
    const todayEnglish = englishSessions.filter(s => s.status === 'completed' && new Date(s.end_time || s.created_date) >= todayStart && s.from_study_plan === true);

    let recallCount = 0;
    let similarCount = 0;
    let vocabCount = 0;

    todayMath.forEach(s => {
      const type = s.session_type;
      const domains = s.domains_covered || [];
      
      if (type === 'lesson') {
        domains.forEach(d => prefixes.add(`concept-lesson-${d}-`));
      } else if (type === 'recall') {
        if (domains.length > 0) {
          domains.forEach(d => prefixes.add(`retrieval-recall-${d}-`));
        } else {
          prefixes.add('retrieval-recall-mixed-');
        }
        recallCount++;
      } else if (type === 'similar') {
        prefixes.add('retrieval-mistakes-');
        similarCount++;
      } else if (type === 'choice' || type === 'blitz' || type === 'class') {
        domains.forEach(d => prefixes.add(`concept-practice-${d}-`));
      }
    });

    todayEnglish.forEach(s => {
      const type = s.session_type;
      const domains = s.domains_covered || [];
      
      if (type === 'lesson') {
        domains.forEach(d => prefixes.add(`concept-eng-lesson-${d}-`));
      } else if (type === 'recall') {
        if (domains.length > 0) {
          domains.forEach(d => prefixes.add(`retrieval-recall-${d}-`));
        } else {
          prefixes.add('retrieval-recall-mixed-');
        }
        recallCount++;
      } else if (type === 'similar') {
        prefixes.add('retrieval-mistakes-');
        similarCount++;
      } else if (type === 'vocabulary') {
        prefixes.add('retrieval-vocab-');
        vocabCount++;
      } else {
        domains.forEach(d => prefixes.add(`concept-eng-practice-${d}-`));
      }
    });

    // Fallback for DeepReview if the user navigated there and did at least 2 sessions
    // Or if they did a similar session
    if (similarCount > 0) {
      prefixes.add('retrieval-mistakes-');
    } else {
      const totalTodaySessions = todayMath.length + todayEnglish.length;
      if (totalTodaySessions >= 2) {
        prefixes.add('retrieval-mistakes-');
      }
    }

    if (todayChallengeSessions.length > 0) {
      prefixes.add('challenge-hard-');
      prefixes.add('challenge-eng-');
    }

    return prefixes;
  }, [mathSessions, englishSessions, todayChallengeSessions]);

  const isTaskCompleted = (taskId) => {
    for (const prefix of completedPrefixes) {
      if (taskId.startsWith(prefix)) return true;
    }
    return false;
  };

  const visibleTasks = allTasks.filter(t => !removedTaskIds.includes(t.id) && !isTaskCompleted(t.id));

  // When completed tasks reduce visible count below target, bump seed to generate fresh replacements
  useEffect(() => {
    if (diagnosticCompleted && allTasks.length > 0 && visibleTasks.length < Math.min(TASK_COUNT, allTasks.length) && visibleTasks.length <= 2) {
      setShuffleSeed(s => s + 1);
    }
  }, [completedPrefixes.size, removedTaskIds.length]);

  const removeTask = (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    setRemovedTaskIds(prev => [...prev, taskId]);
  };

  const resetPlan = () => {
    setRemovedTaskIds([]);
    setShuffleSeed(s => s + 1);
    setShowSettings(false);
  };

  const priorityLabel = {
    teacher:    { text: 'Teacher Assigned', bg: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
    onboarding: { text: 'Get Started', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
    high:       { text: 'Priority',    bg: 'bg-rose-100 text-rose-700 border-rose-200' },
    medium:     { text: 'Recommended', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    low:        { text: 'Bonus',       bg: 'bg-stone-100 text-stone-600 border-stone-200' },
  };

  const categoryLabel = {
    assignment: { text: 'Assignment', bg: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200' },
    concept:   { text: 'Concept', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    retrieval: { text: 'Recall', bg: 'bg-blue-50 text-blue-600 border-blue-200' },
    challenge: { text: 'Challenge', bg: 'bg-teal-50 text-teal-600 border-teal-200' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-stone-900 leading-tight">Today's Study Plan</h2>
            <p className="text-xs text-stone-400">
              Math: {LEVEL_LABELS[levels.math]} · English: {LEVEL_LABELS[levels.english]} · {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''}
              {daysUntil != null && ` · ${daysUntil} days to SAT`}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(s => !s)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          title="Adjust plan"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-700">Your Study Mix</span>
            <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Math: <span className="font-semibold text-emerald-600">{LEVEL_LABELS[levels.math]}</span> · English: <span className="font-semibold text-teal-600">{LEVEL_LABELS[levels.english]}</span>
          </p>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Math Mix</p>
            <div className="flex gap-2">
              {[
                { label: 'Concept', pct: Math.round(mathDist.concept * 100), color: 'bg-emerald-500' },
                { label: 'Recall', pct: Math.round(mathDist.retrieval * 100), color: 'bg-blue-500' },
                { label: 'Challenge', pct: Math.round(mathDist.challenge * 100), color: 'bg-rose-500' },
              ].map(b => (
                <div key={b.label} className="flex-1 text-center">
                  <div className={`h-2 rounded-full ${b.color} mb-1`} style={{ width: `${b.pct}%`, minWidth: '12px', margin: '0 auto' }} />
                  <span className="text-[10px] font-bold text-stone-500">{b.pct}% {b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">English Mix</p>
            <div className="flex gap-2">
            {[
              { label: 'Concept', pct: Math.round(engDist.concept * 100), color: 'bg-emerald-500' },
              { label: 'Recall', pct: Math.round(engDist.retrieval * 100), color: 'bg-blue-500' },
              { label: 'Challenge', pct: Math.round(engDist.challenge * 100), color: 'bg-rose-500' },
            ].map(b => (
              <div key={b.label} className="flex-1 text-center">
                <div className={`h-2 rounded-full ${b.color} mb-1`} style={{ width: `${b.pct}%`, minWidth: '12px', margin: '0 auto' }} />
                <span className="text-[10px] font-bold text-stone-500">{b.pct}% {b.label}</span>
              </div>
            ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button 
              onClick={resetPlan} 
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors"
            >
              <Shuffle className="w-3 h-3" /> Refresh tasks
            </button>
            {removedTaskIds.length > 0 && (
              <button 
                onClick={() => setRemovedTaskIds([])} 
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Restore removed
              </button>
            )}
          </div>
          <p className="text-[10px] text-stone-400 italic">
            Tip: Remove tasks you don't want today by clicking the × on each card.
          </p>
        </div>
      )}

      {/* Pending review forms pinned to top */}
      {pendingReviews.map(form => (
        <SessionReviewCard key={form.id} form={form} />
      ))}

      <div className="space-y-2.5">
        {visibleTasks.map((task, idx) => {
          const Icon = task.icon;
          const badge = priorityLabel[task.priority] || priorityLabel.medium;
          const catBadge = categoryLabel[task.category];
          return (
            <Link key={task.id} to={task.url} className="block group">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-white to-emerald-50/30 border-2 border-emerald-100/80 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[10px] font-bold text-emerald-200 font-display">{idx + 1}</div>
                <button 
                  onClick={(e) => removeTask(e, task.id)} 
                  className="absolute top-2 right-2 w-5 h-5 rounded-full text-stone-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Remove from today's plan"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className={`w-12 h-12 rounded-xl ${task.color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                      {task.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.text}
                    </span>
                    {catBadge && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${catBadge.bg}`}>
                        {catBadge.text}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-1">{task.description}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3 text-stone-300" />
                    <span className="text-[11px] text-stone-400 font-medium">{task.time}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
                  <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}

        {visibleTasks.length === 0 && diagnosticCompleted && (
          <div className="text-center py-6">
            <p className="text-sm text-stone-400">You've cleared today's plan!</p>
            <button onClick={resetPlan} className="text-xs text-emerald-600 font-medium mt-2 hover:underline">
              Generate new tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
