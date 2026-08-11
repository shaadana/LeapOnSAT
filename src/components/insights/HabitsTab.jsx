import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { Calendar, Clock, TrendingUp, Target, Brain } from 'lucide-react';
import { format, parseISO, subDays, startOfDay, endOfDay, isWithinInterval, getDay, getHours } from 'date-fns';
import { SectionCard } from './InsightCards';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EF_LABELS = {
  task_initiation: 'Task Init.',
  sustained_attention: 'Sustained Attn.',
  time_management: 'Time Mgmt.',
  goal_directed_persistence: 'Goal Persist.',
  planning_prioritization: 'Planning',
  working_memory: 'Working Mem.',
  organization: 'Organization',
  flexibility: 'Flexibility',
  metacognition: 'Metacognition',
  emotional_control: 'Emotional Ctrl.',
  response_inhibition: 'Response Inhib.',
  stress_tolerance: 'Stress Toler.'
};
const MONTHS_BACK = 13;

/**
 * Study Habits tab — weekly consistency, peak hours, 3-month progress trend,
 * activity heatmap, and executive functioning radar. `sessions` is already subject-filtered.
 */
export default function HabitsTab({ sessions, streakData, userProfile }) {
  // Weekly consistency: sessions per day of week (last 90 days)
  const weeklyData = (() => {
    const counts = DAYS.map((d) => ({ day: d, sessions: 0, minutes: 0 }));
    const cutoff = subDays(new Date(), 90);
    sessions.forEach(s => {
      if (!s.start_time) return;
      try {
        const d = parseISO(s.start_time);
        if (d >= cutoff) {
          const idx = getDay(d);
          counts[idx].sessions += 1;
          counts[idx].minutes += s.duration_minutes || 0;
        }
      } catch (_) {}
    });
    return counts;
  })();

  // Peak study hours
  const peakHoursData = (() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h < 12 ? `${h === 0 ? 12 : h}am` : `${h === 12 ? 12 : h - 12}pm`,
      sessions: 0
    }));
    sessions.forEach(s => {
      if (!s.start_time) return;
      try { hours[getHours(parseISO(s.start_time))].sessions += 1; } catch (_) {}
    });
    return hours.filter((_, i) => i >= 6 && i <= 23);
  })();

  // Long-term trend: weekly minutes over last ~13 weeks
  const trendData = (() => {
    const now = new Date();
    const weeks = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const weekStart = startOfDay(subDays(now, i * 7));
      const weekEnd = endOfDay(subDays(now, (i - 1) * 7));
      const label = format(weekStart, 'MMM d');
      let mins = 0, count = 0;
      sessions.forEach(s => {
        if (!s.start_time) return;
        try {
          const d = parseISO(s.start_time);
          if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
            mins += s.duration_minutes || 0;
            count++;
          }
        } catch (_) {}
      });
      weeks.push({ week: label, minutes: mins, sessions: count });
    }
    return weeks;
  })();

  const streakActivityMap = (() => {
    const map = {};
    (streakData?.activity_log || []).forEach(d => { map[d.date] = d; });
    return map;
  })();

  const heatmapDays = Array.from({ length: 91 }, (_, i) => {
    const d = subDays(new Date(), 90 - i);
    const key = format(d, 'yyyy-MM-dd');
    const entry = streakActivityMap[key];
    const frozen = streakData?.streak_freezes_used?.includes(key);
    return { date: d, key, studied: entry?.studied, frozen, label: format(d, 'MMM d') };
  });

  const peakDay = weeklyData.reduce((a, b) => b.sessions > a.sessions ? b : a, weeklyData[0]);
  const peakHour = peakHoursData.reduce((a, b) => b.sessions > a.sessions ? b : a, peakHoursData[0]);

  return (
    <div className="space-y-6">
      {/* Weekly Consistency */}
      <SectionCard title="Weekly Study Consistency" icon={<Calendar className="w-5 h-5 text-emerald-500" />}>
        <p className="text-xs text-gray-400 mb-4">Sessions per day of week — last 90 days</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(val, name) => [val, name === 'sessions' ? 'Sessions' : 'Minutes']} />
            <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
              {weeklyData.map((entry, i) => (<Cell key={i} fill={entry.day === peakDay.day ? '#10b981' : '#d1fae5'} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {peakDay.sessions > 0 && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            📈 Most active on <span className="font-semibold text-emerald-600">{peakDay.day}s</span> with {peakDay.sessions} sessions
          </p>
        )}
      </SectionCard>

      {/* Peak Study Hours */}
      <SectionCard title="Peak Study Hours" icon={<Clock className="w-5 h-5 text-stone-500" />}>
        <p className="text-xs text-gray-400 mb-4">When you study most throughout the day</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={peakHoursData} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(val) => [val, 'Sessions']} />
            <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
              {peakHoursData.map((entry, i) => (<Cell key={i} fill={entry.hour === peakHour.hour && peakHour.sessions > 0 ? '#10b981' : '#d1fae5'} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {peakHour.sessions > 0 && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            ⏰ Peak study time: <span className="font-semibold text-emerald-600">{peakHour.hour}</span>
          </p>
        )}
      </SectionCard>

      {/* Long-Term Progress Trend */}
      <SectionCard title="Progress Trend — Last 3 Months" icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}>
        <p className="text-xs text-gray-400 mb-4">Weekly study minutes over time</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(val, name) => [name === 'minutes' ? `${val} min` : val, name === 'minutes' ? 'Study Time' : 'Sessions']} />
            <Area type="monotone" dataKey="minutes" stroke="#10b981" strokeWidth={2.5} fill="url(#trendGradient)" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Activity Heatmap */}
      <SectionCard title="Activity Heatmap" icon={<Target className="w-5 h-5 text-orange-500" />}>
        <p className="text-xs text-gray-400 mb-4">Last 13 weeks of study activity</p>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {Array.from({ length: 13 }, (_, wk) => (
              <div key={wk} className="flex flex-col gap-1">
                {Array.from({ length: 7 }, (_, d) => {
                  const idx = wk * 7 + d;
                  const day = heatmapDays[idx];
                  if (!day) return <div key={d} className="w-4 h-4" />;
                  const bg = day.studied ? 'bg-emerald-500' : day.frozen ? 'bg-stone-400' : 'bg-gray-100';
                  return (
                    <div key={d} title={`${day.label}${day.studied ? ' — Studied ✓' : day.frozen ? ' — Frozen ❄️' : ' — No activity'}`}
                      className={`w-4 h-4 rounded-sm ${bg} cursor-default transition-all hover:scale-125`} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            { color: 'bg-emerald-500', label: 'Studied' },
            { color: 'bg-stone-400', label: 'Streak Frozen' },
            { color: 'bg-gray-100', label: 'No activity' }
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded-sm ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Executive Functioning Profile */}
      {userProfile?.executive_functioning && (() => {
        const ef = userProfile.executive_functioning;
        const radarData = Object.entries(EF_LABELS)
          .filter(([k]) => ef[k] != null)
          .map(([k, label]) => ({ skill: label, score: ef[k], fullMark: 21 }));
        if (!radarData.length) return null;
        const sorted = [...radarData].sort((a, b) => a.score - b.score);
        const weakest = sorted[0];
        const strongest = sorted[sorted.length - 1];
        return (
          <SectionCard title="Executive Functioning Profile" icon={<Brain className="w-5 h-5 text-amber-500" />}>
            <p className="text-xs text-gray-400 mb-4">Scores range 3–21 per skill. Lower = growth opportunity.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <Radar name="EF Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 self-center">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Growth Area</div>
                  <div className="font-semibold text-gray-800">{weakest.skill}</div>
                  <div className="text-xs text-gray-500">Score: {weakest.score}/21 — Streak milestones are personalized for this.</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Strongest Skill</div>
                  <div className="font-semibold text-gray-800">{strongest.skill}</div>
                  <div className="text-xs text-gray-500">Score: {strongest.score}/21 — A key asset to leverage.</div>
                </div>
                <div className="space-y-2">
                  {sorted.map(({ skill, score }) => (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0 truncate">{skill}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${score <= 10 ? 'bg-red-400' : score <= 15 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${(score / 21) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-6 text-right">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        );
      })()}
    </div>
  );
}
