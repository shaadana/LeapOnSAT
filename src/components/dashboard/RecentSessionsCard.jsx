import React from 'react';
import { Zap, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Compact recent-sessions card showing last 3 sessions with whimsical accents.
 */
export default function RecentSessionsCard({ sessions = [] }) {
  if (!sessions.length) return null;
  return (
    <div className="bg-white border-2 border-emerald-100 rounded-3xl shadow-sm p-4 relative overflow-hidden">
      <div className="absolute -top-3 -right-3 w-16 h-16 bg-emerald-50 rounded-full pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider font-display">Recent Sessions</p>
          <Link to={createPageUrl('StudyInsights')} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium flex items-center gap-0.5">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-1.5">
          {sessions.slice(0, 3).map((session) => {
            const pct = session.questions_attempted
              ? Math.round((session.questions_correct / session.questions_attempted) * 100)
              : 0;
            const Icon = session.session_type === 'blitz' ? Zap : session.session_type === 'challenge' ? Sparkles : BookOpen;
            return (
              <div key={session.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 border border-stone-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-800 capitalize">{session.session_type}</p>
                    <p className="text-xs text-stone-500">{session.questions_correct || 0}/{session.questions_attempted || 0} correct</p>
                  </div>
                </div>
                <span className="text-sm font-display font-bold text-emerald-600">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
