import React from 'react';
import { Progress } from '@/components/ui/progress';
import { xpProgressInLevel } from '@/utils/gamification';
import { Sparkles } from 'lucide-react';

export default function XpBar({ xp = 0, compact = false }) {
  const { level, into, span, pct, nextLevelXp } = xpProgressInLevel(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm">
          <Sparkles className="w-3 h-3" /> Lvl {level}
        </div>
        <Progress value={pct} className="flex-1 h-1.5 min-w-[60px]" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Level {level}
          </span>
          <span className="text-xs text-stone-500">{xp.toLocaleString()} XP</span>
        </div>
        <span className="text-xs text-stone-400">
          {into}/{span} to Lv {level + 1}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
