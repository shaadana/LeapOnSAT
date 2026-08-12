import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import HeroSection from '@/components/landing/HeroSection';
import StatsBar from '@/components/landing/StatsBar';
import ProblemSection from '@/components/landing/ProblemSection';
import TutoringProtocol from '@/components/landing/TutoringProtocol';
import ScienceSection from '@/components/landing/ScienceSection';
import ForStudentsSection from '@/components/landing/ForStudentsSection';
import ForParentsSection from '@/components/landing/ForParentsSection';
import StudentFeelSection from '@/components/landing/StudentFeelSection';
import TutorPromiseSection from '@/components/landing/TutorPromiseSection';
import QualityCheckSection from '@/components/landing/QualityCheckSection';
import CtaFooter from '@/components/landing/CtaFooter';

export default function LandingPage() {
  const { data: stats } = useQuery({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPlatformStats', {});
      return res.data;
    },
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-emerald-50/40">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Righteous', sans-serif; }
      `}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-100">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6871750ef0eaa31bd4c4ddf2/fb863b954_LeapOn_Official_Logo-removebg-preview.png"
              alt="LeapOn"
              className="h-9 w-auto"
            />
            <span className="text-xl font-display font-bold text-emerald-700">LeapOn</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm">
            {[
              { label: 'How It Works', href: '#tutoring' },
              { label: 'Science', href: '#science' },
              { label: 'Students', href: '#students' },
              { label: 'Parents', href: '#parents' },
              { label: 'Tutors', href: '#tutors' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-5 font-bold text-xs"
          >
            Get Started
          </Button>
        </div>
      </nav>

      <main>
        <HeroSection />
        <StatsBar stats={stats} />
        <ProblemSection />
        <TutoringProtocol />
        <ScienceSection />
        <ForStudentsSection />
        <ForParentsSection />
        <StudentFeelSection />
        <TutorPromiseSection />
        <QualityCheckSection />
        <CtaFooter />
      </main>
    </div>
  );
}
