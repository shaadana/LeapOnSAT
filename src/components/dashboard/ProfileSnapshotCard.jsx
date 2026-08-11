import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Brain, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Compact profile snapshot — strengths, SAT level, grade & target date.
 * Includes whimsical decoration in the corner.
 */
export default function ProfileSnapshotCard({ userProfile, diagnosticCompleted }) {
  return (
    <div className="bg-white border-2 border-emerald-100 rounded-3xl shadow-sm p-4 relative overflow-hidden">
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-emerald-50 rounded-full pointer-events-none" />
      <div className="relative">
        {!diagnosticCompleted ? (
          <div className="text-center py-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 mx-auto mb-2 flex items-center justify-center -rotate-6 border-2 border-emerald-200">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-stone-600 text-xs mb-3">Complete your Learner's Profile for personalized insights</p>
            <Link to={createPageUrl('Diagnostic')}>
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full rounded-full shadow">
                Build My Profile
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider font-display">My Profile</p>
            {userProfile?.strengths?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {userProfile.strengths.slice(0, 3).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">{s}</span>
                ))}
              </div>
            )}
            {userProfile?.sat_performance?.overall_level && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-2 py-1 border border-emerald-100">
                🎯 SAT level: <strong className="capitalize">{userProfile.sat_performance.overall_level}</strong>
              </p>
            )}
            {(userProfile?.grade_level || userProfile?.sat_target_date) && (
              <div className="flex gap-1 flex-wrap">
                {userProfile.grade_level && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs">🎓 {userProfile.grade_level}</span>
                )}
                {userProfile.sat_target_date && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs">
                    📅 {new Date(userProfile.sat_target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
            <Link to={createPageUrl('Profile')}>
              <Button variant="outline" size="sm" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full text-xs mt-1">
                Full Profile <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
