import React, { useMemo } from 'react';
import { XCircle, TrendingDown, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MathText from '@/components/sat/MathText';

/**
 * Aggregates the most recent incorrect questions across math + english sessions
 * and surfaces them as a compact summary: total mistakes, top struggled domains,
 * and a list of recent wrong answers with the correct answer + domain.
 */
export default function RecentMistakesSummary({ sessions = [] }) {
  const { recentMistakes, topStruggledDomains, totalMistakes } = useMemo(() => {
    const seenIds = new Set();
    const mistakes = [];
    const domainCounts = {};

    // sessions are already sorted newest-first by the parent
    sessions.forEach(s => {
      if (s.status !== 'completed') return;
      (s.question_history || []).forEach(q => {
        if (q.correct) return;
        const qid = q.question_id || q.id || q.question_text;
        if (seenIds.has(qid)) return;
        seenIds.add(qid);
        mistakes.push({
          ...q,
          sessionDate: s.start_time || s.created_date,
          sessionType: s.session_type,
        });
        if (q.domain) {
          domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
        }
      });
    });

    const top = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([domain, count]) => ({ domain, count }));

    return { recentMistakes: mistakes.slice(0, 6), topStruggledDomains: top, totalMistakes: mistakes.length };
  }, [sessions]);

  if (totalMistakes === 0) {
    return (
      <div className="bg-white rounded-3xl border-2 border-stone-100 shadow-sm p-6">
        <h2 className="font-display font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
          <XCircle className="w-5 h-5 text-emerald-500" /> Recent Mistakes
        </h2>
        <div className="text-center py-6">
          <p className="text-sm text-stone-500">No mistakes recorded yet — keep practicing!</p>
        </div>
      </div>
    );
  }

  const prettify = (d) => (d || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="bg-white rounded-3xl border-2 border-stone-100 shadow-sm p-6">
      <h2 className="font-display font-bold text-stone-800 mb-1 flex items-center gap-2 text-lg">
        <AlertCircle className="w-5 h-5 text-rose-500" /> Recent Mistakes
      </h2>
      <p className="text-xs text-gray-400 mb-4">{totalMistakes} unique question{totalMistakes !== 1 ? 's' : ''} missed across all sessions</p>

      {/* Top struggled domains */}
      {topStruggledDomains.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {topStruggledDomains.map(({ domain, count }) => (
            <div key={domain} className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
              <TrendingDown className="w-3 h-3 text-rose-500" />
              <span className="text-xs font-medium text-rose-700">{prettify(domain)}</span>
              <span className="text-xs text-rose-400">×{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent mistakes list */}
      <div className="space-y-2">
        {recentMistakes.map((m, i) => (
          <div key={i} className="p-3 rounded-xl border border-stone-100 bg-stone-50/50 hover:border-rose-200 transition-colors">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 line-clamp-2 leading-relaxed mb-2">
                  <MathText>{m.question_text || '(Question text unavailable)'}</MathText>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {m.domain && <Badge variant="outline" className="text-[10px] py-0">{prettify(m.domain)}</Badge>}
                  <span className="text-xs text-red-600 font-medium">You: {m.user_answer || '—'}</span>
                  <span className="text-xs text-emerald-600 font-semibold">✓ {m.correct_answer || '?'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
