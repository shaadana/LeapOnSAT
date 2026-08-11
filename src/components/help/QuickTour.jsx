import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Home, Target, Brain, BookOpen, Sparkles, Users, Network, GraduationCap, MessageCircle, Theater, CalendarDays } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const STUDENT_STEPS = [
  {
    icon: Home,
    color: 'bg-emerald-500',
    title: 'Welcome to LeapOn! 👋',
    description: "LeapOn is your personalized SAT prep and learning platform. Let's get you set up in just a few steps.",
    highlight: null,
  },
  {
    icon: Target,
    color: 'bg-stone-600',
    title: 'SAT Math & English Practice',
    description: "Practice SAT Math and English with adaptive sessions. Choose Blitz (quick 5-min rounds), Class (structured 20-min), or Choice (pick your topics). The difficulty adapts as you improve.",
    highlight: '⚡ SAT Practice (top nav)',
  },
  {
    icon: Brain,
    color: 'bg-emerald-600',
    title: 'Track Your Progress',
    description: "Your Dashboard shows your stats, streaks, and recommendations. Take the SAT Diagnostic to map your strengths and gaps — the app uses it to personalize everything.",
    highlight: '🧠 Dashboard & Diagnostics',
  },
  {
    icon: GraduationCap,
    color: 'bg-emerald-700',
    title: 'Tell Us About You',
    description: 'Select your grade level and when you plan to take the SAT so we can tailor your experience.',
    highlight: null,
    isProfileSetup: true,
  },
  {
    icon: Users,
    color: 'bg-stone-600',
    title: 'Select Your Classes',
    description: 'Please confirm your class enrollment before starting.',
    highlight: null,
    isClassSelection: true,
  },
  {
    icon: Target,
    color: 'bg-emerald-600',
    title: "You're all set! 🚀",
    description: "Start with the SAT Math Diagnostic to unlock your personalized experience. Good luck — you've got this!",
    highlight: null,
    cta: 'Go to SAT Diagnostic',
    isDiagnosticRedirect: true,
  },
];

const PARENT_STEPS = [
  {
    icon: Home,
    color: 'bg-emerald-500',
    title: 'Welcome, Parent! 👋',
    description: "LeapOn helps you stay connected with your children's learning journey — from tracking SAT progress to building household goals and developing your own mentoring skills.",
    highlight: null,
  },
  {
    icon: Users,
    color: 'bg-emerald-600',
    title: 'Create a Family Group',
    description: "Go to Families to create your family group and get a join code. Share it with your children so they can join. Once connected, you can see their progress and send messages.",
    highlight: '👨‍👩‍👧 Families tab',
  },
  {
    icon: Target,
    color: 'bg-stone-600',
    title: 'Set Household Goals',
    description: "Use the Goals tab to create academic, behavioral, or responsibility goals for your children. Track progress over time and keep everyone accountable.",
    highlight: '🎯 Goals tab',
  },
  {
    icon: CalendarDays,
    color: 'bg-stone-700',
    title: 'Manage Family Events',
    description: "The Goals tab also includes Family Events — schedule reminders, appointments, and deadlines so your household stays organized and on track.",
    highlight: '📅 Goals tab → Events',
  },
  {
    icon: MessageCircle,
    color: 'bg-emerald-700',
    title: 'Family Coach AI',
    description: "The Coach tab gives you an AI-powered family coach. Ask for advice on supporting your child's motivation, study habits, or handling academic stress.",
    highlight: '🤖 Coach tab',
  },
  {
    icon: Sparkles,
    color: 'bg-emerald-500',
    title: 'Mentor Mindset Resources',
    description: "The Mentor tab provides research-backed strategies for supporting your child — high standards with high support. Explore tips tailored to your parenting style.",
    highlight: '✨ Mentor tab',
  },
  {
    icon: Theater,
    color: 'bg-stone-500',
    title: 'Practice Parenting Scenarios',
    description: "The Practice tab lets you roleplay challenging parent-child conversations (low motivation, test anxiety, etc.) and get AI feedback on your mentor-mindset approach.",
    highlight: '🎭 Practice tab',
  },
  {
    icon: Home,
    color: 'bg-emerald-600',
    title: "You're all set! 🚀",
    description: "Start by creating your family group and inviting your children. Then explore the Coach and Mentor tabs for personalized parenting support.",
    highlight: null,
    cta: 'Go to My Families',
  },
];

