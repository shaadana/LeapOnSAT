import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Brain, Heart, Target, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function ParentProfile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.user_type !== 'parent') {
          navigate(createPageUrl('Dashboard'));
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const { data: profile } = useQuery({
    queryKey: ['parentProfile', user?.id],
    queryFn: () => base44.entities.ParentProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const parentProfile = profile?.[0];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('ParentPortal'))}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-600">Understand your parenting style and growth areas</p>
        </div>
      </div>

      {!parentProfile?.diagnostic_completed ? (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-8 text-center">
            <Brain className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Parenting Profile</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Take our quick quiz to understand your parenting style and get personalized tips.
            </p>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              Build My Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="style">Parenting Style</TabsTrigger>
            <TabsTrigger value="mindset">Growth Mindset</TabsTrigger>
            <TabsTrigger value="stress">Stress Coping</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Primary Style</p>
                      <p className="text-lg font-bold text-gray-900 capitalize">
                        {parentProfile?.parenting_style?.primary_style || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Supportive Parenting</p>
                      <p className="text-lg font-bold text-gray-900">
                        {parentProfile?.growth_mindset?.mentor_mindset_score || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Stress Level</p>
                      <p className="text-lg font-bold text-gray-900 capitalize">
                        {parentProfile?.stress_coping?.overall_stress_level || 'Moderate'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Growth Areas */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-stone-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parentProfile?.strengths?.length > 0 ? (
                    <div className="space-y-2">
                      {parentProfile.strengths.map((strength, i) => (
                        <div key={i} className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-sm text-emerald-900">{strength}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Complete diagnostic to see strengths</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-stone-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-600" />
                    Growth Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parentProfile?.growth_areas?.length > 0 ? (
                    <div className="space-y-2">
                      {parentProfile.growth_areas.map((area, i) => (
                        <div key={i} className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-900">{area}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Complete diagnostic to see growth areas</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Personalized Advice */}
            {parentProfile?.personalized_advice && (
              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader>
                  <CardTitle className="text-lg">Personalized Advice</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{parentProfile.personalized_advice}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Parenting Style */}
          <TabsContent value="style" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>Your Parenting Style</CardTitle>
                <CardDescription>Understanding how you approach parenting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {parentProfile?.parenting_style && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Authoritative</span>
                        <span className="text-sm text-gray-600">{parentProfile.parenting_style.authoritative_score || 0}%</span>
                      </div>
                      <Progress value={parentProfile.parenting_style.authoritative_score || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">High warmth and high control - setting boundaries with support</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Authoritarian</span>
                        <span className="text-sm text-gray-600">{parentProfile.parenting_style.authoritarian_score || 0}%</span>
                      </div>
                      <Progress value={parentProfile.parenting_style.authoritarian_score || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">High control, low warmth - strict rules with less emotional connection</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Permissive</span>
                        <span className="text-sm text-gray-600">{parentProfile.parenting_style.permissive_score || 0}%</span>
                      </div>
                      <Progress value={parentProfile.parenting_style.permissive_score || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">High warmth, low control - supportive with fewer boundaries</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Uninvolved</span>
                        <span className="text-sm text-gray-600">{parentProfile.parenting_style.uninvolved_score || 0}%</span>
                      </div>
                      <Progress value={parentProfile.parenting_style.uninvolved_score || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">Low warmth, low control - detached approach</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Growth Mindset */}
          <TabsContent value="mindset" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>Mindset & Support Style</CardTitle>
                <CardDescription>How you view growth and support your children</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {parentProfile?.growth_mindset && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Growth Mindset</span>
                        <span className="text-sm text-gray-600">{parentProfile.growth_mindset.growth_mindset_score || 0}%</span>
                      </div>
                      <Progress value={parentProfile.growth_mindset.growth_mindset_score || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">Belief that abilities can be developed through effort</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Supportive Parenting</span>
                        <span className="text-sm text-gray-600">{parentProfile.growth_mindset.mentor_mindset_score || 0}%</span>
                      </div>
                      <Progress value={parentProfile.growth_mindset.mentor_mindset_score || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">High expectations with genuine support — the ideal balance</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">High Expectations Only</span>
                        <span className="text-sm text-gray-600">{parentProfile.growth_mindset.enforcer_tendencies || 0}%</span>
                      </div>
                      <Progress value={parentProfile.growth_mindset.enforcer_tendencies || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">Pushing hard without enough guidance or warmth</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Overprotective</span>
                        <span className="text-sm text-gray-600">{parentProfile.growth_mindset.protector_tendencies || 0}%</span>
                      </div>
                      <Progress value={parentProfile.growth_mindset.protector_tendencies || 0} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">Very supportive but may shield from healthy challenges</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stress Coping */}
          <TabsContent value="stress" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>Stress & Coping Strategies</CardTitle>
                <CardDescription>Understanding your stress levels and how you cope</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {parentProfile?.stress_coping && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Overall Stress Level</span>
                        <span className="text-sm text-gray-600">{parentProfile.stress_coping.overall_stress_level || 0}/10</span>
                      </div>
                      <Progress value={(parentProfile.stress_coping.overall_stress_level || 0) * 10} className="h-2" />
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 mb-3">Coping Ability</p>
                      <p className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-sm font-semibold capitalize">
                        {parentProfile.stress_coping.coping_ability || 'Not assessed'}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 mb-3">Burnout Risk</p>
                      <div className={`px-3 py-1 rounded-full inline-block text-sm font-semibold ${
                        parentProfile.stress_coping.burnout_risk === 'high' ? 'bg-red-100 text-red-900' :
                        parentProfile.stress_coping.burnout_risk === 'moderate' ? 'bg-yellow-100 text-yellow-900' :
                        'bg-emerald-100 text-emerald-900'
                      }`}>
                        {parentProfile.stress_coping.burnout_risk || 'Not assessed'}
                      </div>
                    </div>

                    {parentProfile.stress_coping.primary_stressors?.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Primary Stressors</p>
                        <div className="space-y-2">
                          {parentProfile.stress_coping.primary_stressors.map((stressor, i) => (
                            <div key={i} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                              <p className="text-sm text-orange-900">{stressor}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {parentProfile.stress_coping.coping_strategies?.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Coping Strategies</p>
                        <div className="space-y-2">
                          {parentProfile.stress_coping.coping_strategies.map((strategy, i) => (
                            <div key={i} className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-sm text-emerald-900">{strategy}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}
