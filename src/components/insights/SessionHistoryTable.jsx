import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { BookOpen, ChevronDown, ChevronRight, XCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MathText from '@/components/sat/MathText';

const prettify = (d) => (d || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function SessionDetail({ session }) {
  const history = session.question_history || [];
  const wrong = history.filter(q => !q.correct);

  // Domain breakdown for this session
  const domainStats = {};
  history.forEach(q => {
    if (!q.domain) return;
    if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 };
    domainStats[q.domain].total++;
    if (q.correct) domainStats[q.domain].correct++;
  });

  const sortedDomains = Object.entries(domainStats).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));

  return (
    <div className="px-4 pb-4 pt-2 bg-stone-50/50 rounded-b-xl border-t border-stone-100">
      <div className="grid md:grid-cols-2 gap-4 mt-3">
        {/* Domain breakdown */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Domain Breakdown</p>
          <div className="space-y-1.5">
            {sortedDomains.map(([domain, s]) => {
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={domain} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-32 flex-shrink-0 truncate">{prettify(domain)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[60px]">
                    <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-12 text-right">{s.correct}/{s.total}</span>
                </div>
              );
            })}
            {sortedDomains.length === 0 && <p className="text-xs text-gray-400">No domain data</p>}
          </div>
        </div>

        {/* Wrong questions */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
            Questions Missed ({wrong.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {wrong.map((q, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-rose-100 bg-white">
                <div className="flex items-start gap-2 mb-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-700 line-clamp-2 leading-relaxed flex-1">
                    <MathText>{q.question_text || '(Question text unavailable)'}</MathText>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap pl-5">
                  {q.domain && <Badge variant="outline" className="text-[9px] py-0">{prettify(q.domain)}</Badge>}
                  <span className="text-[11px] text-red-600">You: {q.user_answer || '—'}</span>
                  <span className="text-[11px] text-emerald-600 font-semibold">✓ {q.correct_answer || '?'}</span>
                </div>
                {q.explanation && (
                  <p className="text-[11px] text-stone-500 mt-1.5 pl-5 line-clamp-2 italic">{q.explanation}</p>
                )}
              </div>
            ))}
            {wrong.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-600 py-2">
                <CheckCircle className="w-4 h-4" />
                <p className="text-xs font-medium">Perfect session — no mistakes!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Expandable session history table — click any row to reveal the wrong questions
 * and a per-domain breakdown for that session.
 */
export default function SessionHistoryTable({ sessions = [], showAll, onToggleShowAll }) {
  const [expandedId, setExpandedId] = useState(null);

  const sorted = [...sessions].sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));
  const visible = sorted.slice(0, showAll ? undefined : 10);

  return (
    <div className="bg-white rounded-3xl border-2 border-stone-100 shadow-sm p-6">
      <h2 className="font-display font-bold text-stone-800 mb-5 flex items-center gap-2 text-lg">
        <BookOpen className="w-5 h-5 text-emerald-500" /> Session History
      </h2>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">Click any session to review what you missed</p>
        <button onClick={onToggleShowAll} className="text-xs text-emerald-600 font-semibold hover:underline">
          {showAll ? 'Show Less' : `Show All ${sessions.length} Sessions`}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Date', 'Type', 'Questions', 'Correct', 'Accuracy', 'Duration', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 py-2 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((s, i) => {
              const acc = s.questions_attempted > 0 ? Math.round((s.questions_correct / s.questions_attempted) * 100) : null;
              const isExpanded = expandedId === s.id;
              const hasHistory = (s.question_history || []).length > 0;
              return (
                <React.Fragment key={s.id || i}>
                  <tr
                    className={`border-b border-gray-50 ${hasHistory ? 'cursor-pointer hover:bg-emerald-50/40' : ''}`}
                    onClick={() => hasHistory && setExpandedId(isExpanded ? null : s.id)}
                  >
                    <td className="py-2 pr-4 text-gray-700">
                      <div className="flex items-center gap-1.5">
                        {hasHistory && (isExpanded ? <ChevronDown className="w-3 h-3 text-emerald-500" /> : <ChevronRight className="w-3 h-3 text-stone-400" />)}
                        {s.start_time ? format(parseISO(s.start_time), 'MMM d, yyyy') : '—'}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 capitalize whitespace-nowrap">
                        {(s.session_type || 'practice').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{s.questions_attempted ?? '—'}</td>
                    <td className="py-2 pr-4 text-gray-700">{s.questions_correct ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {acc !== null ? (
                        <span className={`font-semibold ${acc >= 80 ? 'text-emerald-600' : acc >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{acc}%</span>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{s.duration_minutes ? `${s.duration_minutes}m` : '—'}</td>
                    <td className="py-2 text-gray-500 text-xs">{hasHistory ? 'Review' : ''}</td>
                  </tr>
                  {isExpanded && hasHistory && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <SessionDetail session={s} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
