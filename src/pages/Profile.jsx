import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Brain, 
  Heart, 
  Flame, 
  Target, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  BarChart3,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import DetailedAdvice from '@/components/profile/DetailedAdvice';

const EF_SKILL_LABELS = {
  response_inhibition: "Response Inhibition",
  working_memory: "Working Memory",
  emotional_control: "Emotional Control",
  task_initiation: "Task Initiation",
  sustained_attention: "Sustained Attention",
  planning_prioritization: "Planning & Prioritization",
  organization: "Organization",
  time_management: "Time Management",
  flexibility: "Flexibility",
  metacognition: "Metacognition",
  goal_directed_persistence: "Goal-Directed Persistence",
  stress_tolerance: "Stress Tolerance"
};

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['allSessions', user?.id],
    queryFn: () => base44.entities.PracticeSession.filter({ user_id: user?.id }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const { data: habits } = useQuery({
    queryKey: ['allHabits', user?.id],
    queryFn: () => base44.entities.StudyHabit.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const userProfile = profile?.[0];
  const allSessions = sessions || [];
  const allHabits = habits || [];

  const completedSessions = allSessions.filter(s => s.status === 'completed');
  const totalQuestions = completedSessions.reduce((sum, s) => sum + (s.questions_attempted || 0), 0);
  const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.questions_correct || 0), 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const efScores = userProfile?.executive_functioning || {};
  const sortedEFSkills = Object.entries(efScores).sort((a, b) => b[1] - a[1]);
  const topStrengths = sortedEFSkills.slice(0, 3);
  const growthAreas = sortedEFSkills.slice(-3).reverse();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (!userProfile?.diagnostic_completed) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center">
          <Brain className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-4">Complete Your Diagnostic First</h1>
        <p className="text-gray-600 mb-6">
          To view your full profile with personalized insights, please complete the diagnostic assessment.
        </p>
        <Link to={createPageUrl('Diagnostic')}>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Start Diagnostic
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Profile Header */}
      <motion.div variants={itemVariants}>
        <Card className="bg-emerald-500 text-white border-4 border-white overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
                {(user?.name || user?.full_name)?.[0] || 'S'}
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">{user?.name || user?.full_name || 'Student'}</h1>
                <p className="text-emerald-100">{user?.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">{completedSessions.length} sessions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">{allHabits.filter(h => h.status === 'active').length} active habits</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_4px_20px_rgb(16,185,129,0.12)]">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{overallAccuracy}%</p>
            <p className="text-xs text-gray-500">Overall Accuracy</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-emerald-100">
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalCorrect}</p>
            <p className="text-xs text-gray-500">Questions Correct</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-emerald-100">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)}
            </p>
            <p className="text-xs text-gray-500">Minutes Practiced</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-emerald-100">
          <CardContent className="p-4 text-center">
            <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {allHabits.reduce((sum, h) => sum + (h.streak_count || 0), 0)}
            </p>
            <p className="text-xs text-gray-500">Total Streaks</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="executive" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-emerald-50">
            <TabsTrigger value="executive" className="data-[state=active]:bg-white">
              <Brain className="w-4 h-4 mr-2" />
              Executive Functions
            </TabsTrigger>
            <TabsTrigger value="mindset" className="data-[state=active]:bg-white">
              <Heart className="w-4 h-4 mr-2" />
              Mindset
            </TabsTrigger>
            <TabsTrigger value="motivation" className="data-[state=active]:bg-white">
              <Flame className="w-4 h-4 mr-2" />
              Motivation
            </TabsTrigger>
          </TabsList>

          {/* Executive Functioning Tab */}
          <TabsContent value="executive" className="space-y-6 mt-6">
            {/* Visual Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-emerald-800">
                    <BarChart3 className="w-5 h-5" />
                    Skills Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={Object.entries(efScores).map(([skill, score]) => ({
                      skill: EF_SKILL_LABELS[skill]?.split(' ')[0] || skill,
                      score: Math.round(score / 21 * 100),
                      fullScore: score
                    }))}>
                      <PolarGrid stroke="#d1d5db" />
                      <PolarAngleAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280' }} />
                      <Radar name="Your Scores" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-xl border-2 border-stone-200">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-stone-800">
                    <TrendingUp className="w-5 h-5" />
                    Strengths vs Growth Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sortedEFSkills.map(([skill, score]) => ({
                      name: EF_SKILL_LABELS[skill]?.split(' ').slice(0, 2).join(' ') || skill,
                      score: Math.round(score / 21 * 100)
                    }))}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                        {sortedEFSkills.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index < sortedEFSkills.length / 2 ? '#10b981' : '#78716c'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_4px_20px_rgb(16,185,129,0.12)]">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-emerald-800">
                    <TrendingUp className="w-5 h-5" />
                    Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topStrengths.map(([skill, score]) => (
                    <div key={skill}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{EF_SKILL_LABELS[skill]}</span>
                        <span className="font-medium text-emerald-600">{Math.round(score / 21 * 100)}%</span>
                      </div>
                      <Progress value={score / 21 * 100} className="h-2 bg-emerald-100" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Growth Areas */}
              <Card className="bg-white/70 backdrop-blur-xl border-2 border-stone-200 shadow-[0_4px_20px_rgb(120,113,108,0.12)]">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-stone-800">
                    <TrendingDown className="w-5 h-5" />
                    Growth Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {growthAreas.map(([skill, score]) => (
                    <div key={skill}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{EF_SKILL_LABELS[skill]}</span>
                        <span className="font-medium text-stone-700">{Math.round(score / 21 * 100)}%</span>
                      </div>
                      <Progress value={score / 21 * 100} className="h-2 bg-stone-100" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Advice Section */}
            <Card className="bg-gradient-to-br from-emerald-50 to-stone-50 border-2 border-emerald-200">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-emerald-900">
                  <Lightbulb className="w-5 h-5" />
                  Personalized Growth Plan
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Based on your diagnostic, here are specific strategies to strengthen your growth areas.
                </p>
              </CardHeader>
              <CardContent>
                <DetailedAdvice efScores={efScores} showFor="growth" />
              </CardContent>
            </Card>

            {/* All Skills */}
            <Card className="bg-white/80 backdrop-blur border-gray-100">
              <CardHeader>
                <CardTitle>All Executive Function Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedEFSkills.map(([skill, score]) => (
                    <div key={skill} className="p-3 rounded-xl bg-gray-50">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 text-xs">{EF_SKILL_LABELS[skill]}</span>
                        <span className="font-medium text-gray-600">{Math.round(score / 21 * 100)}%</span>
                      </div>
                      <Progress value={score / 21 * 100} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mindset Tab */}
          <TabsContent value="mindset" className="space-y-6 mt-6">
            <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_4px_20px_rgb(16,185,129,0.12)]">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-emerald-800">
                  <Heart className="w-5 h-5" />
                  Mindset Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-2">Mentor Mindset Score</p>
                    <p className="text-3xl font-bold text-emerald-800">
                      {userProfile?.mindset_appraisal?.mentor_mindset_score || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.mindset_appraisal?.mentor_mindset_score || 0} 
                      className="h-2 mt-2 bg-emerald-100" 
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <p className="text-sm text-gray-600 mb-2">Growth Mindset Score</p>
                    <p className="text-3xl font-bold text-stone-800">
                      {userProfile?.mindset_appraisal?.growth_mindset_score || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.mindset_appraisal?.growth_mindset_score || 0} 
                      className="h-2 mt-2 bg-stone-100" 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Enforcer Tendencies</p>
                    <p className="text-2xl font-bold text-red-700">
                      {userProfile?.mindset_appraisal?.enforcer_tendencies || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.mindset_appraisal?.enforcer_tendencies || 0} 
                      className="h-2 mt-2 bg-red-100" 
                    />
                    <p className="text-xs text-gray-600 mt-2">High standards without support - can lead to shame and disconnection</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Protector Tendencies</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {userProfile?.mindset_appraisal?.protector_tendencies || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.mindset_appraisal?.protector_tendencies || 0} 
                      className="h-2 mt-2 bg-amber-100" 
                    />
                    <p className="text-xs text-gray-600 mt-2">High support without standards - can limit growth potential</p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                  <h3 className="font-display font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Your Mindset Insights
                  </h3>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {userProfile?.mindset_appraisal?.mentor_mindset_score >= 70
                      ? "You demonstrate strong mentor mindset qualities - you balance high standards with strong support. This helps you embrace challenges while maintaining self-compassion. Keep using this approach when facing difficult work."
                      : userProfile?.mindset_appraisal?.mentor_mindset_score >= 50
                      ? "You're developing a balanced approach to challenges. When you face difficulty, remember that high expectations and self-support go hand-in-hand. Practice being both demanding and kind with yourself."
                      : "You may benefit from developing more balance between expectations and support. When things get tough, avoid being too harsh (Enforcer) or too easy (Protector). Instead, ask yourself: 'How can I maintain high standards while also supporting myself through this?'"}
                  </p>
                  {(userProfile?.mindset_appraisal?.enforcer_tendencies > 60) && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-red-200">
                      <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Watch for Enforcer Mode</p>
                      <p className="text-xs text-gray-600">You may be tough on yourself when struggling. Remember: high standards work better when paired with encouragement, not criticism.</p>
                    </div>
                  )}
                  {(userProfile?.mindset_appraisal?.protector_tendencies > 60) && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                      <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Watch for Protector Mode</p>
                      <p className="text-xs text-gray-600">You may lower expectations when things feel hard. Remember: you grow most when you maintain standards while supporting yourself through challenges.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Motivation Tab */}
          <TabsContent value="motivation" className="space-y-6 mt-6">
            <Card className="bg-white/70 backdrop-blur-xl border-2 border-stone-200 shadow-[0_4px_20px_rgb(120,113,108,0.12)]">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-stone-800">
                  <Flame className="w-5 h-5" />
                  Motivation Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">Intrinsic Motivation</p>
                    <p className="text-2xl font-bold text-emerald-800">
                      {userProfile?.motivation_assessment?.intrinsic_motivation || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.motivation_assessment?.intrinsic_motivation || 0} 
                      className="h-2 mt-2 bg-emerald-100" 
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <p className="text-sm text-gray-600 mb-1">Self-Transcendent Purpose</p>
                    <p className="text-2xl font-bold text-stone-800">
                      {userProfile?.motivation_assessment?.self_transcendent_purpose || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.motivation_assessment?.self_transcendent_purpose || 0} 
                      className="h-2 mt-2 bg-stone-100" 
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50">
                    <p className="text-sm text-gray-600 mb-1">Confidence in Ability</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {userProfile?.motivation_assessment?.ability_confidence || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.motivation_assessment?.ability_confidence || 0} 
                      className="h-2 mt-2 bg-emerald-100" 
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">Task Initiation Ease</p>
                    <p className="text-2xl font-bold text-emerald-800">
                      {userProfile?.motivation_assessment?.prompt_responsiveness || 0}%
                    </p>
                    <Progress 
                      value={userProfile?.motivation_assessment?.prompt_responsiveness || 0} 
                      className="h-2 mt-2 bg-emerald-100" 
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                  <h3 className="font-display font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Your Personalized Action Plan
                  </h3>
                  <div className="space-y-3">
                    {userProfile?.motivation_assessment?.prompt_responsiveness < 50 && (
                      <div className="p-3 bg-white rounded-lg border border-amber-200">
                        <p className="text-sm font-semibold text-amber-800 mb-1">🎯 Improve Task Initiation</p>
                        <p className="text-xs text-stone-600">Your task initiation score suggests you sometimes struggle to get started. Create tiny habits with clear anchors - like "After I open my backpack, I'll review one flashcard." The anchor makes starting automatic.</p>
                      </div>
                    )}
                    {userProfile?.motivation_assessment?.self_transcendent_purpose >= 60 && (
                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <p className="text-sm font-semibold text-emerald-800 mb-1">✨ Leverage Your Purpose</p>
                        <p className="text-xs text-stone-600">You're strongly motivated by helping others and making a contribution. When studying feels pointless, remind yourself how mastering this skill will help you support your community or make a difference.</p>
                      </div>
                    )}
                    {userProfile?.motivation_assessment?.ability_confidence < 50 && (
                      <div className="p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-800 mb-1">💪 Build Your Confidence</p>
                        <p className="text-xs text-stone-600">Your confidence could use a boost. Start with Blitz Sessions (5 min) to rack up small wins quickly. Each correct answer proves you CAN do this. String together 3 successful sessions and celebrate your capability.</p>
                      </div>
                    )}
                    {userProfile?.motivation_assessment?.intrinsic_motivation >= 70 && (
                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <p className="text-sm font-semibold text-emerald-800 mb-1">🌟 Strong Internal Drive</p>
                        <p className="text-xs text-stone-600">You're naturally curious and enjoy learning for its own sake. Use this strength! When motivation dips, reconnect with what's genuinely interesting about the material rather than focusing on grades.</p>
                      </div>
                    )}
                    {userProfile?.motivation_assessment?.extrinsic_motivation >= 60 && userProfile?.motivation_assessment?.intrinsic_motivation < 50 && (
                      <div className="p-3 bg-white rounded-lg border border-amber-200">
                        <p className="text-sm font-semibold text-amber-800 mb-1">🎁 Externally Motivated</p>
                        <p className="text-xs text-stone-600">You're driven by external rewards and outcomes. That's okay! Just be aware that over-focusing on grades can increase pressure. Try occasionally practicing for the joy of solving a hard problem, not just the score.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Retake Diagnostic */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <Link to={createPageUrl('Diagnostic')}>
          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retake Diagnostic
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