const TEACHER_STEPS = [
  {
    icon: Home,
    color: 'bg-emerald-500',
    title: 'Welcome, Teacher! 👋',
    description: "LeapOn gives you a full toolkit to support your students with personalized SAT prep and mentor-mindset coaching. Here's a quick tour.",
    highlight: null,
  },
  {
    icon: Users,
    color: 'bg-stone-600',
    title: 'Create & Manage Classes',
    description: "Go to Classes → My Classes to create a class. Share the join code with your students so they can enroll. You can then assign work and monitor their progress.",
    highlight: '👥 Classes → My Classes',
  },
  {
    icon: Target,
    color: 'bg-emerald-600',
    title: 'Assign Practice',
    description: "Use Classes → Assignments to create SAT practice sessions, diagnostics, or independent study tasks for your students. Track their completion and scores.",
    highlight: '📋 Classes → Assignments',
  },
  {
    icon: Sparkles,
    color: 'bg-emerald-700',
    title: 'CoMentor AI',
    description: "The CoMentor (Tools → Co-Mentor) is your AI teaching assistant. Get strategies for supporting specific students, lesson ideas, and mentor-mindset coaching advice.",
    highlight: '🤖 Tools → Co-Mentor',
  },
  {
    icon: Brain,
    color: 'bg-stone-700',
    title: 'Practice Scenarios',
    description: "Tools → Practice Scenarios lets you roleplay tricky student interactions (low motivation, resistance, etc.) and get AI feedback on your mentor-mindset approach.",
    highlight: '🎭 Tools → Practice Scenarios',
  },
  {
    icon: Home,
    color: 'bg-emerald-600',
    title: "You're ready! 🚀",
    description: "Start by creating a class and inviting your students. Then explore the CoMentor for personalized teaching support.",
    highlight: null,
    cta: 'Go to My Classes',
  },
];

