import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import CoachChat from '@/components/student/CoachChat';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Target, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Coach() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.user_type === 'teacher') {
          navigate(createPageUrl('TeacherPortal'));
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">Your Personal Coach</h1>
            <p className="text-white/80 text-sm">Get personalized support to build habits, stay motivated, and reach your goals</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CoachChat user={user} />
        </div>
        
        <div className="space-y-4">
          <Card className="bg-white border-4 border-emerald-200 rounded-3xl shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display text-stone-900">Your Coach Can:</h3>
              </div>
              <ul className="space-y-2 text-sm text-stone-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Help you design tiny study habits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Track your habits and celebrate wins</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Review your practice patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Troubleshoot study challenges</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Keep you motivated and accountable</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-4 border-stone-200 rounded-3xl shadow-xl">
            <CardContent className="p-4">
              <h3 className="font-display text-stone-900 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-stone-600" />
                Try Asking:
              </h3>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                  "Help me build a habit to practice SAT daily"
                </div>
                <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                  "I'm struggling to stay focused - any tips?"
                </div>
                <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                  "How am I doing on my habits this week?"
                </div>
                <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                  "I feel unmotivated to study today"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
