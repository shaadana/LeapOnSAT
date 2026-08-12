import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SAT_QUESTIONS as RAW_SAT_QUESTIONS } from '@/data/satQuestions';
import { SAT_QUESTIONS_EXTREME } from '@/data/satQuestionsExtreme';
import { filterValidQuestions } from '@/data/diagnosticQuestionValidator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Clock, Award, RotateCcw, ChevronRight,
  Loader2, Target, Brain, CheckCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { awardForSession } from '@/utils/gamification';
import SessionRewardModal from '@/components/gamification/SessionRewardModal';
import ChallengeQuestion from '@/components/challenge/ChallengeQuestion';

const ALL_RAW = filterValidQuestions([...RAW_SAT_QUESTIONS, ...SAT_QUESTIONS_EXTREME]);
const SAMPLE_QUESTIONS = ALL_RAW.map(q => ({
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

const QUESTION_COUNT_OPTIONS = [3, 5, 7, 10];

export default function ChallengeSession() {
  const [searchParams] = useSearchParams();
  const difficultyParam = searchParams.get('difficulty') || 'hard';
  // autoStart is intentionally ignored — always show intro so user can pick question count
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState('intro'); // intro | active | complete
  const [questionCount, setQuestionCount] = useState(4);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionReward, setSessionReward] = useState(null);
  const autoStarted = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);



  const startSession = async () => {
    setLoading(true);

    // Get hard/expert questions
    let pool = SAMPLE_QUESTIONS.filter(q =>
      q.difficulty === 'hard' || q.difficulty === 'expert'
    );

    // Also fetch from DB
    const dbQuestions = await base44.entities.SATQuestion.filter({ difficulty: difficultyParam }, undefined, 20);
    const dbFormatted = dbQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.domain,
      difficulty: q.difficulty,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));
    pool = [...pool, ...dbFormatted];

    // If not enough hard questions, include medium
    if (pool.length < questionCount) {
      const medPool = SAMPLE_QUESTIONS.filter(q => q.difficulty === 'medium');
      pool = [...pool, ...medPool];
    }

    // Shuffle and pick
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, questionCount);
    setQuestions(shuffled);

    const created = await base44.entities.ChallengeSession.create({
      user_id: user.id,
      status: 'in_progress',
      from_study_plan: searchParams.get('studyPlan') === 'true',
      start_time: new Date().toISOString(),
      question_count: shuffled.length,
      domains_covered: [...new Set(shuffled.map(q => q.domain))],
      questions: [],
    });
    setSession(created);
    setSessionStartTime(Date.now());
    setCurrentIdx(0);
    setCompletedQuestions([]);
    setPhase('active');
    setLoading(false);
  };

  const handleQuestionComplete = async (result) => {
    const updated = [...completedQuestions, result];
    setCompletedQuestions(updated);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      await finishSession(updated);
    }
  };

  const finishSession = async (allResults) => {
    const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);
    const correct = allResults.filter(r => r.answer_correct).length;
    const avgExplanation = allResults.reduce((s, r) => s + (r.explanation_score || 0), 0) / allResults.length;

    // Combined grade: 50% answer accuracy, 50% explanation quality
    const answerPct = (correct / allResults.length) * 100;
    const combined = (answerPct + avgExplanation) / 2;
    const grade = combined >= 90 ? 'A' : combined >= 80 ? 'B' : combined >= 70 ? 'C' : combined >= 60 ? 'D' : 'F';

    await base44.entities.ChallengeSession.update(session.id, {
      status: 'completed',
      end_time: new Date().toISOString(),
      total_duration_seconds: totalTime,
      questions_correct: correct,
      average_explanation_score: Math.round(avgExplanation),
      overall_grade: grade,
      questions: allResults,
    });

    // Also create a PracticeSession record for streak tracking + insights
    await base44.entities.PracticeSession.create({
      user_id: user.id,
      session_type: 'challenge',
      status: 'completed',
      from_study_plan: searchParams.get('studyPlan') === 'true',
      start_time: new Date(sessionStartTime).toISOString(),
      end_time: new Date().toISOString(),
      duration_minutes: Math.round(totalTime / 60),
      questions_attempted: allResults.length,
      questions_correct: correct,
      domains_covered: [...new Set(allResults.map(r => r.domain))],
      question_history: allResults.map(r => ({
        question_id: r.question_id,
        user_answer: r.user_answer,
        correct: r.answer_correct,
        time_spent_seconds: r.time_spent_seconds,
        domain: r.domain,
        difficulty: r.difficulty,
        question_text: r.question_text,
        options: r.options,
        correct_answer: r.correct_answer,
        explanation: r.explanation,
      })),
      performance_summary: {
        accuracy_percentage: Math.round(answerPct),
        avg_time_per_question: Math.round(totalTime / allResults.length),
      },
    });

    // Gamification
    if (user?.id) {
      const ef = profile?.[0]?.executive_functioning || null;
      const reward = await awardForSession(user.id, {
        questions_correct: correct,
        questions_attempted: allResults.length,
        current_difficulty: 'hard',
      }, ef);
      if (reward) setSessionReward(reward);
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user.id] });
    }

    setPhase('complete');
  };

  // INTRO screen
  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 border-4 border-white rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl mb-8">
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl font-bold text-white mb-2">Challenge Session</h1>
            <p className="text-white/80 text-sm max-w-md mx-auto">
              Solve hard problems, explain your reasoning to the AI tutor, and get graded on both your answer AND your explanation quality.
            </p>
          </div>
        </div>

        <Card className="border-2 border-teal-200 mb-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-stone-900">How it works</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Solve a hard SAT Math question using all available tools' },
                { step: '2', text: 'Write a detailed explanation of your reasoning process' },
                { step: '3', text: 'AI grades your explanation quality (0-100) and gives feedback' },
                { step: '4', text: 'Discuss with the AI tutor to deepen your understanding' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</div>
                  <p className="text-sm text-stone-700 pt-1">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-stone-500 mb-2">Number of questions</p>
              <div className="flex gap-3">
                {QUESTION_COUNT_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-3 rounded-xl text-center font-bold border-2 transition-all ${
                      questionCount === n
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-stone-200 text-stone-500 hover:border-teal-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Estimated time: {questionCount * 5}–{questionCount * 8} minutes</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Link to={createPageUrl('SATPractice')}>
            <Button variant="outline" className="border-stone-200 text-stone-600">← Back to Practice</Button>
          </Link>
          <Button onClick={startSession} disabled={loading} className="bg-teal-500 hover:bg-teal-600 text-white px-8">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Start Challenge
          </Button>
        </div>
      </div>
    );
  }

  // ACTIVE — question flow
  if (phase === 'active' && questions.length > 0) {
    return (
      <ChallengeQuestion
        key={currentIdx}
        question={questions[currentIdx]}
        questionIndex={currentIdx}
        totalQuestions={questions.length}
        onComplete={handleQuestionComplete}
      />
    );
  }

  // COMPLETE — results
  if (phase === 'complete') {
    const correct = completedQuestions.filter(r => r.answer_correct).length;
    const avgExplanation = Math.round(
      completedQuestions.reduce((s, r) => s + (r.explanation_score || 0), 0) / completedQuestions.length
    );
    const answerPct = Math.round((correct / completedQuestions.length) * 100);
    const combined = Math.round((answerPct + avgExplanation) / 2);
    const grade = combined >= 90 ? 'A' : combined >= 80 ? 'B' : combined >= 70 ? 'C' : combined >= 60 ? 'D' : 'F';
    const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-xl">
          <Award className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Challenge Complete!</h1>
        <p className="text-gray-600 mb-8">You solved {completedQuestions.length} hard problems and explained your reasoning.</p>

        {/* Overall Grade */}
        <Card className="mb-6 border-2 border-teal-200">
          <CardContent className="p-6">
            <div className="text-6xl font-display font-bold text-teal-600 mb-2">{grade}</div>
            <p className="text-sm text-stone-500">Overall Grade (answers + explanations)</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card className="bg-emerald-50 border border-emerald-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-800">{correct}/{completedQuestions.length}</p>
              <p className="text-xs text-gray-600">Correct</p>
            </CardContent>
          </Card>
          <Card className="bg-stone-50 border border-stone-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-stone-800">{answerPct}%</p>
              <p className="text-xs text-gray-600">Accuracy</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border border-amber-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-800">{avgExplanation}</p>
              <p className="text-xs text-gray-600">Avg Explanation</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-800">{Math.floor(totalTime / 60)}m</p>
              <p className="text-xs text-gray-600">Total Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-2 mb-8 text-left">
          <h3 className="text-sm font-bold text-stone-700 mb-3">Question Breakdown</h3>
          {completedQuestions.map((q, i) => (
            <Card key={i} className={`border ${q.answer_correct ? 'border-emerald-200' : 'border-red-200'}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${q.answer_correct ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {q.answer_correct ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-800 font-medium truncate">Q{i + 1}: {(q.domain || '').replace('_', ' ')}</p>
                  <p className="text-xs text-stone-500">{Math.floor(q.time_spent_seconds / 60)}m {q.time_spent_seconds % 60}s</p>
                </div>
                <Badge className={`text-xs ${
                  q.explanation_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  q.explanation_score >= 60 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Explanation: {q.explanation_score}/100
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setPhase('intro'); setCompletedQuestions([]); }} className="border-teal-200 text-teal-700">
            <RotateCcw className="w-4 h-4 mr-2" /> New Challenge
          </Button>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Back to Dashboard</Button>
          </Link>
        </div>

        {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
      </motion.div>
    );
  }

  // Loading fallback
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );
}
