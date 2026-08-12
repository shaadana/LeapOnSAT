import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle } from 'lucide-react';

import QuickTour from '@/components/help/QuickTour';
import DashboardHero from '@/components/dashboard/DashboardHero';

import DailyStudyPlan from '@/components/dashboard/DailyStudyPlan';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import StreakSidebar from '@/components/dashboard/StreakSidebar';


export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.user_type === 'teacher') { navigate(createPageUrl('TeacherPortal')); return; }
        if (userData.user_type === 'parent') { navigate(createPageUrl('ParentPortal')); return; }
        if (userData.user_type === 'student' || !userData.user_type) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: userData.id });
          if (profiles[0]) {
            const updated = [...(profiles[0].login_history || []), new Date().toISOString()].slice(-30);
            await base44.entities.UserProfile.update(profiles[0].id, { login_history: updated });
          }
        }
      } catch (e) { base44.auth.redirectToLogin(); }
    };
    loadUser();
  }, [navigate]);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: recentSessions = [] } = useQuery({
    queryKey: ['recentSessions', user?.id],
    queryFn: () => base44.entities.PracticeSession.filter({ user_id: user?.id }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const { data: englishSessions = [] } = useQuery({
    queryKey: ['englishSessions', user?.id],
    queryFn: () => base44.entities.EnglishPracticeSession.filter({ user_id: user?.id }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['studentAssignments', user?.id],
    queryFn: async () => {
      const progs = await base44.entities.StudentAssignmentProgress.filter({ student_id: user?.id, status: 'completed' }, '-completed_at', 10);
      if (!progs.length) return [];
      const assignmentIds = [...new Set(progs.map(p => p.assignment_id))];
      // We could fetch them one by one or in chunk if there are many, since it's an 'in' array we'll just do a loop or get all assignments
      const assignmentsObj = {};
      for (const id of assignmentIds) {
         try {
           const a = await base44.entities.Assignment.get(id);
           if (a) assignmentsObj[id] = a;
         } catch(e) {}
      }
      return progs.map(p => ({ ...p, assignment: assignmentsObj[p.assignment_id] })).filter(p => p.assignment);
    },
    enabled: !!user?.id,
  });

  // conceptNodes query removed as they are passive knowledge graph nodes

  const { data: streakData = [] } = useQuery({
    queryKey: ['studyStreak', user?.id],
    queryFn: () => base44.entities.StudyStreak.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });


  const userProfile = profile?.[0];
  const diagnosticCompleted = userProfile?.diagnostic_completed;
  const currentStreak = streakData?.[0]?.current_streak || 0;

  return (
    <>
      {showTour && <QuickTour userType="student" onClose={() => setShowTour(false)} />}
      <div className="space-y-5">

        {/* Compact hero greeting */}
        <DashboardHero user={user} diagnosticCompleted={diagnosticCompleted} />

        {/* Two-column layout: main feed + streak sidebar */}
        <div className="grid lg:grid-cols-[1fr_260px] gap-5 items-start">

          {/* ─── LEFT COLUMN: Study Plan → Assignments → Recent Activity ─── */}
          <div className="space-y-5 min-w-0">

            {/* Study plan — THE central focus */}
            <div className="bg-white border-2 border-emerald-100 rounded-2xl shadow-sm p-5 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-emerald-50/60 rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-teal-50/40 rounded-full pointer-events-none" />
              <div className="relative">
                <DailyStudyPlan
                  userProfile={userProfile}
                  mathSessions={recentSessions}
                  englishSessions={englishSessions}
                  diagnosticCompleted={diagnosticCompleted}
                  userId={user?.id}
                />
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-white border-2 border-emerald-100 rounded-2xl shadow-sm p-4">
              <RecentActivityFeed
                mathSessions={recentSessions}
                englishSessions={englishSessions}
                assignments={assignments}
              />
            </div>


          </div>

          {/* ─── RIGHT COLUMN: Streak & Progress sidebar ─── */}
          <div className="hidden lg:block sticky top-28">
            <StreakSidebar user={user} currentStreak={currentStreak} />

            {/* Tour link */}
            {!showTour && (
              <button
                onClick={() => setShowTour(true)}
                className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-emerald-600 transition-colors mt-4 mx-auto"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Guided tour
              </button>
            )}
          </div>

        </div>

        {/* Mobile-only: streak widget below main feed */}
        <div className="lg:hidden">
          <StreakSidebar user={user} currentStreak={currentStreak} />
        </div>

      </div>
    </>
  );
}
