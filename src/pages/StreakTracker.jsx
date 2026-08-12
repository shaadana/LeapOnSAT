import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Flame, Snowflake, Trophy, Calendar, Bell, BellOff, Star, Zap, Target, Lock } from 'lucide-react';
import { format, subDays } from 'date-fns';

const BASE_MILESTONES = [
  { days: 3,   label: 'Seedling',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { days: 7,   label: 'On Fire',   color: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  { days: 14,  label: 'Rising',    color: 'bg-stone-200 text-stone-800 border-stone-300' },
  { days: 30,  label: 'Champion',  color: 'bg-stone-300 text-stone-900 border-stone-400' },
  { days: 60,  label: 'Expert',    color: 'bg-emerald-600 text-white border-emerald-700' },
  { days: 100, label: 'Legend',    color: 'bg-stone-800 text-white border-stone-900' },
];

// Personalize milestone targets based on EF profile
function getMilestones(userProfile) {
  const ef = userProfile?.executive_functioning;
  if (!ef) return BASE_MILESTONES;
  const ti = (ef.task_initiation || 10) / 21;
  const gdp = (ef.goal_directed_persistence || 10) / 21;
  // Struggling students get easier early milestones to build momentum
  if (ti < 0.5 && gdp < 0.5) {
    return [
      { days: 2,  label: 'First Step',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { days: 5,  label: 'Getting It',  color: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
      { days: 10, label: 'Momentum',    color: 'bg-stone-200 text-stone-800 border-stone-300' },
      { days: 21, label: 'Habit Built', color: 'bg-stone-300 text-stone-900 border-stone-400' },
      { days: 45, label: 'Champion',    color: 'bg-emerald-600 text-white border-emerald-700' },
      { days: 90, label: 'Legend',      color: 'bg-stone-800 text-white border-stone-900' },
    ];
  }
  return BASE_MILESTONES;
}

function getMilestone(streak, milestones) {
  return [...milestones].reverse().find(m => streak >= m.days) || null;
}

function getNextMilestone(streak, milestones) {
  return milestones.find(m => streak < m.days) || null;
}

export default function StreakTracker() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();


  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: streaks = [], isLoading } = useQuery({
    queryKey: ['streaks', user?.id],
    queryFn: () => base44.entities.StudyStreak.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: profileData = [] } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['studyHabits', user?.id],
    queryFn: () => base44.entities.StudyHabit.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const streak = streaks[0];
  const userProfile = profileData[0];
  const MILESTONES = getMilestones(userProfile);

  const freezeMutation = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const used = streak?.streak_freezes_used || [];
      await base44.entities.StudyStreak.update(streak.id, {
        streak_freezes_used: [...used, today],
        streak_freezes_available: Math.max(0, (streak?.streak_freezes_available ?? 2) - 1),
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['streaks', user?.id]),
  });

  const toggleReminder = useMutation({
    mutationFn: async () => {
      await base44.entities.StudyStreak.update(streak.id, {
        reminders_enabled: !streak?.reminders_enabled,
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['streaks', user?.id]),
  });

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const freezesAvailable = streak?.streak_freezes_available ?? 2;
  const milestone = getMilestone(currentStreak, MILESTONES);
  const nextMilestone = getNextMilestone(currentStreak, MILESTONES);
  const activeHabits = habits.filter(h => h.status === 'active');
  const activityLog = streak?.activity_log || [];
  const totalStudyDays = streak?.total_study_days || 0;

  // Last 35 days for heatmap
  const heatmapDays = Array.from({ length: 35 }, (_, i) => {
    const d = subDays(new Date(), 34 - i);
    const key = format(d, 'yyyy-MM-dd');
    const entry = activityLog.find(a => a.date === key);
    const frozen = (streak?.streak_freezes_used || []).includes(key);
    return { date: d, key, studied: entry?.studied, frozen, questions: entry?.questions_answered || 0 };
  });

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!streak) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
          <Flame className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">No streak data yet</h2>
        <p className="text-stone-500">Complete a practice session to start your streak!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0"
          >
            <Flame className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-white">{currentStreak}-Day Streak</h1>
            <p className="text-white/80 text-sm mt-1">
              {milestone ? `${milestone.label} — ` : ''}
              Longest: {longestStreak} days · {totalStudyDays} total study days
            </p>
          </div>
          <div className="sm:ml-auto flex gap-3">
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{currentStreak}</div>
              <div className="text-xs text-white/80">Current</div>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{longestStreak}</div>
              <div className="text-xs text-white/80">Best</div>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{freezesAvailable}</div>
              <div className="text-xs text-white/80">Freezes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Next milestone */}
        {nextMilestone && (
          <Card className="border-4 border-white rounded-3xl shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-500" /> Next Milestone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl">{nextMilestone.emoji}</span>
                <div>
                  <p className="font-bold text-stone-800">{nextMilestone.label}</p>
                  <p className="text-sm text-stone-500">{nextMilestone.days - currentStreak} more days to go</p>
                </div>
              </div>
              <Progress value={(currentStreak / nextMilestone.days) * 100} className="h-3" />
              <p className="text-xs text-stone-400 mt-1 text-right">{currentStreak}/{nextMilestone.days} days</p>
            </CardContent>
          </Card>
        )}

        {/* Earned milestones */}
        <Card className="border-4 border-white rounded-3xl shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600" /> Badges Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MILESTONES.map(m => {
                const earned = longestStreak >= m.days;
                return (
                  <div
                    key={m.days}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      earned ? m.color : 'bg-stone-100 text-stone-400 border-stone-200'
                    }`}
                  >
                    {!earned && <Lock className="w-3 h-3" />}
                    <span>{m.label}</span>
                    <span className="text-xs opacity-70">{m.days}d</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Card className="border-4 border-white rounded-3xl shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" /> Last 35 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs text-stone-400 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {/* Pad to start on correct day */}
            {Array.from({ length: heatmapDays[0].date.getDay() }, (_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {heatmapDays.map(day => {
              let bg = 'bg-stone-100';
              let title = format(day.date, 'MMM d') + ' — No activity';
              if (day.studied) { bg = 'bg-emerald-500'; title = format(day.date, 'MMM d') + ` — Studied (${day.questions} questions)`; }
              else if (day.frozen) { bg = 'bg-stone-400'; title = format(day.date, 'MMM d') + ' — Streak frozen'; }
              return (
                <div
                  key={day.key}
                  title={title}
                  className={`aspect-square rounded-lg ${bg} cursor-default transition-transform hover:scale-110`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { color: 'bg-emerald-500', label: 'Studied' },
              { color: 'bg-stone-400', label: 'Frozen' },
              { color: 'bg-stone-100', label: 'No activity' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-sm ${color}`} />
                <span className="text-xs text-stone-400">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Streak Freeze */}
        <Card className="border-4 border-white rounded-3xl shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-stone-500" /> Streak Freeze
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-500">Use a freeze to protect your streak on a day you can't study.</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center ${i < freezesAvailable ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-300'}`}>
                    <Snowflake className="w-4 h-4" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-stone-500">{freezesAvailable} remaining</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-stone-300 text-stone-600 hover:bg-stone-50 rounded-full"
              onClick={() => freezeMutation.mutate()}
              disabled={freezesAvailable === 0 || freezeMutation.isPending}
            >
              <Snowflake className="w-3 h-3 mr-1" /> Use Freeze Today
            </Button>
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card className="border-4 border-white rounded-3xl shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-500" /> Study Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-500">
              {streak?.reminders_enabled ? 'Daily reminders are enabled.' : 'Enable reminders to stay on track.'}
            </p>
            <div className="text-sm text-stone-600">
              Reminder time: <strong>{streak?.reminder_time || '20:00'}</strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`rounded-full ${streak?.reminders_enabled ? 'border-stone-300 text-stone-600 hover:bg-stone-50' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}
              onClick={() => toggleReminder.mutate()}
              disabled={toggleReminder.isPending}
            >
              {streak?.reminders_enabled ? <><BellOff className="w-3 h-3 mr-1" /> Turn Off</> : <><Bell className="w-3 h-3 mr-1" /> Turn On</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
