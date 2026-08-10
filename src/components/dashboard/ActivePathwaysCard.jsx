import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Compact active-pathways summary — shows top 2 with streak counts.
 */
export default function ActivePathwaysCard({ habits = [] }) {
  if (!habits.length) return null;
  return (
    <div className="bg-white border-2 border-emerald-100 rounded-3xl shadow-sm p-4 space-y-2 relative overflow-hidden">
      <div className="absolute -top-3 -right-3 text-emerald-200 text-2xl select-none pointer-events-none">⚡</div>
      <p className="text-xs font-bold text-stone-500 uppercase tracking-wider font-display relative">Active Pathways</p>
      {habits.slice(0, 2).map((habit) => (
        <div key={habit.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 border border-stone-100">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-800 text-xs truncate">{habit.title}</p>
            <p className="text-xs text-stone-500 truncate">{habit.tiny_behavior}</p>
          </div>
          <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full flex items-center gap-1 ml-2 flex-shrink-0 border border-teal-200 font-display font-bold">
            <Flame className="w-3 h-3" />{habit.streak_count || 0}
          </span>
        </div>
      ))}
      <Link to={createPageUrl('StudyHabits')}>
        <Button variant="outline" size="sm" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-full text-xs">
          All Pathways
        </Button>
      </Link>
    </div>
  );
}
