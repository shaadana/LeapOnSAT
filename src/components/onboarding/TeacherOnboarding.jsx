import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Users, Target, Sparkles, MessageSquare, CheckCircle } from 'lucide-react';

const SLIDES = [
  {
    id: 'welcome',
    icon: Sparkles,
    iconBg: 'bg-stone-700',
    title: 'Welcome, Educator!',
    subtitle: 'LeapOn gives you powerful tools to support your students with SAT prep, executive functioning, and mentor mindset techniques.',
    bullets: [
      'Create classes and invite students with a join code',
      'Assign SAT practice, diagnostics, and lessons',
      'Track individual and class-wide progress',
    ],
  },
  {
    id: 'classes',
    icon: Users,
    iconBg: 'bg-blue-600',
    title: 'Manage Your Classes',
    subtitle: 'Create classes, generate join codes, and organize your students. You can assign targeted practice and monitor results in real time.',
    bullets: [
      'Create unlimited classes with unique join codes',
      'View each student\'s diagnostic results and practice history',
      'Send announcements and private messages',
    ],
  },
  {
    id: 'tools',
    icon: MessageSquare,
    iconBg: 'bg-purple-600',
    title: 'Educator Tools',
    subtitle: 'Access the Co-Mentor AI, practice mentor mindset scenarios, generate parent/student messages, and issue custom rewards.',
    bullets: [
      'Co-Mentor AI for personalized student advice',
      'Practice difficult conversations with roleplay scenarios',
      'Custom badges and coin rewards for your students',
    ],
  },
  {
    id: 'ready',
    icon: Target,
    iconBg: 'bg-emerald-600',
    title: "You're Ready!",
    subtitle: 'Head to your Teacher Portal to create your first class and start supporting your students.',
    bullets: [
      'Create your first class from the Classes tab',
      'Share the join code with your students',
      'Assign diagnostics and practice sessions',
    ],
    isFinal: true,
  },
];

export default function TeacherOnboarding() {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;

  const handleFinish = () => {
    window.location.href = createPageUrl('TeacherPortal');
  };

  return (
    <div className="max-w-2xl w-full mx-auto">
      <div className="flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-stone-700' : i < step ? 'w-2 bg-stone-400' : 'w-2 bg-stone-300'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-2 border-stone-200 shadow-xl bg-white">
            <CardContent className="p-8 md:p-10 text-center">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl ${slide.iconBg} flex items-center justify-center shadow-lg`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl text-stone-900 mb-3">
                {slide.title}
              </h2>
              <p className="text-stone-600 leading-relaxed mb-6 max-w-md mx-auto">
                {slide.subtitle}
              </p>
              {slide.bullets && (
                <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
                  {slide.bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-stone-500 mt-0.5 flex-shrink-0" />
                      <span className="text-stone-700">{b}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center mt-6">
        <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="text-stone-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {slide.isFinal ? (
          <Button onClick={handleFinish} className="bg-stone-700 hover:bg-stone-800 text-white rounded-full px-8 py-3 text-lg font-bold">
            Go to Teacher Portal <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => setStep(s => s + 1)} className="bg-stone-700 hover:bg-stone-800 text-white rounded-full px-6">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
