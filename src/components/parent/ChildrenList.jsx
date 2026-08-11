import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Target, Brain } from 'lucide-react';

export default function ChildrenList({ familyData, onBack, onViewProfile }) {
  const { data: children = [] } = useQuery({
    queryKey: ['familyChildren', familyData.id],
    queryFn: async () => {
      if (!familyData.child_ids || familyData.child_ids.length === 0) return [];
      const childrenData = await Promise.all(
        familyData.child_ids.map(async (childId) => {
          try {
            const profiles = await base44.entities.UserProfile.filter({ user_id: childId });
            const profile = profiles[0];
            // UserProfile contains the linked user info via user_id
            return { userId: childId, profile };
          } catch (e) {
            return null;
          }
        })
      );
      return childrenData.filter(c => c && c.profile);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" size="icon" className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-display font-bold text-stone-900">{familyData.family_name}</h2>
          <p className="text-stone-600">{children.length} children</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Card className="border-dashed border-4 border-stone-300 rounded-3xl shadow-lg">
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-2 font-medium">No children yet</p>
            <p className="text-sm text-stone-500">Share the join code <span className="font-bold text-emerald-600">{familyData.join_code}</span> with your children</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
           {children.map(({ userId, profile }) => (
             <Card key={userId} className="border-4 border-white hover:shadow-2xl transition-all rounded-3xl bg-white shadow-xl">
               <CardHeader>
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                     <User className="w-6 h-6 text-emerald-600" />
                   </div>
                   <div className="flex-1">
                    <CardTitle className="text-lg font-display font-bold text-stone-900">
                      {(profile?.name || profile?.full_name) || 'Student'}
                    </CardTitle>
                    <p className="text-xs text-stone-500">ID: {userId.slice(0, 8)}</p>
                   </div>
                   {(profile?.sat_performance?.overall_level || profile?.english_performance?.overall_level) && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600 uppercase">Proficiency</p>
                      <p className="text-sm text-stone-800 capitalize">
                        {profile?.sat_performance?.overall_level || profile?.english_performance?.overall_level}
                      </p>
                    </div>
                   )}
                   </div>
                   </CardHeader>
                   <CardContent className="space-y-3">
                   <div className="grid grid-cols-2 gap-2 mb-3">
                     <div className="bg-stone-50 p-2 rounded-lg border border-stone-200 text-center">
                       <p className="text-xs text-stone-500">Math Accuracy</p>
                       <p className="text-lg font-bold text-stone-700">{profile?.sat_performance?.diagnostic_accuracy != null ? `${profile.sat_performance.diagnostic_accuracy}%` : '—'}</p>
                     </div>
                     <div className="bg-stone-50 p-2 rounded-lg border border-stone-200 text-center">
                       <p className="text-xs text-stone-500">English Accuracy</p>
                       <p className="text-lg font-bold text-stone-700">{profile?.english_performance?.diagnostic_accuracy != null ? `${profile.english_performance.diagnostic_accuracy}%` : '—'}</p>
                     </div>
                   </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border-2 border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-semibold text-emerald-900">Strengths</p>
                      </div>
                      {profile?.strengths?.slice(0, 2).map((strength, idx) => (
                        <p key={idx} className="text-sm text-emerald-700">• {strength}</p>
                      ))}
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-amber-600" />
                        <p className="text-xs font-semibold text-amber-900">Growth Areas</p>
                      </div>
                      {profile?.growth_areas?.slice(0, 2).map((area, idx) => (
                        <p key={idx} className="text-sm text-amber-700">• {area}</p>
                      ))}
                    </div>
                  {onViewProfile && (
                  <Button 
                    onClick={() => onViewProfile(userId)}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                  >
                    View Full Profile
                  </Button>
                  )}
                  </CardContent>
                  </Card>
                  ))}
                  </div>
                  )}
    </div>
  );
}
