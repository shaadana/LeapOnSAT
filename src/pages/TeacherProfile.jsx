import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Brain, 
  Heart, 
  TrendingUp,
  TrendingDown,
  Lightbulb,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function TeacherProfile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Only teachers can access
        if (userData.user_type !== 'teacher') {
          navigate(createPageUrl('Dashboard'));
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const { data: profile } = useQuery({
    queryKey: ['teacherProfile', user?.id],
    queryFn: () => base44.entities.TeacherProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const teacherProfile = profile?.[0];

  if (!teacherProfile?.diagnostic_completed) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center">
          <Brain className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-display font-bold text-stone-900 mb-4">Complete Your Teaching Profile</h1>
        <p className="text-stone-600 mb-6">
          Understand your teaching style and get personalized recommendations for professional growth.
        </p>
        <Link to={createPageUrl('TeacherDiagnostic')}>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl rounded-full font-bold">
            Build My Profile
          </Button>
        </Link>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const mentorScore = teacherProfile?.mindset_beliefs?.mentor_mindset_score || 0;
  const enforcerScore = teacherProfile?.mindset_beliefs?.enforcer_tendencies || 0;
  const protectorScore = teacherProfile?.mindset_beliefs?.protector_tendencies || 0;
  const growthMindsetScore = teacherProfile?.mindset_beliefs?.growth_mindset_score || 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Profile Header */}
      <motion.div variants={itemVariants}>
        <Card className="bg-emerald-500 text-white border-4 border-white overflow-hidden relative shadow-2xl rounded-[2rem]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
                {(user?.name || user?.full_name)?.[0] || 'T'}
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">{user?.name || user?.full_name || 'Teacher'}</h1>
                <p className="text-emerald-100">{user?.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm">{teacherProfile?.teaching_background?.total_years || 0} years teaching</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm capitalize">{teacherProfile?.teaching_background?.teaching_role || 'Educator'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-4 border-emerald-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{Math.round(mentorScore)}%</p>
                <p className="text-xs text-stone-500">Supportive Teaching</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-4 border-stone-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-500 flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{Math.round(growthMindsetScore)}%</p>
                <p className="text-xs text-stone-500">Growth Mindset</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-4 border-red-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{Math.round(enforcerScore)}%</p>
                <p className="text-xs text-stone-500">Demanding Only</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-4 border-amber-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{Math.round(protectorScore)}%</p>
                <p className="text-xs text-stone-500">Overprotective</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="mindset" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-1">
            <TabsTrigger value="mindset" className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl">
              <Heart className="w-4 h-4 mr-2" />
              Mindset
            </TabsTrigger>
            <TabsTrigger value="practices" className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl">
              <Target className="w-4 h-4 mr-2" />
              Practices
            </TabsTrigger>
            <TabsTrigger value="wellbeing" className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl">
              <Sparkles className="w-4 h-4 mr-2" />
              Wellbeing
            </TabsTrigger>
          </TabsList>

          {/* Mindset Tab */}
          <TabsContent value="mindset" className="space-y-6 mt-6">
            <Card className="bg-white border-4 border-white shadow-2xl rounded-[2rem]">
              <CardHeader className="bg-emerald-50/50">
                <CardTitle className="font-display text-stone-900">Your Mindset Profile</CardTitle>
                <CardDescription>How you approach teaching and student potential</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                    <p className="text-sm text-stone-600 mb-2">Supportive Teaching</p>
                    <p className="text-3xl font-bold text-emerald-700">{Math.round(mentorScore)}%</p>
                    <Progress value={mentorScore} className="h-2 mt-2 bg-emerald-100" />
                    <p className="text-xs text-stone-600 mt-2">High expectations + genuine support</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
                    <p className="text-sm text-stone-600 mb-2">High Expectations Only</p>
                    <p className="text-3xl font-bold text-red-700">{Math.round(enforcerScore)}%</p>
                    <Progress value={enforcerScore} className="h-2 mt-2 bg-red-100" />
                    <p className="text-xs text-stone-600 mt-2">Demanding without enough support</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                    <p className="text-sm text-stone-600 mb-2">Overprotective</p>
                    <p className="text-3xl font-bold text-amber-700">{Math.round(protectorScore)}%</p>
                    <Progress value={protectorScore} className="h-2 mt-2 bg-amber-100" />
                    <p className="text-xs text-stone-600 mt-2">Supportive but lowers expectations</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                  <h3 className="font-display font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Your Mindset Insights
                  </h3>
                  <div className="space-y-3 text-sm text-stone-700 leading-relaxed">
                    {mentorScore >= 70 && (
                      <p>✨ <strong>Strong Supportive Teaching:</strong> You excel at balancing high expectations with genuine support. This helps students see struggle as growth, not failure.</p>
                    )}
                    {mentorScore < 50 && (
                      <p>💡 <strong>Building Your Supportive Teaching Style:</strong> Focus on pairing your expectations with visible belief in students' potential. Try "I'm giving you this feedback because I have high standards and I know you can reach them."</p>
                    )}
                    {enforcerScore > 60 && (
                      <p className="p-3 bg-red-50 rounded-lg border border-red-200">
                        ⚠️ <strong>Watch: High Expectations Without Enough Support:</strong> You may hold high standards but students may not feel supported. This can come across as "you think I can't do it." Balance accountability with visible belief in their capability.
                      </p>
                    )}
                    {protectorScore > 60 && (
                      <p className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        ⚠️ <strong>Watch: Lowering Expectations to Avoid Discomfort:</strong> While well-intentioned, reducing rigor can signal "I don't think you can handle this." Maintain high expectations while providing strong support structures.
                      </p>
                    )}
                    {growthMindsetScore >= 70 && (
                      <p>🌱 <strong>Growth Mindset Strength:</strong> You believe students can develop their abilities. This belief is contagious and helps students adopt the same mindset.</p>
                    )}
                    {growthMindsetScore < 50 && (
                      <p className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        📚 <strong>Explore Growth Mindset:</strong> Research suggests ability is more malleable than we think. Consider reading Carol Dweck's work or David Yeager's "10 to 25" for evidence-based perspective shifts.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Practices Tab */}
          <TabsContent value="practices" className="space-y-6 mt-6">
            <Card className="bg-white border-4 border-white shadow-2xl rounded-[2rem]">
              <CardHeader className="bg-stone-50/50">
                <CardTitle className="font-display text-stone-900">Teaching Practices</CardTitle>
                <CardDescription>Your likelihood to use evidence-based practices</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { key: 'spaced', label: 'Spaced/Interleaved Practice', likelihood: teacherProfile?.teaching_practices?.spaced_practice_likelihood },
                    { key: 'explain', label: 'Explain Struggle Support', likelihood: teacherProfile?.teaching_practices?.explain_struggle_support_likelihood },
                    { key: 'mistakes', label: 'Discuss Mistakes Openly', likelihood: teacherProfile?.teaching_practices?.discuss_mistakes_likelihood },
                    { key: 'questions', label: 'Open-Ended Questions', likelihood: teacherProfile?.teaching_practices?.open_ended_questions_likelihood },
                    { key: 'retrieval', label: 'Retrieval Practice', likelihood: teacherProfile?.teaching_practices?.retrieval_practice_likelihood },
                    { key: 'earnback', label: 'Earn Points Back', likelihood: teacherProfile?.teaching_practices?.earn_points_back_likelihood }
                  ].map((practice) => (
                    <div key={practice.key} className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-stone-800">{practice.label}</span>
                        <span className="text-sm font-semibold text-emerald-600">
                          {practice.likelihood ? `${practice.likelihood}/5` : 'N/A'}
                        </span>
                      </div>
                      <Progress value={(practice.likelihood || 0) * 20} className="h-2" />
                    </div>
                  ))}
                </div>

                {teacherProfile?.teaching_practices?.points_back_policy && (
                  <div className="mt-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                    <p className="text-sm font-semibold text-emerald-900 mb-2">Your Points-Back Policy:</p>
                    <p className="text-sm text-stone-700">{teacherProfile.teaching_practices.points_back_policy}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strengths & Growth */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white border-4 border-emerald-200 rounded-3xl shadow-xl">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-emerald-800">
                    <TrendingUp className="w-5 h-5" />
                    Your Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teacherProfile?.strengths?.map((strength, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-stone-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {strength}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-4 border-amber-200 rounded-3xl shadow-xl">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-amber-800">
                    <TrendingDown className="w-5 h-5" />
                    Growth Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teacherProfile?.growth_areas?.map((area, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-stone-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {area}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Wellbeing Tab */}
          <TabsContent value="wellbeing" className="space-y-6 mt-6">
            <Card className="bg-white border-4 border-white shadow-2xl rounded-[2rem]">
              <CardHeader className="bg-stone-50/50">
                <CardTitle className="font-display text-stone-900">Wellbeing & Support</CardTitle>
                <CardDescription>Your experience with stress and school climate</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <p className="text-xs text-stone-600 mb-1">Stress Frequency</p>
                    <p className="text-lg font-semibold text-stone-800 capitalize">
                      {teacherProfile?.wellbeing?.stress_frequency || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-stone-600 mb-1">Coping Ability</p>
                    <p className="text-lg font-semibold text-emerald-800 capitalize">
                      {teacherProfile?.wellbeing?.coping_ability || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <p className="text-xs text-stone-600 mb-1">Stress Confidence</p>
                    <p className="text-lg font-semibold text-stone-800 capitalize">
                      {teacherProfile?.wellbeing?.stress_confidence || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-stone-600 mb-1">Self-Doubt Frequency</p>
                    <p className="text-lg font-semibold text-emerald-800 capitalize">
                      {teacherProfile?.wellbeing?.self_doubt_frequency || 'N/A'}
                    </p>
                  </div>
                </div>

                {(teacherProfile?.wellbeing?.depression_screen_1 === 'Nearly every day' || 
                  teacherProfile?.wellbeing?.depression_screen_1 === 'More than half the days' ||
                  teacherProfile?.wellbeing?.depression_screen_2 === 'Nearly every day' ||
                  teacherProfile?.wellbeing?.depression_screen_2 === 'More than half the days') && (
                  <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-2">🩺 Wellbeing Check-In</p>
                    <p className="text-xs text-stone-700">
                      Your responses indicate you may benefit from additional support. Consider reaching out to your school's EAP, a counselor, or a trusted colleague. Taking care of yourself helps you take care of your students.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personalized Advice */}
            <Card className="bg-white border-4 border-emerald-200 rounded-[2rem] shadow-2xl">
              <CardHeader className="bg-emerald-50/50">
                <CardTitle className="font-display flex items-center gap-2 text-emerald-900">
                  <Lightbulb className="w-5 h-5" />
                  Your Personalized Growth Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-sm max-w-none text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {teacherProfile?.personalized_advice}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Retake */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <Link to={createPageUrl('TeacherDiagnostic')}>
          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retake Profile
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
