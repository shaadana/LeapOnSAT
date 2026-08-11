import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Users, Heart, BarChart3, CheckCircle, Sparkles } from 'lucide-react';

const SLIDES = [
  {
    id: 'welcome',
    icon: Sparkles,
    iconBg: 'bg-stone-500',
    title: 'Welcome, Parent!',
    subtitle: 'LeapOn helps you stay connected to your child\'s education journey and support their growth.',
    bullets: [
      'Create a family and invite your children',
      'Monitor study progress and practice results',
      'Set household goals and celebrate milestones',
    ],
  },
  {
    id: 'family',
    icon: Users,
    iconBg: 'bg-blue-500',
    title: 'Set Up Your Family',
    subtitle: 'Create a family group and share a join code with your children so you can track their progress together.',
    bullets: [
      'Create a family with a unique join code',
      'Your children join from their student accounts',
      'View their practice sessions and diagnostic results',
    ],
  },
  {
    id: 'support',
    icon: Heart,
    iconBg: 'bg-rose-500',
    title: 'Support Their Journey',
    subtitle: 'Access coaching tips, set family events, and use the Family Coach AI to get advice on supporting your child\'s learning.',
    bullets: [
      'Family Coach AI for personalized guidance',
      'Set goals and track progress together',
      'Family chat and event planning',
    ],
  },
  {
    id: 'ready',
    icon: BarChart3,
    iconBg: 'bg-emerald-500',
    title: "You're All Set!",
    subtitle: 'Head to your Parent Portal to create your family and start tracking your child\'s progress.',
    bullets: [
      'Create your family from the Families tab',
      'Share the join code with your children',
      'Check in on their study streaks and scores',
    ],
    isFinal: true,
  },
];

export default function ParentOnboarding() {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;

  const handleFinish = () => {
    window.location.href = createPageUrl('ParentPortal');
  };

  return (
    <div className="max-w-2xl w-full mx-auto">
      <div className="flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-stone-500' : i < step ? 'w-2 bg-stone-400' : 'w-2 bg-stone-300'
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
                      <CheckCircle className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
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
          <Button onClick={handleFinish} className="bg-stone-600 hover:bg-stone-700 text-white rounded-full px-8 py-3 text-lg font-bold">
            Go to Parent Portal <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => setStep(s => s + 1)} className="bg-stone-600 hover:bg-stone-700 text-white rounded-full px-6">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
