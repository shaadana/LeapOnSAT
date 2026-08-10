import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, BookOpen, Sparkles, GraduationCap, Network, PenTool } from 'lucide-react';

/**
 * 6 colorful action tiles with subtle alternating tilt + whimsical shadows.
 * Alternating tilts give a friendly, slightly-imperfect feel.
 */
const ACTIONS = [
  { label: 'Blitz',     sub: '5-min',       icon: Zap,           path: 'SATPractice',     query: '?type=blitz',  bg: 'bg-emerald-500' },
  { label: 'Class',     sub: 'Deep dive',   icon: BookOpen,      path: 'SATPractice',     query: '?type=class',  bg: 'bg-emerald-400' },
  { label: 'English',   sub: 'Practice',    icon: PenTool,       path: 'SATEnglishPractice', query: '',          bg: 'bg-teal-500' },
  { label: 'Pathways',  sub: 'LEAP',        icon: Sparkles,      path: 'StudyHabits',     query: '',             bg: 'bg-emerald-600' },
  { label: 'Study',     sub: 'AI plans',    icon: GraduationCap, path: 'IndependentStudy', query: '',            bg: 'bg-emerald-700' },
  { label: 'Graph',     sub: 'Map',         icon: Network,       path: 'KnowledgeGraph',  query: '',             bg: 'bg-stone-700' },
];

export default function DashboardQuickActions() {
  return (
    <div className="bg-white border-2 border-emerald-100 rounded-3xl shadow-sm p-4 relative">
      <div className="absolute -top-2 -right-2 text-emerald-300 text-xl rotate-12 select-none pointer-events-none">✦</div>
      <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 font-display">Start Learning</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ACTIONS.map(({ label, sub, icon: Icon, path, query, bg }, idx) => (
          <Link key={label} to={createPageUrl(path) + query}>
            <div
              className={`p-3 rounded-2xl ${bg} hover:brightness-110 transition-all cursor-pointer border-2 border-white shadow-md hover:shadow-lg hover:-translate-y-0.5 text-center ${
                idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
              } hover:rotate-0`}
            >
              <Icon className="w-5 h-5 text-white mx-auto mb-1" />
              <p className="font-display font-bold text-white text-xs">{label}</p>
              <p className="text-white/75 text-[10px]">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
