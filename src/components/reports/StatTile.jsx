import React from 'react';

/**
 * A small KPI tile used in stat strips at the top of report tabs.
 * Uses emerald + stone palette to match the app theme.
 */
export default function StatTile({ label, value, sublabel, tone = 'emerald', icon: Icon }) {
  const toneMap = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    stone: 'bg-stone-50 border-stone-200 text-stone-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    white: 'bg-white border-stone-200 text-stone-700',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 flex items-center gap-3 ${toneMap[tone] || toneMap.emerald}`}>
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="min-w-0">
        <p
          className="text-xl font-bold leading-tight"
          style={{ fontFamily: 'Righteous, sans-serif' }}
        >
          {value}
        </p>
        <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
        {sublabel && <p className="text-[10px] text-stone-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
