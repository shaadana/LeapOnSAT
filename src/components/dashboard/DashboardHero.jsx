import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Brain, Target, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Compact hero greeting bar with diagnostic CTAs.
 */
export default function DashboardHero({ user, diagnosticCompleted }) {
  const firstName = (user?.name || user?.full_name)?.split(' ')[0] || 'Learner';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-4 md:p-5 overflow-hidden shadow-lg">
      {/* Decorative elements */}
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute top-2 right-16 text-white/15 text-2xl rotate-12 pointer-events-none select-none">✦</div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg shadow-lg -rotate-3 border border-white/25">
            👋
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-display font-bold text-white leading-tight">
              {greeting}, {firstName}!
            </h1>
            <p className="text-white/80 text-xs">Here's your study plan for today</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link to="/SATDiagnostic">
            <Button size="sm" className="bg-white/95 text-emerald-700 hover:bg-white rounded-full font-bold shadow-md text-xs h-8 px-3">
              <Target className="w-3.5 h-3.5 mr-1" /> Math
            </Button>
          </Link>
          <Link to={createPageUrl('SATEnglishDiagnostic')}>
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 rounded-full font-bold border border-white/30 text-xs h-8 px-3">
              <BookOpen className="w-3.5 h-3.5 mr-1" /> English
            </Button>
          </Link>
          {!diagnosticCompleted && (
            <Link to={createPageUrl('Diagnostic')}>
              <Button size="sm" className="bg-white/10 text-white hover:bg-white/20 rounded-full font-bold border border-white/20 text-xs h-8 px-3">
                <Brain className="w-3.5 h-3.5 mr-1" /> Profile
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
