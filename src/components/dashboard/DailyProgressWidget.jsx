import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, Settings, Check, X, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, isSameDay } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DailyProgressWidget({ user, currentStreak }) {
  const queryClient = useQueryClient();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  // Fetch gamification profile to get preferences
  const { data: gamificationProfiles } = useQuery({
    queryKey: ['gamificationProfile', user?.id],
    queryFn: () => base44.entities.GamificationProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });
  
  const profile = gamificationProfiles?.[0];
  const goalMinutes = profile?.preferences?.daily_practice_goal_minutes || 15;

  // We need to fetch MORE sessions to show the heatmap.
  // 90 days of sessions
  const { data: recentSessions } = useQuery({
    queryKey: ['recentSessionsHeatmap', user?.id],
    queryFn: async () => {
      // Need both math and english
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
      if (!profile) return;
      const updatedPrefs = { ...profile.preferences, daily_practice_goal_minutes: minutes };
      await base44.entities.GamificationProfile.update(profile.id, { preferences: updatedPrefs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user?.id] });
      setIsEditingGoal(false);
    }
  });

  const sessions = recentSessions || [];

  // Calculate today's minutes
  const today = new Date();
  const todayMinutes = useMemo(() => {
    return sessions
      .filter(s => {
        const date = new Date(s.start_time || s.created_date);
        return isSameDay(date, today);
      })
      .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  }, [sessions, today]);

  // Heatmap generation
  const heatmapDays = 90; // Last 90 days
  const heatmapData = useMemo(() => {
    const data = [];
    for (let i = heatmapDays - 1; i >= 0; i--) {
      const d = subDays(today, i);
      
      const daySessions = sessions.filter(s => {
        const date = new Date(s.start_time || s.created_date);
        return isSameDay(date, d);
      });
      
      const minutes = daySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
      data.push({ date: d, minutes });
    }
    return data;
  }, [sessions, today]);

  const handleSaveGoal = () => {
    const parsed = parseInt(newGoal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateGoalMutation.mutate(parsed);
    }
  };

  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  // Determine color intensity for heatmap square
  const getHeatmapColor = (minutes) => {
    if (minutes === 0) return 'bg-stone-100 border border-stone-200';
    if (minutes < goalMinutes * 0.3) return 'bg-emerald-200';
    if (minutes < goalMinutes * 0.7) return 'bg-emerald-400';
    if (minutes < goalMinutes) return 'bg-emerald-500';
    return 'bg-emerald-700';
  };

  return (
    <div className="bg-white border-2 border-emerald-100 rounded-3xl shadow-sm p-5 sm:p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
      
      <div className="flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Left column: Goal & Streak */}
        <div className="flex-1 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-stone-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" /> Daily Practice Goal
              </h2>
              <p className="text-sm text-stone-500">Track your progress and build a learning habit</p>
            </div>
            
            {/* Streak Badge */}
            <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm transform rotate-1">
              <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-stone-300'}`} />
              <div>
                <div className="text-xl font-bold text-orange-600 leading-none">{currentStreak}</div>
                <div className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Day Streak</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-emerald-600 leading-none">{Math.round(todayMinutes)}</span>
                <span className="text-lg text-stone-500 font-medium">/ {goalMinutes} min</span>
              </div>
              
              {!isEditingGoal ? (
                <button 
                  onClick={() => { setNewGoal(goalMinutes.toString()); setIsEditingGoal(true); }}
                  className="text-xs font-semibold text-stone-400 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                >
                  <Settings className="w-3 h-3" /> Edit Goal
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <Input 
                    type="number" 
                    value={newGoal} 
                    onChange={e => setNewGoal(e.target.value)} 
                    className="w-16 h-8 text-sm px-2"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={handleSaveGoal} disabled={updateGoalMutation.isPending}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:bg-stone-50" onClick={() => setIsEditingGoal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="relative mt-2">
              <Progress value={progressPercent} className="h-4 rounded-full bg-stone-100" indicatorClassName="bg-emerald-500" />
              {progressPercent >= 100 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-3 -right-2 bg-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm rotate-12"
                >
                  GOAL MET! 🎉
                </motion.div>
              )}
            </div>
            <p className="text-sm text-stone-500 font-medium pt-1">
              {progressPercent >= 100 
                ? "Awesome job! You've hit your daily goal!" 
                : `${goalMinutes - Math.round(todayMinutes)} minutes left to reach your goal.`}
            </p>
          </div>
        </div>

        {/* Right column: Heatmap */}
        <div className="md:w-64 lg:w-80 flex flex-col justify-end space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-4 h-4 text-stone-400" />
            <h3 className="text-sm font-bold text-stone-600">Activity History</h3>
          </div>
          
          <div className="flex flex-wrap gap-[3px]">
            {heatmapData.map((day, i) => (
              <div 
                key={i} 
                title={`${format(day.date, 'MMM d, yyyy')}: ${Math.round(day.minutes)} min`}
                className={`w-[14px] h-[14px] rounded-[3px] ${getHeatmapColor(day.minutes)} transition-colors hover:ring-2 hover:ring-offset-1 hover:ring-emerald-400`}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium mt-1">
            <span>90 days ago</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="w-3 h-3 rounded-[2px] bg-stone-100 border border-stone-200"></div>
              <div className="w-3 h-3 rounded-[2px] bg-emerald-200"></div>
              <div className="w-3 h-3 rounded-[2px] bg-emerald-400"></div>
              <div className="w-3 h-3 rounded-[2px] bg-emerald-500"></div>
              <div className="w-3 h-3 rounded-[2px] bg-emerald-700"></div>
              <span>More</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
