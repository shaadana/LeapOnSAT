import React from 'react';
import { Target, Sparkles, TrendingUp, Flame } from 'lucide-react';

/**
 * Compact stats row — 4 small whimsical chips, alternating tilt.
 */
export default function DashboardStatsRow({
  completedSessions = 0,
  activeHabits = 0,
  totalCorrect = 0,
  currentStreak = 0,
}) {
  const stats = [
    { icon: Target,     label: 'Sessions', value: completedSessions, tint: 'from-emerald-100 to-emerald-50',  ring: 'border-emerald-200', icon_bg: 'bg-emerald-500',  tilt: '-rotate-1' },
    { icon: Sparkles,   label: 'Pathways', value: activeHabits,      tint: 'from-emerald-50 to-white',         ring: 'border-emerald-100', icon_bg: 'bg-emerald-400',  tilt: 'rotate-1' },
    { icon: TrendingUp, label: 'Correct',  value: totalCorrect,      tint: 'from-stone-50 to-white',           ring: 'border-stone-200',   icon_bg: 'bg-emerald-600',  tilt: '-rotate-1' },
    { icon: Flame,      label: 'Streak',   value: currentStreak,     tint: 'from-teal-50 to-white',            ring: 'border-teal-200',    icon_bg: 'bg-teal-500',     tilt: 'rotate-1' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, tint, ring, icon_bg, tilt }) => (
        <div
          key={label}
          className={`bg-gradient-to-br ${tint} border-2 ${ring} rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-3 flex items-center gap-3 ${tilt} hover:rotate-0`}
        >
          <div className={`w-9 h-9 rounded-xl ${icon_bg} flex items-center justify-center flex-shrink-0 shadow`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-lg font-display font-bold text-stone-800 leading-none">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
