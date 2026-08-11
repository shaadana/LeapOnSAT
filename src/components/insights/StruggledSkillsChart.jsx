import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingDown } from 'lucide-react';
import { masteryTone } from '@/utils/performanceMetrics';

/**
 * Horizontal bar chart of per-domain accuracy across all completed sessions,
 * sorted worst-first so the most struggled skills rise to the top.
 * Accepts math + english sessions combined.
 */
export default function StruggledSkillsChart({ sessions = [] }) {
  const chartData = useMemo(() => {
    const stats = {};
    sessions.forEach(s => {
      if (s.status !== 'completed') return;
      (s.question_history || []).forEach(q => {
        if (!q.domain) return;
        if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0 };
        stats[q.domain].total++;
        if (q.correct) stats[q.domain].correct++;
      });
    });

    return Object.entries(stats)
      .map(([domain, s]) => ({
        domain: domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        total: s.total,
        correct: s.correct,
      }))
      .filter(d => d.total >= 2) // only show domains with enough data
      .sort((a, b) => a.accuracy - b.accuracy); // worst first
  }, [sessions]);

  if (chartData.length === 0) {
    return null;
  }

  const worst = chartData[0];

  return (
    <div className="bg-white rounded-3xl border-2 border-stone-100 shadow-sm p-6">
      <h2 className="font-display font-bold text-stone-800 mb-1 flex items-center gap-2 text-lg">
        <TrendingDown className="w-5 h-5 text-rose-500" /> Most Struggled Skills
      </h2>
      <p className="text-xs text-gray-400 mb-4">Accuracy by domain — lowest first (min 2 questions)</p>

      {worst && worst.accuracy < 70 && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <p className="text-xs text-rose-700">
            Focus area: <strong>{worst.domain}</strong> at {worst.accuracy}% accuracy ({worst.correct}/{worst.total} correct)
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 38)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="domain" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={120} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
            formatter={(val, name, props) => [`${val}% (${props.payload.correct}/${props.payload.total} correct)`, 'Accuracy']}
          />
          <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} barSize={22}>
            {chartData.map((entry, i) => {
              const tone = masteryTone(entry.accuracy);
              return <Cell key={i} fill={tone.fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
