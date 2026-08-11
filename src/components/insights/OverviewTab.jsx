import { BookOpen, Clock, Calendar, TrendingUp, Brain } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import SATPerformancePanel from '@/components/dashboard/SATPerformancePanel';
import EnglishPerformancePanel from '@/components/dashboard/EnglishPerformancePanel';
import { StatCard, SectionCard } from './InsightCards';

/**
 * Overview tab — summary stats, SAT/English performance panels, and diagnostic history.
 * Uses ALL sessions (unfiltered) so totals reflect the student's complete activity.
 */
export default function OverviewTab({ sessions, mathSessions, englishSessions, userProfile, conceptNodes, streakData }) {
  const totalMinutes = sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const avgSessionMins = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;
  const last7Sessions = sessions.filter(s => {
    try { return parseISO(s.start_time) >= subDays(new Date(), 7); } catch { return false; }
  });

  // Diagnostic history
  const diagSessions = sessions.filter(s => (s.session_type === 'diagnostic' || s.session_type === 'supplemental_diagnostic') && s.status === 'completed');
  const hasLegacyMathDiag = userProfile?.sat_performance?.last_diagnostic_date && mathSessions.filter(s => s.session_type === 'diagnostic').length === 0;
  const hasLegacyEnglishDiag = userProfile?.english_performance?.last_session_date && englishSessions.filter(s => s.session_type === 'diagnostic').length === 0;
  const hasDiagnostics = diagSessions.length > 0 || hasLegacyMathDiag || hasLegacyEnglishDiag;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen className="w-5 h-5 text-emerald-600" />} label="Total Sessions" value={sessions.length} sub="all time" color="bg-emerald-50" />
        <StatCard icon={<Clock className="w-5 h-5 text-stone-600" />} label="Avg Session" value={`${avgSessionMins}m`} sub="per session" color="bg-stone-50" />
        <StatCard icon={<Calendar className="w-5 h-5 text-stone-600" />} label="This Week" value={last7Sessions.length} sub="sessions in 7 days" color="bg-stone-50" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-orange-600" />} label="Current Streak" value={`${streakData?.current_streak || 0}d`} sub="consecutive days" color="bg-orange-50" />
      </div>

      {/* Academic Performance Profile */}
      <div className="grid md:grid-cols-2 gap-4">
        <SATPerformancePanel satPerformance={userProfile?.sat_performance} conceptNodes={conceptNodes} sessions={mathSessions} />
        <EnglishPerformancePanel englishPerformance={userProfile?.english_performance} englishSessions={englishSessions} />
      </div>

      {/* Diagnostic History */}
      {hasDiagnostics && (
        <SectionCard title="Diagnostic History" icon={<Brain className="w-5 h-5 text-stone-500" />}>
          <p className="text-xs text-gray-400 mb-4">All previous diagnostic attempts</p>
          <div className="space-y-3">
            {hasLegacyMathDiag && (
              <div className="flex items-center justify-between p-3 rounded-xl border bg-emerald-50 border-emerald-100">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">SAT Math Diagnostic</p>
                  <p className="text-xs text-emerald-700">{new Date(userProfile.sat_performance.last_diagnostic_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-800">{userProfile.sat_performance.diagnostic_accuracy}%</p>
                  <p className="text-xs text-emerald-600">Accuracy</p>
                </div>
              </div>
            )}
            {hasLegacyEnglishDiag && (
              <div className="flex items-center justify-between p-3 rounded-xl border bg-stone-50 border-stone-100">
                <div>
                  <p className="text-sm font-semibold text-stone-900">SAT English Diagnostic</p>
                  <p className="text-xs text-stone-700">{new Date(userProfile.english_performance.last_session_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-stone-800">{userProfile.english_performance.diagnostic_accuracy}%</p>
                  <p className="text-xs text-stone-600">Accuracy</p>
                </div>
              </div>
            )}
            {diagSessions.map(s => {
              const acc = s.performance_summary?.accuracy_percentage ?? (s.questions_attempted > 0 ? Math.round((s.questions_correct / s.questions_attempted) * 100) : 0);
              const isEnglish = s.session_type === 'diagnostic' && s.domains_covered?.some(d => ['apostrophes', 'semicolons_periods', 'vocabulary', 'reading_comprehension'].includes(d));
              let label = isEnglish ? 'SAT English Diagnostic' : (s.session_type === 'diagnostic' ? 'SAT Math Diagnostic' : 'Supplemental Diagnostic');
              if (s.performance_summary?.supplemental_level) label += ` (Level ${s.performance_summary.supplemental_level})`;
              return (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${isEnglish ? 'bg-stone-50 border-stone-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div>
                    <p className={`text-sm font-semibold ${isEnglish ? 'text-stone-900' : 'text-emerald-900'}`}>{label}</p>
                    <p className={`text-xs ${isEnglish ? 'text-stone-700' : 'text-emerald-700'}`}>{s.start_time ? format(parseISO(s.start_time), 'MMM d, yyyy') : '—'}</p>
                    <p className={`text-xs ${isEnglish ? 'text-stone-600' : 'text-emerald-600'} mt-0.5`}>
                      {s.duration_minutes || 0} min total · {Math.round(s.performance_summary?.avg_time_per_question || 0)}s avg/Q
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isEnglish ? 'text-stone-800' : 'text-emerald-800'}`}>{acc}%</p>
                    <p className={`text-xs ${isEnglish ? 'text-stone-600' : 'text-emerald-600'}`}>{s.questions_correct}/{s.questions_attempted} Correct</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
