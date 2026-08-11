import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MASTERY_LEVEL_TO_PCT, MASTERY_THRESHOLDS } from '@/utils/performanceMetrics';

const DOMAIN_LABELS = {
  algebra: 'Algebra', advanced_algebra: 'Advanced Algebra', geometry: 'Geometry',
  trigonometry: 'Trigonometry', statistics: 'Statistics', problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems of Equations', quadratics: 'Quadratics',
  exponentials: 'Exponentials', ratios_proportions: 'Ratios & Proportions',
  circles: 'Circles', polynomials: 'Polynomials',
};

// Map domain mastery gaps to recommended lesson subtopics
const DOMAIN_TO_LESSONS = {
  algebra: ['Linear equations', 'Slope and intercepts', 'Functions & function notation'],
  advanced_algebra: ['Completing the square', 'Rational expressions', 'Composition of functions'],
  geometry: ['Special right triangles (30-60-90, 45-45-90)', 'Similar figures', 'Volume of 3D solids'],
  trigonometry: ['SOH-CAH-TOA', 'Unit circle & radians', 'Law of sines and cosines'],
  statistics: ['Standard deviation', 'Margin of error', 'Normal distribution'],
  problem_solving: ['Percentages and percent change', 'Rate/work problems', 'Mixture problems'],
  systems_of_equations: ['Elimination method', 'Number of solutions', 'Linear-quadratic systems'],
  quadratics: ['Quadratic formula', 'Discriminant and number of roots', 'Completing the square'],
  exponentials: ['Exponential growth/decay', 'Fractional exponents & radicals', 'Exponential equations'],
  ratios_proportions: ['Direct and inverse variation', 'Similar triangles & proportions', 'Percent problems'],
  circles: ['Circle equation (standard form)', 'Arc length and sector area', 'Tangent lines'],
  polynomials: ['Remainder and factor theorems', "Vieta's formulas", 'Roots and multiplicity'],
};

// Map domain key to SAT domain tags for matching ConceptNodes
const NODE_DOMAIN_TAGS = {
  algebra: ['algebra', 'linear', 'function', 'slope'],
  advanced_algebra: ['advanced algebra', 'rational', 'composition'],
  geometry: ['geometry', 'triangle', 'area', 'angle'],
  trigonometry: ['trigonometry', 'sine', 'cosine'],
  statistics: ['statistics', 'deviation', 'probability'],
  problem_solving: ['problem solving', 'percentage', 'rate'],
  systems_of_equations: ['systems', 'elimination'],
  quadratics: ['quadratic', 'parabola', 'discriminant'],
  exponentials: ['exponential', 'exponent', 'radical'],
  ratios_proportions: ['ratio', 'proportion'],
  circles: ['circle', 'arc', 'sector'],
  polynomials: ['polynomial', 'factor theorem'],
};

export default function RecommendedLessonsPanel({ satPerformance, conceptNodes = [] }) {
  // Get domains with low live mastery from ConceptNodes
  // Uses canonical MASTERY_LEVEL_TO_PCT so this matches every other view
  const nodeDomainScores = {};
  const levelScores = MASTERY_LEVEL_TO_PCT;
  conceptNodes.forEach(node => {
    const title = (node.title || '').toLowerCase();
    const tags = (node.tags || []).map(t => t.toLowerCase());
    for (const [domain, keywords] of Object.entries(NODE_DOMAIN_TAGS)) {
      if (keywords.some(k => title.includes(k) || tags.some(t => t.includes(k)))) {
        if (!nodeDomainScores[domain]) nodeDomainScores[domain] = [];
        nodeDomainScores[domain].push(levelScores[node.mastery_level] ?? 0);
      }
    }
  });

  const hasNodeData = Object.keys(nodeDomainScores).length > 0;
  const hasDiagnostic = !!satPerformance?.domain_scores;
  if (!hasDiagnostic && !hasNodeData) return null;

  // Build merged scores: live node mastery preferred, fallback to diagnostic
  const mergedScores = {};
  if (hasDiagnostic) {
    Object.entries(satPerformance.domain_scores).forEach(([d, s]) => { mergedScores[d] = s; });
  }
  Object.entries(nodeDomainScores).forEach(([d, scores]) => {
    mergedScores[d] = Math.round(scores.reduce((a, b) => a + b) / scores.length);
  });

  // "Weak" = below the "practiced" threshold (canonical from performanceMetrics)
  const weakDomains = Object.entries(mergedScores)
    .filter(([, score]) => score < MASTERY_THRESHOLDS.practiced)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4);

  // If ConceptNodes available, also surface specific unmastered nodes as lesson targets
  const unmasteredNodes = conceptNodes
    .filter(n => n.mastery_level === 'not_started' || n.mastery_level === 'learning')
    .sort((a, b) => {
      const order = { not_started: 0, learning: 1 };
      return (order[a.mastery_level] ?? 2) - (order[b.mastery_level] ?? 2);
    })
    .slice(0, 4);

  if (weakDomains.length === 0 && unmasteredNodes.length === 0) return null;

  // Prefer ConceptNode-specific recommendations if available
  let recommendations = [];
  if (unmasteredNodes.length > 0) {
    recommendations = unmasteredNodes.map(node => ({
      domain: node.subject_area?.toLowerCase().replace(/ /g,'_') || 'algebra',
      subtopic: node.title,
      score: levelScores[node.mastery_level] ?? 0,
      priority: node.mastery_level === 'not_started' ? 'high' : 'medium',
      nodeId: node.id,
    })).slice(0, 6);
  } else {
    recommendations = weakDomains.flatMap(([domain, score]) => {
      const lessons = DOMAIN_TO_LESSONS[domain] || [];
      return lessons.slice(0, score <= 33 ? 3 : 2).map(subtopic => ({
        domain,
        subtopic,
        score,
        priority: score <= 33 ? 'high' : 'medium',
      }));
    }).slice(0, 6);
  }

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display text-stone-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          Recommended Lessons
        </CardTitle>
        <p className="text-xs text-stone-500">Based on your diagnostic results — start here to bridge your gaps</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map(({ domain, subtopic, priority }, i) => (
          <Link
            key={i}
            to={`${createPageUrl('SATPractice')}?mode=lesson&domain=${domain}&subtopic=${encodeURIComponent(subtopic)}`}
            className="block"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 group-hover:text-emerald-800 truncate">{subtopic}</p>
                <p className="text-xs text-stone-500">{DOMAIN_LABELS[domain]}</p>
              </div>
              <div className="flex items-center gap-2">
                {priority === 'high' && (
                  <Badge className="bg-stone-100 text-stone-600 border-stone-200 text-xs">Priority</Badge>
                )}
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-500" />
              </div>
            </div>
          </Link>
        ))}
        <Link to={`${createPageUrl('SATPractice')}?mode=lesson`}>
          <Button variant="outline" size="sm" className="w-full mt-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            Browse All Lessons
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
