import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Network, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MASTERY_ORDER = ['not_started', 'learning', 'practiced', 'mastered'];

const DOMAIN_META = {
  'Algebra':          { emoji: '📏', label: 'Algebra' },
  'Advanced Algebra': { emoji: '📐', label: 'Advanced Algebra' },
  'Geometry':         { emoji: '🔺', label: 'Geometry' },
  'Trigonometry':     { emoji: '📡', label: 'Trigonometry' },
  'Statistics':       { emoji: '📊', label: 'Statistics' },
  'Problem Solving':  { emoji: '🧩', label: 'Problem Solving' },
  'Foundations':      { emoji: '🔢', label: 'Foundations' },
};

import { useSATKnowledgeGraph } from '@/hooks/useSATKnowledgeGraph';

export default function SATWeakDomainsPanel({ userId }) {
  const { mergedNodes, isLoading } = useSATKnowledgeGraph(userId);
  const [collapsed, setCollapsed] = useState(true);

  if (isLoading || !mergedNodes.length) return null;

  const domainGroups = {};
  for (const node of mergedNodes) {
    const domain = node.subject_area || 'Other';
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push(node);
  }

  const domainSummaries = Object.entries(domainGroups).map(([domain, nodes]) => {
    const avgIdx = nodes.reduce((sum, n) => sum + MASTERY_ORDER.indexOf(n.mastery_level || 'not_started'), 0) / nodes.length;
    const mastered = nodes.filter(n => n.mastery_level === 'mastered').length;
    const meta = DOMAIN_META[domain] || { emoji: '📚', label: domain };
    return { domain, nodes, avgIdx, mastered, total: nodes.length, meta };
  }).sort((a, b) => a.avgIdx - b.avgIdx);

  const overallMastery = mergedNodes.length > 0
    ? Math.round(mergedNodes.reduce((sum, n) => sum + MASTERY_ORDER.indexOf(n.mastery_level || 'not_started'), 0) / (mergedNodes.length * 3) * 100)
    : 0;

  const hasAnyPerformance = mergedNodes.some(n => n.mastery_level !== 'not_started');
  if (!hasAnyPerformance) return null;

  const weakDomains = domainSummaries.filter(d => d.avgIdx < 2);
  const strongDomains = domainSummaries.filter(d => d.avgIdx >= 2);

  return (
    <Card className="border-2 border-stone-200 rounded-2xl bg-stone-50 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center gap-2 text-left"
          >
            <AlertCircle className="w-5 h-5 text-stone-500" />
            <h2 className="text-base font-bold text-stone-800">Focus Areas</h2>
            {weakDomains.length > 0 && (
              <Badge className="bg-stone-200 text-stone-700 text-xs">{weakDomains.length} to improve</Badge>
            )}
            <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
          <Link to={createPageUrl('KnowledgeGraph')} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
            <Network className="w-3.5 h-3.5" />
            View Full Graph
          </Link>
        </div>

        {collapsed && (
          <p className="text-xs text-stone-500 mt-3">
            {overallMastery}% overall mastery · {weakDomains.length} domain{weakDomains.length === 1 ? '' : 's'} to improve. Click to expand.
          </p>
        )}

        {/* Overall mastery */}
        {!collapsed && (
        <div className="mb-4 mt-4">
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span className="font-medium text-stone-700">Overall mastery</span>
            <span className="font-bold text-stone-800">{overallMastery}%</span>
          </div>
          <Progress value={overallMastery} className="h-2" />
        </div>
        )}

        {/* Weak domains with percentages */}
        {!collapsed && weakDomains.length > 0 && (
          <div className="space-y-2.5">
            {weakDomains.map(({ domain, nodes, avgIdx, meta }) => {
              const weakSkills = nodes.filter(n => MASTERY_ORDER.indexOf(n.mastery_level || 'not_started') < 2);
              const progress = Math.round((avgIdx / 3) * 100);
              return (
                <div key={domain} className="bg-white rounded-xl p-2.5 border border-stone-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{meta.emoji}</span>
                      <span className="text-xs font-semibold text-stone-800">{meta.label}</span>
                    </div>
                    <span className="text-xs font-bold text-stone-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1 mb-1.5" />
                  <div className="flex flex-wrap gap-1">
                    {weakSkills.slice(0, 3).map(n => (
                      <span key={n.id} className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                        {n.title}
                      </span>
                    ))}
                    {weakSkills.length > 3 && (
                      <span className="text-xs text-stone-400">+{weakSkills.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!collapsed && strongDomains.length > 0 && (
          <p className="text-xs text-emerald-600 pt-3 mt-1 border-t border-stone-200">
            ✓ Strong in: {strongDomains.map(d => `${d.meta.label} (${Math.round((d.avgIdx / 3) * 100)}%)`).join(' · ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
