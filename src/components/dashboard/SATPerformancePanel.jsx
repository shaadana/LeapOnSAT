import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Target, TrendingUp, ArrowRight, AlertCircle, Network, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { computeOverallAccuracy, MASTERY_THRESHOLDS, getConsistentDomainScores } from '@/utils/performanceMetrics';

const DOMAIN_LABELS = {
  algebra:              'Algebra',
  advanced_algebra:     'Advanced Algebra',
  geometry:             'Geometry',
  trigonometry:         'Trigonometry',
  statistics:           'Statistics',
  problem_solving:      'Problem Solving',
  systems_of_equations: 'Systems of Equations',
  quadratics:           'Quadratics',
  exponentials:         'Exponentials',
  ratios_proportions:   'Ratios & Proportions',
  circles:              'Circles',
  polynomials:          'Polynomials',
};

const LEVEL_COLORS = {
  mastered:    'bg-emerald-500 text-white',
  practiced:   'bg-emerald-100 text-emerald-700',
  learning:    'bg-stone-100 text-stone-600',
  not_started: 'bg-stone-100 text-stone-500',
};

/**
 * Shown on Dashboard. Merges live ConceptNode mastery with diagnostic scores.
 */
export default function SATPerformancePanel({ satPerformance, conceptNodes = [], sessions = [] }) {
  const hasDiagnostic = !!satPerformance?.domain_scores;
  const hasNodes = conceptNodes.length > 0;
  if (!hasDiagnostic && !hasNodes && sessions.length === 0) return null;

  const { overall_level, diagnostic_accuracy } = satPerformance || {};

  // Get consistent domain scores reconciled from diagnostics, live practice, and nodes
  const mergedScores = getConsistentDomainScores({ sat_performance: satPerformance }, conceptNodes, sessions);

  const sortedDomains = Object.entries(mergedScores).sort(([, a], [, b]) => a - b);
  const weakDomains = sortedDomains.filter(([, score]) => score < MASTERY_THRESHOLDS.practiced);
  const strongDomains = sortedDomains.filter(([, score]) => score >= MASTERY_THRESHOLDS.practiced);

  // Live session accuracy: pool TOTALS across sessions (consistent with all other views)
  const liveAccuracy = computeOverallAccuracy(sessions);

  const overallPct = liveAccuracy ?? diagnostic_accuracy ?? (
    Object.values(mergedScores).length > 0
      ? Math.round(Object.values(mergedScores).reduce((a, b) => a + b, 0) / Object.values(mergedScores).length)
      : null
  );

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" />
          SAT Math Performance
          {overall_level && (
            <Badge className="ml-auto bg-stone-700 text-white text-xs capitalize">{overall_level}</Badge>
          )}
        </CardTitle>
        {hasNodes && <p className="text-xs text-stone-400 mt-0.5">Live mastery from knowledge graph</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall */}
        {overallPct !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-stone-500">
              <span>{liveAccuracy !== null ? 'Live session accuracy' : 'Overall mastery'}</span>
              <span>{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </div>
        )}

        {/* Weak domains — show up to 4 */}
        {weakDomains.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
              <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
              Focus areas
            </div>
            {weakDomains.slice(0, 4).map(([domain, score]) => {
              const masteryLabel = score >= MASTERY_THRESHOLDS.practiced ? 'practiced' : score >= MASTERY_THRESHOLDS.learning ? 'learning' : 'not_started';
              return (
                <div key={domain} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-700 flex-1 truncate">
                    {DOMAIN_LABELS[domain] || domain}
                  </span>
                  <div className="flex items-center gap-2 w-32 flex-shrink-0">
                    <Progress value={score} className="h-1.5 flex-1" />
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${LEVEL_COLORS[masteryLabel]}`}>
                      {score !== null ? `${score}%` : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
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
          {weakDomains.length > 0 && (
            <Link to={`${createPageUrl('SATPractice')}?topic=${weakDomains[0][0]}`} className="flex-1">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-full gap-1">
                Practice Weakest
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          )}
          <Link to={createPageUrl('KnowledgeGraph')}>
            <Button size="sm" variant="outline" className="border-stone-300 text-stone-600 hover:bg-stone-50 rounded-full gap-1">
              <Network className="w-3.5 h-3.5" />
              Graph
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
