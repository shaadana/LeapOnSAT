import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookmarkButton from '@/components/review/BookmarkButton';
import QuestionDissector from '@/components/english/QuestionDissector';
import MathText from '@/components/sat/MathText';
import ExplanationText from '@/components/sat/ExplanationText';

import { SAT_QUESTIONS as RAW_SAT_QUESTIONS } from '@/data/satQuestions';
import { SAT_QUESTIONS_EXTREME } from '@/data/satQuestionsExtreme';
import { ENGLISH_QUESTIONS } from '@/data/englishQuestions';
import { filterValidQuestions } from '@/data/diagnosticQuestionValidator';
import SessionMistakeList from '@/components/review/SessionMistakeList';

// Build a single lookup for ALL static questions ever served (after validation).
// Mirrors what SATPractice.jsx serves so question_id → full question text resolves.
const ALL_STATIC = [
  ...filterValidQuestions([...RAW_SAT_QUESTIONS, ...SAT_QUESTIONS_EXTREME]),
  ...ENGLISH_QUESTIONS
];
const STATIC_LOOKUP = (() => {
  const m = new Map();
  for (const q of ALL_STATIC) {
    const id = `sat_${q.id}`;
    m.set(id, {
      question_text: q.question,
      domain: q.domain,
      difficulty: q.difficulty,
      options: q.options
        ? q.options.map(opt => {
            if (typeof opt === 'object' && opt !== null) return opt;
            if (typeof opt === 'string') {
              const match = opt.match(/^([A-D])[).\s]\s*(.+)$/);
              if (match) return { label: match[1], text: match[2].trim() };
              return { label: opt[0], text: opt.slice(3).trim() };
            }
            return { label: '?', text: String(opt) };
          })
        : null,
      correct_answer: q.correct,
      explanation: q.explanation,
    });
  }
  return m;
})();

