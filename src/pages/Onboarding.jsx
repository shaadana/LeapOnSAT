import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, BookOpen, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import StudentOnboarding from '@/components/onboarding/StudentOnboarding';

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // If user already has a user_type, redirect to appropriate page
        if (userData.user_type === 'teacher') {
          navigate(createPageUrl('TeacherPortal'));
        } else if (userData.user_type === 'student') {
          navigate(createPageUrl('Dashboard'));
        } else if (userData.user_type === 'parent') {
          navigate(createPageUrl('ParentPortal'));
        } else {
          // Check if returning user with existing profile data
          const [studentProfiles, teacherProfiles, families] = await Promise.all([
            base44.entities.UserProfile.filter({ user_id: userData.id }),
            base44.entities.TeacherProfile.filter({ user_id: userData.id }),
            base44.entities.Family.filter({ parent_id: userData.id })
          ]);
          
          if (studentProfiles?.length > 0) {
            await base44.auth.updateMe({ user_type: 'student' });
            navigate(createPageUrl('Dashboard'));
          } else if (teacherProfiles?.length > 0) {
            await base44.auth.updateMe({ user_type: 'teacher' });
            navigate(createPageUrl('TeacherPortal'));
          } else if (families?.length > 0) {
            await base44.auth.updateMe({ user_type: 'parent' });
            navigate(createPageUrl('ParentPortal'));
          }
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const handleRoleSelection = async (userType) => {
    setIsLoading(true);
    try {
      await base44.auth.updateMe({ user_type: userType });
      
      // Teachers and parents go straight to their portal
      if (userType === 'teacher') {
        window.location.href = createPageUrl('TeacherPortal');
        return;
      }
      if (userType === 'parent') {
        window.location.href = createPageUrl('ParentPortal');
        return;
      }
      
      // Students get the onboarding slideshow
      setSelectedRole(userType);
      setUser(prev => ({ ...prev, user_type: userType }));
    } catch (error) {
      toast.error('Failed to update account type');
    }
    setIsLoading(false);
  };

  if (!user) return null;

  // After role is selected, show student onboarding slideshow
  if (selectedRole === 'student') return <OnboardingShell><StudentOnboarding /></OnboardingShell>;

  // Step 1: Role selection
  return (
    <OnboardingShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full mx-auto"
      >
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6871750ef0eaa31bd4c4ddf2/fb863b954_LeapOn_Official_Logo-removebg-preview.png"
              alt="LeapOn"
              className="h-16 w-auto"
            />
          </div>
          <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-5xl font-bold text-emerald-600 mb-3">
            Welcome to Leap Academy!
          </h1>
          <p className="text-xl text-stone-600">
            What's your role?
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {ROLES.map(role => (
            <motion.div key={role.type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card
                className={`cursor-pointer bg-white border-4 ${role.borderColor} shadow-2xl hover:shadow-3xl transition-all h-full hover:-translate-y-1`}
                onClick={() => !isLoading && handleRoleSelection(role.type)}
              >
                <CardContent className="p-8 text-center">
                  <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl ${role.iconBg} flex items-center justify-center shadow-lg`}>
                    <role.icon className="w-12 h-12 text-white" />
                  </div>
                  <h3 style={{ fontFamily: 'Righteous, sans-serif' }} className={`text-3xl ${role.titleColor} mb-3`}>{role.title}</h3>
                  <p className="text-stone-600 leading-relaxed mb-6">{role.description}</p>
                  <div className="space-y-2 text-sm text-stone-600 text-left">
                    {role.bullets.map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={role.checkColor}>✓</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {isLoading && (
          <div className="text-center mt-8">
            <p className="text-stone-600 font-semibold">Setting up your account...</p>
          </div>
        )}
      </motion.div>
    </OnboardingShell>
  );
}

function OnboardingShell({ children }) {
  return (
    <div className="min-h-screen bg-emerald-50/40 flex items-center justify-center p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');
      `}</style>
      {children}
    </div>
  );
}

const ROLES = [
  {
    type: 'teacher',
    icon: GraduationCap,
    iconBg: 'bg-stone-600',
    borderColor: 'border-stone-300',
    titleColor: 'text-stone-800',
    checkColor: 'text-stone-600',
    title: "I'm an Educator",
    description: 'Access tools to support your students, practice mentor mindset techniques, and help learners build executive functioning skills.',
    bullets: ['Create and manage classes', 'Practice mentor mindset scenarios', 'Track student progress'],
  },
  {
    type: 'student',
    icon: BookOpen,
    iconBg: 'bg-emerald-500',
    borderColor: 'border-emerald-300',
    titleColor: 'text-emerald-700',
    checkColor: 'text-emerald-600',
    title: "I'm a Student",
    description: 'Take the diagnostic, practice SAT math, build study habits, and develop executive functioning skills for success.',
    bullets: ['Personalized learning profile', 'SAT math practice sessions', 'Study habit builder'],
  },
  {
    type: 'parent',
    icon: Users,
    iconBg: 'bg-stone-500',
    borderColor: 'border-stone-300',
    titleColor: 'text-stone-700',
    checkColor: 'text-stone-500',
    title: "I'm a Parent",
    description: "Track your children's progress, manage family goals, and stay connected with their education journey.",
    bullets: ['Monitor family progress', 'Set household goals', 'Family chat & events'],
  },
];
