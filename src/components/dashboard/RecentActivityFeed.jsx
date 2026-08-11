import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, BookOpen, PenTool, ChevronRight, Clock, Target, GraduationCap, CheckCircle2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Compact recent activity — last 3 completed items (sessions, assignments, concepts).
 */
export default function RecentActivityFeed({ mathSessions = [], englishSessions = [], assignments = [] }) {
  const normalizedMath = mathSessions.filter(s => s.status === 'completed').map(s => ({
    id: s.id,
    date: parseSafeDate(s.start_time || s.created_date || s.updated_date),
    type: 'math',
    title: `Math ${s.session_type || 'practice'}`,
    correct: s.questions_correct || 0,
    attempted: s.questions_attempted || 0,
    isEnglish: false,
    icon: s.session_type === 'blitz' ? Zap : s.session_type === 'challenge' ? Sparkles : BookOpen,
  }));

  const normalizedEnglish = englishSessions.filter(s => s.status === 'completed').map(s => ({
    id: s.id,
    date: parseSafeDate(s.start_time || s.created_date || s.updated_date),
    type: 'english',
    title: `English ${s.session_type || 'practice'}`,
    correct: s.questions_correct || 0,
    attempted: s.questions_attempted || 0,
    isEnglish: true,
    icon: PenTool,
  }));

  const normalizedAssignments = assignments.filter(a => a.status === 'completed').map(a => ({
    id: a.id,
    date: parseSafeDate(a.completed_at || a.created_date || a.updated_date),
    type: 'assignment',
    title: `Assignment: ${a.assignment?.title || 'Practice'}`,
    score: a.score,
    isEnglish: a.assignment?.assignment_config?.subject === 'english',
    icon: Target,
  }));

  function parseSafeDate(d) {
    if (!d) return new Date(0);
    let parsed = new Date(d);
    if (typeof d === 'string' && !d.endsWith('Z') && d.includes('T')) {
      parsed = new Date(d + 'Z');
    }
    return parsed;
  }

  // Concept nodes (Knowledge Graph mastery) are tracked passively 
  // and shouldn't appear as distinct 'Study Plan' activities in the feed.
  
  const allActivity = [
    ...normalizedMath,
    ...normalizedEnglish,
    ...normalizedAssignments
  ]
    .filter(a => a.date <= new Date(Date.now() + 5 * 60000)) // allow 5 mins clock skew
    .sort((a, b) => b.date - a.date)
    .slice(0, 3);

  if (!allActivity.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider font-display">Recent Activity</p>
        <Link 
          to={createPageUrl('StudyInsights')} 
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {allActivity.map((activity) => {
          const isEnglish = activity.isEnglish;
          const Icon = activity.icon;
          const timeAgo = formatDistanceToNow(activity.date, { addSuffix: true });

          let pctDisplay = null;
          let subtitle = '';

          if (activity.type === 'math' || activity.type === 'english') {
            const pct = activity.attempted ? Math.round((activity.correct / activity.attempted) * 100) : 0;
            subtitle = `${activity.correct}/${activity.attempted} correct`;
            pctDisplay = <span className={`text-sm font-display font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{pct}%</span>;
          } else if (activity.type === 'assignment') {
            subtitle = 'Completed';
            if (activity.score !== undefined && activity.score !== null) {
              pctDisplay = <span className={`text-sm font-display font-bold ${activity.score >= 70 ? 'text-emerald-600' : activity.score >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{activity.score}%</span>;
            } else {
              pctDisplay = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            }
          }

          return (
            <div 
              key={activity.id} 
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-100 hover:border-emerald-200 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${isEnglish ? 'bg-teal-100' : 'bg-emerald-100'} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${isEnglish ? 'text-teal-600' : 'text-emerald-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-800 capitalize truncate">{activity.title}</p>
                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo} · {subtitle}
                </p>
              </div>
              {pctDisplay}
            </div>
          );
        })}
      </div>
    </div>
  );
}
