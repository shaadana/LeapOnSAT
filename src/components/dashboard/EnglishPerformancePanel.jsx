import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PenTool, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MASTERY_THRESHOLDS, computeOverallAccuracy, computeDomainAccuracy } from '@/utils/performanceMetrics';

const DOMAIN_LABELS = {
  apostrophes: "Apostrophes",
  semicolons_periods: "Semicolons & Periods",
  commas: "Commas",
  colons: "Colons",
  dashes: "Dashes",
  conciseness: "Conciseness",
  parallel_structure: "Parallel Structure",
  subject_verb_agreement: "Subject-Verb Agreement",
  pronoun_agreement: "Pronoun Agreement",
  verb_tense: "Verb Tense",
  adjectives_adverbs: "Adjectives & Adverbs",
  word_pairs: "Word Pairs",
  who_which_whom: "Who/Which/Whom",
  modifiers: "Modifiers",
  pronoun_case: "Pronoun Case",
  idioms_diction: "Idioms & Diction",
  transitions: "Transitions",
  vocabulary: "Vocabulary",
  reading_comprehension: "Reading Comprehension",
  main_idea: "Main Idea",
  inference: "Inference",
  evidence_support: "Evidence & Support",
  tone_purpose: "Tone & Purpose",
};

/**
 * Mirrors SATPerformancePanel for English: merges live English session data
 * with diagnostic scores so the dashboard always reflects the most recent and
 * complete picture of the student's ELA progress.
 */
export default function EnglishPerformancePanel({ englishPerformance, englishSessions = [] }) {
  const hasDiagnostic = !!englishPerformance?.domain_scores || !!englishPerformance?.diagnostic_accuracy;
  const hasSessions = englishSessions.length > 0;
  if (!hasDiagnostic && !hasSessions) return null;

  const { domain_scores = {}, overall_level, diagnostic_accuracy } = englishPerformance || {};

  // Live per-domain accuracy from English sessions
  const liveDomainStats = computeDomainAccuracy(englishSessions);

  // Merge: live wins when there are at least 5 attempts in a domain;
  // otherwise fall back to diagnostic
  const mergedScores = {};
  const allDomains = new Set([
    ...Object.keys(DOMAIN_LABELS),
    ...Object.keys(domain_scores),
    ...Object.keys(liveDomainStats),
  ]);
  allDomains.forEach(d => {
    const live = liveDomainStats[d];
    const diag = domain_scores[d];
    if (live && live.total >= 5) mergedScores[d] = live.accuracy;
    else if (diag !== undefined) mergedScores[d] = diag;
    else if (live) mergedScores[d] = live.accuracy; // sparse live data is better than nothing
  });

  const sortedDomains = Object.entries(mergedScores).sort(([, a], [, b]) => a - b);
  const weakDomains = sortedDomains.filter(([, score]) => score < MASTERY_THRESHOLDS.practiced);
  const strongDomains = sortedDomains.filter(([, score]) => score >= MASTERY_THRESHOLDS.practiced);

  const liveAccuracy = computeOverallAccuracy(englishSessions);
  const overallPct = liveAccuracy ?? diagnostic_accuracy ?? (
    sortedDomains.length > 0
      ? Math.round(sortedDomains.reduce((a, [, s]) => a + s, 0) / sortedDomains.length)
      : null
  );

  // Total questions attempted (live sessions + diagnostic count)
  const liveAttempted = englishSessions.reduce((sum, s) => sum + (s.questions_attempted || 0), 0);
  const liveCorrect = englishSessions.reduce((sum, s) => sum + (s.questions_correct || 0), 0);
  const diagAttempted = englishPerformance?.total_questions_attempted || 0;
  const diagCorrect = englishPerformance?.total_correct || 0;
  const totalAttempted = liveAttempted + diagAttempted;
  const totalCorrect = liveCorrect + diagCorrect;

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display text-gray-900 flex items-center gap-2">
          <PenTool className="w-5 h-5 text-emerald-500" />
          SAT English Performance
          {overall_level && (
            <Badge className="ml-auto bg-stone-700 text-white text-xs capitalize">{overall_level}</Badge>
          )}
        </CardTitle>
        {hasSessions && <p className="text-xs text-stone-400 mt-0.5">Live accuracy from {englishSessions.length} session{englishSessions.length !== 1 ? 's' : ''}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall accuracy */}
        {overallPct !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-stone-500">
              <span>{liveAccuracy !== null ? 'Live session accuracy' : 'Overall accuracy'}</span>
              <span>{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </div>
        )}

        {/* Stats row — questions attempted, correct */}
        {totalAttempted > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-xl p-2 text-center">
              <div className="text-base font-bold text-emerald-700">{totalAttempted}</div>
              <div className="text-[10px] text-emerald-600/80 uppercase tracking-wide">Attempted</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2 text-center">
              <div className="text-base font-bold text-emerald-700">{totalCorrect}</div>
              <div className="text-[10px] text-emerald-600/80 uppercase tracking-wide">Correct</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2 text-center">
              <div className="text-base font-bold text-emerald-700">{englishPerformance?.vocab_words_mastered || 0}</div>
              <div className="text-[10px] text-emerald-600/80 uppercase tracking-wide">Vocab</div>
            </div>
          </div>
        )}

        {/* Weak domains */}
        {weakDomains.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
              <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
              Focus areas
            </div>
            {weakDomains.slice(0, 4).map(([domain, score]) => (
              <div key={domain} className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-700 flex-1 truncate">
                  {DOMAIN_LABELS[domain] || domain.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2 w-28 flex-shrink-0">
                  <Progress value={score} className="h-1.5 flex-1" />
                  {(() => {
                    const masteryLabel = score >= MASTERY_THRESHOLDS.practiced ? 'practiced' : score >= MASTERY_THRESHOLDS.learning ? 'learning' : 'not_started';
                    const LEVEL_COLORS = {
                      mastered:    'bg-emerald-500 text-white',
                      practiced:   'bg-emerald-100 text-emerald-700',
                      learning:    'bg-stone-100 text-stone-600',
                      not_started: 'bg-stone-100 text-stone-500',
                    };
                    return (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${LEVEL_COLORS[masteryLabel]}`}>
                        {score !== null ? `${score}%` : '—'}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Strong domains summary */}
        {strongDomains.length > 0 && (
          <p className="text-xs text-emerald-600">
            ✓ Strong in: {strongDomains.slice(0, 3).map(([d]) => DOMAIN_LABELS[d] || d).join(', ')}
            {strongDomains.length > 3 && ` +${strongDomains.length - 3} more`}
          </p>
        )}

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <Link
            to={weakDomains.length > 0 ? `${createPageUrl('SATEnglishPractice')}?topic=${weakDomains[0][0]}` : createPageUrl('SATEnglishPractice')}
            className="flex-1"
          >
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-full gap-1">
              {weakDomains.length > 0 ? 'Practice Weakest' : 'Practice English'}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
          <Link to={createPageUrl('EnglishKnowledgeGraph')}>
            <Button size="sm" variant="outline" className="border-stone-300 text-stone-600 hover:bg-stone-50 rounded-full gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Graph
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
