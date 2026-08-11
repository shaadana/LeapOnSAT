import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Network, Target, XCircle, Lightbulb, ArrowRight } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import ExplanationText from '@/components/sat/ExplanationText';
import BookmarkButton from '@/components/review/BookmarkButton';
import QuestionDissector from '@/components/english/QuestionDissector';
import { groupMistakesByConcept } from '@/utils/conceptMapping';
import { createPageUrl } from '@/utils';

/**
 * Renders the wrong answers from a single PracticeSession, grouped by concept.
 * Each concept block links directly to the relevant Knowledge Graph node so
 * the student can jump straight into re-learning.
 *
 * @param {Object} props
 * @param {Object} props.session   — PracticeSession record
 * @param {Map<string, Object>} props.questionLookup — id → full question (text/options/explanation)
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { answersEquivalent } from '@/utils/mathUtils';

export default function SessionMistakeList({ session, questionLookup }) {
  const historyRaw = session?.question_history || [];
  const questionIds = historyRaw.map(q => q.question_id || q.id);

  const { data: latestAnswers } = useQuery({
    queryKey: ['latestAnswers', questionIds],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestCorrectAnswers', { question_ids: questionIds });
      return res.data?.answers || {};
    },
    enabled: questionIds.length > 0
  });

  const mistakes = useMemo(() => {
    let history = session?.question_history || [];
    
    if (latestAnswers) {
      history = history.map(q => {
        const latestCorrect = latestAnswers[q.question_id || q.id];
        if (latestCorrect) {
          const isNowCorrect = answersEquivalent(q.user_answer, latestCorrect);
          return { ...q, correct_answer: latestCorrect, correct: isNowCorrect };
        }
        return q;
      });
    }

    return history
      .filter(h => !h.correct)
      .map(h => {
        // The session's question_history already stores question_text, options,
        // correct_answer, and explanation — prefer those over the external lookup
        const q = questionLookup.get(h.question_id) || {};
        return {
          ...h,
          question_text: h.question_text || q.question_text || '(question text unavailable)',
          options: h.options || q.options || null,
          correct_answer: h.correct_answer || q.correct_answer || '?',
          explanation: h.explanation || q.explanation || '',
        };
      });
  }, [session, questionLookup, latestAnswers]);

  const grouped = useMemo(() => groupMistakesByConcept(mistakes), [mistakes]);

  if (mistakes.length === 0) {
    return (
      <Card className="bg-emerald-50 border-2 border-emerald-200">
        <CardContent className="p-6 text-center">
          <p className="text-emerald-800 font-semibold">No wrong answers in this session — clean run! 🎯</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-600">
        <span className="font-semibold text-stone-800">{mistakes.length} mistake{mistakes.length > 1 ? 's' : ''}</span>
        {' '}grouped into <span className="font-semibold text-stone-800">{grouped.length} concept{grouped.length > 1 ? 's' : ''}</span>.
        Tap any concept to review the questions and jump to the lesson.
      </div>

      {grouped.map((bucket, idx) => (
        <ConceptBucket key={bucket.node?.id || idx} bucket={bucket} defaultOpen={idx === 0} />
      ))}
    </div>
  );
}

function ConceptBucket({ bucket, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const { node, mistakes } = bucket;

  return (
    <Card className="bg-white border-2 border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-emerald-50/40 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xl">
          {node?.emoji || '📘'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-stone-900">
            {node?.title || 'Uncategorized'}
          </p>
          <p className="text-xs text-stone-500">{node?.domain || 'Math'} · {mistakes.length} mistake{mistakes.length > 1 ? 's' : ''}</p>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-stone-400" /> : <ChevronRight className="w-5 h-5 text-stone-400" />}
      </button>

      {open && (
        <CardContent className="p-4 pt-0 space-y-4 border-t border-stone-100">
          {node && (
            <div className="flex flex-wrap gap-2 pt-3">
              <Link to={`${createPageUrl('KnowledgeGraph')}?node=${node.id}`}>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                  <Network className="w-4 h-4" />
                  Open in Knowledge Graph
                </Button>
              </Link>
              <Link to={`${createPageUrl('SATPractice')}?mode=lesson&domain=${encodeURIComponent(node.domain.toLowerCase().replace(/\s+/g, '_'))}&subtopic=${encodeURIComponent(node.title)}`}>
                <Button size="sm" variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Lightbulb className="w-4 h-4" />
                  Study this lesson
                </Button>
              </Link>
              <Link to={`${createPageUrl('SATPractice')}?type=blitz&topic=${encodeURIComponent(node.domain.toLowerCase().replace(/\s+/g, '_'))}`}>
                <Button size="sm" variant="outline" className="gap-2 border-stone-300 text-stone-700 hover:bg-stone-50">
                  <Target className="w-4 h-4" />
                  Practice more
                </Button>
              </Link>
            </div>
          )}

          {mistakes.map((m, i) => (
            <MistakeCard key={`${m.question_id}-${i}`} mistake={m} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function MistakeCard({ mistake }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showDissector, setShowDissector] = useState(false);
  const userAnswer = mistake.user_answer || '(no answer)';
  const correctAnswer = mistake.correct_answer || '?';

  return (
    <div className="rounded-xl border-2 border-red-100 bg-red-50/40 p-4 relative">
      <div className="absolute top-3 right-3 z-10">
        <BookmarkButton questionData={mistake} />
      </div>
      <div className="flex items-start gap-2 mb-3 pr-20">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className="text-xs">{mistake.difficulty || '—'}</Badge>
            <Badge variant="outline" className="text-xs">{Math.round(mistake.time_spent_seconds || 0)}s</Badge>
          </div>
          <div className="text-sm text-stone-800 leading-relaxed">
            <MathText>{mistake.question_text}</MathText>
          </div>
        </div>
      </div>

      {/* Answer comparison */}
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-red-200 bg-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide font-bold text-red-500 mb-0.5">Your answer</p>
          <p className="text-sm font-semibold text-stone-800"><MathText>{userAnswer}</MathText></p>
        </div>
        <div className="rounded-lg border border-emerald-300 bg-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 mb-0.5">Correct</p>
          <p className="text-sm font-semibold text-emerald-800"><MathText>{correctAnswer}</MathText></p>
        </div>
      </div>

      {/* Options if available */}
      {mistake.options && mistake.options.length > 0 && (
        <div className="space-y-1 mb-3">
          {mistake.options.map(opt => {
            const isCorrect = opt.label === correctAnswer;
            const isUser = opt.label === userAnswer;
            return (
              <div
                key={opt.label}
                className={`text-xs px-3 py-1.5 rounded-md border ${
                  isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900' :
                  isUser ? 'border-red-300 bg-red-50 text-red-900' :
                  'border-stone-200 bg-white text-stone-600'
                }`}
              >
                <span className="font-bold mr-2">{opt.label}.</span>
                <MathText>{opt.text}</MathText>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-4 mt-2">
        {mistake.explanation && (
          <button
            onClick={() => setShowExplanation(s => !s)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <ArrowRight className={`w-3 h-3 transition-transform ${showExplanation ? 'rotate-90' : ''}`} />
            {showExplanation ? 'Hide' : 'Show'} explanation
          </button>
        )}
        <button
          onClick={() => setShowDissector(true)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
        >
          <Lightbulb className="w-3 h-3" /> Question Dissector
        </button>
      </div>

      {showExplanation && mistake.explanation && (
        <div className="mt-2 rounded-lg bg-white border border-stone-200 p-3">
          <ExplanationText isCorrect={false}>{mistake.explanation}</ExplanationText>
        </div>
      )}

      {showDissector && (
        <QuestionDissector
          question={mistake}
          onClose={() => setShowDissector(false)}
        />
      )}
    </div>
  );
}
