import React, { useState, useEffect } from 'react';
import QuickTour from '@/components/help/QuickTour';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Users, Target, Sparkles, Theater, Brain, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MyFamilies from '../components/parent/MyFamilies';
import HouseholdGoals from '../components/parent/HouseholdGoals';
import FamilyEvents from '../components/parent/FamilyEvents';
import ParentMentorshipHelper from '../components/parent/ParentMentorshipHelper';
import ParentPracticeScenarios from '../components/parent/ParentPracticeScenarios';
import ParentMindsetDisplay from '../components/parent/ParentMindsetDisplay';
import FamilyCoach from '../components/parent/FamilyCoach';

export default function ParentPortal() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('families');
  const [showTour, setShowTour] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.user_type !== 'parent') {
          navigate(createPageUrl('Dashboard'));
          return;
        }
        // Show tour only once — persisted in localStorage per user
        const tourKey = `tour_shown_${userData.id}`;
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
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['families', 'goals', 'mentorship'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);



  const { data: families = [] } = useQuery({
    queryKey: ['parentFamilies', user?.id],
    queryFn: () => base44.entities.Family.filter({ parent_id: user?.id }),
    enabled: !!user?.id,
  });

  if (!user) return null;

  return (
    <>
    {showTour && <QuickTour userType="parent" onClose={() => setShowTour(false)} />}
    <div className="max-w-7xl mx-auto space-y-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-600 border-4 border-white rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-10 h-10 text-white" />
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl md:text-4xl font-bold text-white">
              Parent Portal
            </h1>
          </div>
          <p className="text-white/90 text-lg">
            Welcome, {user.name || user.full_name}! Support your children's learning journey.
          </p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="families" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Families</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Goals</span>
          </TabsTrigger>
          <TabsTrigger value="coach" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Coach</span>
          </TabsTrigger>
          <TabsTrigger value="mentorship" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Mentor</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <Theater className="w-4 h-4" />
            <span className="hidden sm:inline">Practice</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="families" className="space-y-6">
          <MyFamilies user={user} families={families} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <HouseholdGoals user={user} families={families} />
          <FamilyEvents user={user} families={families} />
        </TabsContent>

        <TabsContent value="coach" className="space-y-6">
          <FamilyCoach />
        </TabsContent>

        <TabsContent value="mentorship" className="space-y-6">
          <div className="space-y-6">
            <ParentMentorshipHelper families={families} />
            <ParentMindsetDisplay user={user} />
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <ParentPracticeScenarios />
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