export default function QuickTour({ userType = 'student', onClose }) {
  const steps = userType === 'teacher' ? TEACHER_STEPS : userType === 'parent' ? PARENT_STEPS : STUDENT_STEPS;
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const navigate = useNavigate();
  const [classSelectionDone, setClassSelectionDone] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [gradeLevel, setGradeLevel] = useState('');
  const [satDate, setSatDate] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className={`${current.color} p-8 relative flex flex-col items-center text-white text-center`}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="Close tour"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold leading-tight">{current.title}</h2>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed text-center">{current.description}</p>

          {current.highlight && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-center">
              <span className="text-sm font-semibold text-emerald-700">{current.highlight}</span>
            </div>
          )}

          {current.isProfileSetup && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">Grade Level <span className="text-red-500">*</span></label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {['8th', '9th', '10th', '11th', '12th', 'Gap Year / Other'].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">Target SAT Date <span className="text-red-500">*</span></label>
                <Input
                  type="date"
                  value={satDate === 'N/A' ? '' : satDate}
                  onChange={(e) => setSatDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
                <button
                  type="button"
                  onClick={() => setSatDate(satDate === 'N/A' ? '' : 'N/A')}
                  className={`mt-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${satDate === 'N/A' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                >
                  {satDate === 'N/A' ? '✓ No date set' : "I don't have a date yet"}
                </button>
              </div>
            </div>
          )}

          {current.isClassSelection && (
            <div className="space-y-3 bg-stone-50 border border-stone-200 p-4 rounded-xl text-sm">
              <div className="flex items-center space-x-3 opacity-80">
                <Checkbox id="class-leapon" checked disabled />
                <label
                  htmlFor="class-leapon"
                  className="font-medium text-stone-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  LeapOn Test Teacher
                </label>
              </div>
              <div className="flex items-center space-x-3 opacity-80">
                <Checkbox id="class-sat" checked disabled />
                <label
                  htmlFor="class-sat"
                  className="font-medium text-stone-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  SAT MATH
                </label>
              </div>
              <p className="text-xs text-stone-500 pt-2 border-t border-stone-200">
                These classes are required and auto-selected.
              </p>
            </div>
          )}

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pt-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                disabled={(current.isClassSelection && !classSelectionDone && i > step) || (current.isProfileSetup && !profileSaved && i > step)}
                className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-emerald-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'} ${((current.isClassSelection && !classSelectionDone && i > step) || (current.isProfileSetup && !profileSaved && i > step)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            ))}
          </div>

          {/* Nav */}
          <div className="flex gap-3 pt-1">
            {step > 0 && !current.isClassSelection && !current.isProfileSetup && (
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="flex-1 rounded-full border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <Button
              onClick={async () => {
                if (current.isProfileSetup) {
                  if (!gradeLevel || !satDate) return;
                  try {
                    const user = await base44.auth.me();
                    if (user) {
                      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
                      const profileData = {
                        grade_level: gradeLevel,
                        sat_target_date: satDate === 'N/A' ? undefined : satDate,
                      };
                      if (profiles.length > 0) {
                        await base44.entities.UserProfile.update(profiles[0].id, profileData);
                      } else {
                        await base44.entities.UserProfile.create({ user_id: user.id, ...profileData });
                      }
                    }
                  } catch (e) {
                    console.error('Failed to save profile', e);
                  }
                  setProfileSaved(true);
                  setStep(s => s + 1);
                } else if (current.isClassSelection) {
                  setIsEnrolling(true);
                  try {
                    const user = await base44.auth.me();
                    if (user) {
                      // 1. Enroll by known join codes
                      const knownCodes = ['MOWVJA'];
                      for (const code of knownCodes) {
                        try {
                          const [classData] = await base44.entities.TeacherClass.filter({ join_code: code });
                          if (classData && !classData.student_ids?.includes(user.id)) {
                            await base44.entities.TeacherClass.update(classData.id, {
                              student_ids: [...(classData.student_ids || []), user.id]
                            });
                          }
                        } catch (err) {
                          console.error(`Failed to enroll by code ${code}`, err);
                        }
                      }

                      // 2. Enroll by names via getJoinableClasses (case-insensitive)
                      const res = await base44.functions.invoke('getJoinableClasses');
                      const availableClasses = res.data.classes || [];
                      const targetNamesLower = ['leapon test teacher', 'sat math'];
                      
                      for (const c of availableClasses) {
                        if (c.class_name && targetNamesLower.includes(c.class_name.toLowerCase())) {
                          if (c.join_code && !knownCodes.includes(c.join_code)) {
                            try {
                              const [classData] = await base44.entities.TeacherClass.filter({ join_code: c.join_code });
                              if (classData && !classData.student_ids?.includes(user.id)) {
                                await base44.entities.TeacherClass.update(classData.id, {
                                  student_ids: [...(classData.student_ids || []), user.id]
                                });
                              }
                            } catch (err) {
                              console.error(`Failed to enroll by name ${c.class_name}`, err);
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error('Failed to auto-enroll', e);
                  } finally {
                    setIsEnrolling(false);
                  }
                  
                  setClassSelectionDone(true);
                  setStep(s => s + 1);
                } else if (current.isDiagnosticRedirect) {
                  navigate(createPageUrl('SATDiagnostic') + '?start=true');
                  onClose();
                } else {
                  isLast ? onClose() : setStep(s => s + 1);
                }
              }}
              disabled={isEnrolling || (current.isProfileSetup && (!gradeLevel || !satDate))}
              className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {current.isProfileSetup ? 'Save & Continue' : current.isClassSelection ? 'Confirm Selection' : current.isDiagnosticRedirect ? (current.cta || 'Done') : isLast ? (current.cta || 'Done') : (<>Next <ArrowRight className="w-4 h-4 ml-1" /></>)}
            </Button>
          </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
