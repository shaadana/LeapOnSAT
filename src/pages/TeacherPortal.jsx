import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, Theater, GraduationCap, Sparkles, Target } from 'lucide-react';
import { motion } from 'framer-motion';

import QuickTour from '@/components/help/QuickTour';
import MyClasses from '@/components/teacher/MyClasses';
import AssignmentManager from '@/components/teacher/AssignmentManager';
import MessageGenerator from '@/components/teacher/MessageGenerator';
import PracticeScenarios from '@/components/teacher/PracticeScenarios';
import CoMentor from '@/components/teacher/CoMentor';
import CustomRewards from '@/components/teacher/CustomRewards';
import TeacherCalendar from '@/components/teacher/TeacherCalendar';
import SessionSummaryManager from '@/components/teacher/SessionSummaryManager';

export default function TeacherPortal() {
  const [user, setUser] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'classes');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        
        // Redirect students to their dashboard
        if (userData.user_type === 'student') {
          navigate(createPageUrl('Dashboard'));
          return;
        }
        
        setUser(userData);
        // Show tour only once for teachers — persisted in localStorage per user
        const tourKey = `tour_shown_teacher_${userData.id}`;
        if (!localStorage.getItem(tourKey)) {
          localStorage.setItem(tourKey, 'true');
          setShowTour(true);
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    const tab = urlParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [window.location.search]);

  const { data: classes } = useQuery({
    queryKey: ['teacherClasses', user?.id],
    queryFn: () => base44.entities.TeacherClass.filter({ teacher_id: user?.id }),
    enabled: !!user?.id,
  });

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {showTour && <QuickTour userType="teacher" onClose={() => setShowTour(false)} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-10 h-10 text-white" />
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl md:text-4xl font-bold text-white">
              Teacher Portal
            </h1>
          </div>
          <p className="text-white/90 text-lg">
            Welcome, {user.name || user.full_name}! Access your teaching tools and support your students.
          </p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {activeTab === 'classes' && <MyClasses user={user} classes={classes || []} />}
        {activeTab === 'assignments' && <AssignmentManager user={user} classes={classes || []} />}
        {activeTab === 'generator' && <MessageGenerator user={user} classes={classes || []} />}
        {activeTab === 'scenarios' && <PracticeScenarios user={user} />}
        {activeTab === 'comentor' && <CoMentor user={user} classes={classes || []} />}
        {activeTab === 'rewards' && <CustomRewards user={user} classes={classes || []} />}
        {activeTab === 'calendar' && <TeacherCalendar user={user} classes={classes || []} />}
        {activeTab === 'sessions' && <SessionSummaryManager user={user} classes={classes || []} />}
      </div>
    </div>
  );
}
