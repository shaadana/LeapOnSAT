import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, Settings, Check, X, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, isSameDay } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Compact sidebar widget: streak badge, daily goal progress, and mini heatmap.
 * Designed to sit in a narrow right column beside the study plan.
 */
export default function StreakSidebar({ user, currentStreak }) {
  const queryClient = useQueryClient();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  // Subscribe to real-time streak updates so counter refreshes when goal is met
  useEffect(() => {
    const unsubscribe = base44.entities.StudyStreak.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['studyStreak', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recentSessionsHeatmap', user?.id] });
    });
    return unsubscribe;
  }, [user?.id, queryClient]);

  const { data: streakRecords } = useQuery({
    queryKey: ['studyStreak', user?.id],
    queryFn: () => base44.entities.StudyStreak.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });
  const liveStreak = streakRecords?.[0]?.current_streak ?? currentStreak;

  const { data: gamificationProfiles } = useQuery({
    queryKey: ['gamificationProfile', user?.id],
    queryFn: () => base44.entities.GamificationProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const profile = gamificationProfiles?.[0];
  const goalMinutes = profile?.preferences?.daily_practice_goal_minutes || 15;

  const { data: recentSessions } = useQuery({
    queryKey: ['recentSessionsHeatmap', user?.id],
    queryFn: async () => {
      const [math, english] = await Promise.all([
        base44.entities.PracticeSession.filter({ user_id: user?.id }, '-start_time', 200),
        base44.entities.EnglishPracticeSession.filter({ user_id: user?.id }, '-start_time', 200)
      ]);
      return [...math, ...english].sort((a, b) => new Date(b.start_time || b.created_date) - new Date(a.start_time || a.created_date));
    },
    enabled: !!user?.id,
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (minutes) => {
      if (profile) {
        const updatedPrefs = { ...(profile.preferences || {}), daily_practice_goal_minutes: minutes };
        await base44.entities.GamificationProfile.update(profile.id, { preferences: updatedPrefs });
      } else {
        await base44.entities.GamificationProfile.create({
          user_id: user.id,
          preferences: { daily_practice_goal_minutes: minutes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user?.id] });
      setIsEditingGoal(false);
    }
  });

  const sessions = recentSessions || [];
  const today = new Date();

  const todayMinutes = useMemo(() => {
    return sessions
      .filter(s => isSameDay(new Date(s.start_time || s.created_date), today))
      .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  }, [sessions, today]);

  const heatmapData = useMemo(() => {
    const data = [];
    for (let i = 59; i >= 0; i--) {
      const d = subDays(today, i);
      const minutes = sessions
        .filter(s => isSameDay(new Date(s.start_time || s.created_date), d))
        .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
      data.push({ date: d, minutes });
    }
    return data;
  }, [sessions, today]);

  const handleSaveGoal = () => {
    const parsed = parseInt(newGoal, 10);
    if (!isNaN(parsed) && parsed > 0) updateGoalMutation.mutate(parsed);
  };

  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  const getHeatmapColor = (minutes) => {
    if (minutes === 0) return 'bg-emerald-50 border border-emerald-100';
    if (minutes < goalMinutes * 0.3) return 'bg-emerald-200';
    if (minutes < goalMinutes * 0.7) return 'bg-emerald-400';
    if (minutes < goalMinutes) return 'bg-emerald-500';
    return 'bg-emerald-700';
  };

  return (
    <div className="space-y-4">
      {/* Streak badge */}
      <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200/60 rounded-2xl p-4 text-center overflow-hidden">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-100/40 rounded-full pointer-events-none" />
        <div className="relative">
          <Flame className={`w-10 h-10 mx-auto mb-1 ${liveStreak > 0 ? 'text-orange-500 fill-orange-400' : 'text-stone-300'}`} />
          <div className="text-3xl font-display font-bold text-orange-600 leading-none">{liveStreak}</div>
          <div className="text-[10px] uppercase font-bold text-orange-400 tracking-widest mt-0.5">Day Streak</div>
        </div>
      </div>

      {/* Daily goal */}
      <div className="relative bg-white border-2 border-emerald-100 rounded-2xl p-4 overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-50 rounded-full pointer-events-none" />
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-stone-700 font-display">Daily Goal</span>
            </div>
            {!isEditingGoal ? (
              <button
                onClick={() => { setNewGoal(goalMinutes.toString()); setIsEditingGoal(true); }}
                className="text-[10px] text-stone-400 hover:text-emerald-600 transition-colors"
              >
                <Settings className="w-3 h-3" />
              </button>
            ) : (
              <div className="flex items-center gap-0.5">
                <Input type="number" value={newGoal} onChange={e => setNewGoal(e.target.value)} className="w-12 h-6 text-xs px-1" autoFocus />
                <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={handleSaveGoal} disabled={updateGoalMutation.isPending}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-stone-400" onClick={() => setIsEditingGoal(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-600 leading-none">{Math.round(todayMinutes)}</span>
            <span className="text-sm text-stone-400 font-medium">/ {goalMinutes} min</span>
          </div>

          <div className="relative">
            <Progress value={progressPercent} className="h-3 rounded-full bg-emerald-50" indicatorClassName="bg-emerald-500" />
            {progressPercent >= 100 && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-2 -right-1 bg-yellow-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm rotate-6"
              >
                🎉 Done!
              </motion.div>
            )}
          </div>
          <p className="text-[11px] text-stone-400 leading-tight">
            {progressPercent >= 100
              ? "You've hit your goal today!"
              : `${goalMinutes - Math.round(todayMinutes)} min left`}
          </p>
        </div>
      </div>

      {/* Mini heatmap */}
      <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[11px] font-bold text-stone-500 font-display">60-Day Activity</span>
        </div>
        <div className="grid grid-cols-10 gap-[3px]">
          {heatmapData.map((day, i) => (
            <div
              key={i}
              title={`${format(day.date, 'MMM d')}: ${Math.round(day.minutes)} min`}
              className={`aspect-square rounded-[3px] ${getHeatmapColor(day.minutes)} hover:ring-1 hover:ring-emerald-400 transition-all`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 text-[9px] text-stone-400">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-50 border border-emerald-100" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-700" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