export default function DeepReviewPage() {
  const [user, setUser] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['practiceSessions', user?.id, 'review'],
    queryFn: async () => {
      const [mathSessions, englishSessions] = await Promise.all([
        base44.entities.PracticeSession.filter(
          { user_id: user.id, status: 'completed' },
          '-end_time',
          50,
        ),
        base44.entities.EnglishPracticeSession.filter(
          { user_id: user.id, status: 'completed' },
          '-end_time',
          50,
        )
      ]);
      return [...mathSessions, ...englishSessions].sort((a, b) => new Date(b.end_time || b.start_time) - new Date(a.end_time || a.start_time)).slice(0, 50);
    },
    enabled: !!user?.id,
  });

  // Pre-fetch any non-static (AI-generated, PYQ, hand-picked) questions for the
  // currently selected session so we can show them too. Keeps the UI fast.
  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );

  const { data: dynamicQuestions = {} } = useQuery({
    queryKey: ['deepReviewDynamicQuestions', selectedSession?.id],
    enabled: !!selectedSession,
    queryFn: async () => {
      const ids = (selectedSession.question_history || [])
        .filter(h => !h.correct && !STATIC_LOOKUP.has(h.question_id))
        .map(h => h.question_id);
      if (ids.length === 0) return {};
      const records = await Promise.all(
        ids.map(async id => {
          const [sat, eng, pyq, can] = await Promise.all([
            base44.entities.SATQuestion.filter({ id }).catch(() => []),
            base44.entities.EnglishQuestion.filter({ id }).catch(() => []),
            base44.entities.PYQQuestion.filter({ id }).catch(() => []),
            base44.entities.CanyonMath.filter({ id }).catch(() => [])
          ]);
          return [...sat, ...eng, ...pyq, ...can];
        })
      );
      const map = {};
      records.flat().forEach(r => {
        if (r?.id) {
          // Normalize correct_answer field (CanyonMath uses 'answer')
          r.correct_answer = r.correct_answer || r.answer;
          map[r.id] = r;
        }
      });
      return map;
    },
  });

  const questionLookup = useMemo(() => {
    const m = new Map(STATIC_LOOKUP);
    for (const [id, q] of Object.entries(dynamicQuestions)) {
      m.set(id, q);
    }
    return m;
  }, [dynamicQuestions]);

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Detail view
  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        questionLookup={questionLookup}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  // List view
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-stone-700 border-4 border-white rounded-[2.5rem] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Search className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">
              Deep Review
            </h1>
            <p className="text-white/80 text-sm">
              See every mistake, grouped by concept — then jump straight to the lesson.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="mistakes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-stone-100 p-1.5 rounded-2xl h-12">
          <TabsTrigger value="mistakes" className="rounded-xl font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Session History</TabsTrigger>
          <TabsTrigger value="bookmarks" className="rounded-xl font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Saved Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="mistakes" className="space-y-4 focus-visible:outline-none">
          {sessions.length === 0 ? (
            <Card className="bg-white border-2 border-stone-200">
              <CardContent className="p-8 text-center">
                <Layers className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-700 font-semibold">No completed sessions yet</p>
                <p className="text-sm text-stone-500 mb-4">Finish a practice session to start reviewing.</p>
                <Link to={createPageUrl('SATPractice')}>
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Start Practicing</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <SessionRow key={s.id} session={s} onClick={() => setSelectedSessionId(s.id)} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="bookmarks" className="focus-visible:outline-none">
           <BookmarkedQuestionsTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookmarkedQuestionsTab({ user }) {
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: () => base44.entities.BookmarkedQuestion.filter({ user_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  if (bookmarks.length === 0) {
    return (
      <Card className="bg-white border-2 border-stone-200">
        <CardContent className="p-8 text-center">
          <Bookmark className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-700 font-semibold">No saved questions yet</p>
          <p className="text-sm text-stone-500">Bookmark questions while practicing or reviewing to see them here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookmarks.map(b => (
        <BookmarkedQuestionCard key={b.id} bookmark={b} />
      ))}
    </div>
  );
}

function BookmarkedQuestionCard({ bookmark }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showDissector, setShowDissector] = useState(false);
  return (
    <div className="rounded-xl border-2 border-emerald-100 bg-white p-4 shadow-sm relative transition-all hover:border-emerald-200 hover:shadow-md">
      <div className="absolute top-4 right-4 z-10">
         <BookmarkButton questionData={bookmark} />
      </div>
      <div className="flex flex-wrap gap-2 mb-3 pr-24">
        {bookmark.domain && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{bookmark.domain}</Badge>}
        {bookmark.difficulty && <Badge variant="outline" className="text-xs capitalize">{bookmark.difficulty}</Badge>}
      </div>
      <div className="text-sm text-stone-800 leading-relaxed mb-4 pr-24 font-medium">
        <MathText>{bookmark.question_text}</MathText>
      </div>

      {bookmark.options && bookmark.options.length > 0 && (
        <div className="space-y-2 mb-4">
          {bookmark.options.map(opt => {
            const isCorrect = opt.label === bookmark.correct_answer;
            return (
              <div
                key={opt.label}
                className={`text-sm px-4 py-3 rounded-xl border-2 ${
                  isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold shadow-sm' :
                  'border-stone-100 bg-stone-50 text-stone-600'
                }`}
              >
                <div className="flex items-start gap-3">
                   <span className={`w-6 flex-shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-stone-400'}`}>{opt.label})</span>
                   <span className="flex-1"><MathText>{opt.text}</MathText></span>
                   {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!bookmark.options?.length && bookmark.correct_answer && (
         <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 mb-4 inline-block shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1">Correct Answer</p>
            <p className="text-sm font-semibold text-emerald-900"><MathText>{bookmark.correct_answer}</MathText></p>
          </div>
      )}

      <div className="flex gap-4 mt-2">
        {bookmark.explanation && (
          <button
            onClick={() => setShowExplanation(s => !s)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide"
          >
            {showExplanation ? 'Hide Explanation' : 'View Explanation'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showExplanation ? 'rotate-180' : ''}`} />
          </button>
        )}
        <button
          onClick={() => setShowDissector(true)}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide"
        >
          Dissect Question
        </button>
      </div>

      {showExplanation && bookmark.explanation && (
        <div className="mt-3 rounded-xl bg-white border-2 border-stone-100 p-4 shadow-sm text-sm text-stone-700 leading-relaxed">
          <ExplanationText isCorrect={true}>{bookmark.explanation}</ExplanationText>
        </div>
      )}

      {showDissector && (
        <QuestionDissector
          question={bookmark}
          onClose={() => setShowDissector(false)}
        />
      )}
    </div>
  );
}

function SessionRow({ session, onClick }) {
  const correct = session.questions_correct || 0;
  const total = session.questions_attempted || 0;
  const wrong = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const date = session.end_time || session.start_time;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border-2 border-stone-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all p-4 flex items-center gap-4"
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' :
          accuracy >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        }`}
      >
        <span className="font-bold text-sm">{accuracy}%</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-bold text-stone-900 capitalize">{session.session_type || 'Practice'} Session</p>
          {wrong > 0 ? (
            <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs gap-1">
              <XCircle className="w-3 h-3" />
              {wrong} to review
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Perfect
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          {date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {format(new Date(date), 'MMM d, h:mm a')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {session.duration_minutes || 0} min
          </span>
          <span>{correct}/{total} correct</span>
        </div>
      </div>
    </button>
  );
}

function SessionDetail({ session, questionLookup, onBack }) {
  const date = session.end_time || session.start_time;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900">
        <ArrowLeft className="w-4 h-4" />
        Back to all sessions
      </button>

      <Card className="bg-white border-2 border-stone-200">
        <CardHeader>
          <CardTitle className="text-xl text-stone-900 capitalize">
            {session.session_type || 'Practice'} Session — Deep Review
          </CardTitle>
          <p className="text-sm text-stone-500">
            {date && format(new Date(date), 'EEEE, MMM d · h:mm a')}
            {' · '}
            {session.questions_correct}/{session.questions_attempted} correct
            {' · '}
            {session.duration_minutes || 0} min
          </p>
        </CardHeader>
      </Card>

      <SessionMistakeList session={session} questionLookup={questionLookup} />
    </div>
  );
}
