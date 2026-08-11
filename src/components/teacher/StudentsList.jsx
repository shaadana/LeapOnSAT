import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, User, Users, Brain, TrendingUp, Target, Heart, MessageSquare, Calculator, BookOpen, Sparkles, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import StudentPerformance from '@/components/teacher/StudentPerformance';
import MentorInsights from '@/components/teacher/MentorInsights';
import EnglishStudentPerformance from '@/components/teacher/EnglishStudentPerformance';
import StudentAssignmentsTab from '@/components/teacher/StudentAssignmentsTab';
import RecommendedAssignments from '@/components/teacher/RecommendedAssignments';
import { createPageUrl } from '../../utils';

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

export default function StudentsList({ classData, onBack }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [inactivityFilter, setInactivityFilter] = useState('all');

  const { data: students } = useQuery({
    queryKey: ['classStudents', classData.id],
    queryFn: async () => {
      if (!classData.student_ids?.length) return [];
      const res = await base44.functions.invoke('getClassStudents', { class_id: classData.id });
      return res.data?.students || [];
    },
    enabled: !!classData.student_ids?.length,
  });

  const filteredStudents = students?.filter(student => {
    const name = student.user?.name || student.user?.full_name || '';
    const email = student.user?.email || '';
    
    // Name search
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase()) && !email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Inactivity filter (Filtering OUT)
    if (inactivityFilter !== 'all') {
      const loginHistory = student.profile?.login_history || [];
      const lastLoginStr = loginHistory.length > 0 ? loginHistory[loginHistory.length - 1] : null;
      
      if (inactivityFilter === 'never') {
        if (!lastLoginStr) return false; // Filter out never logged in
      } else {
        if (!lastLoginStr) return false; // Filter out never logged in if we are filtering out inactive students
        
        const lastLoginDate = new Date(lastLoginStr);
        const daysSinceLogin = (new Date() - lastLoginDate) / (1000 * 60 * 60 * 24);
        
        if (inactivityFilter === '1_week' && daysSinceLogin >= 7) return false;
        if (inactivityFilter === '2_weeks' && daysSinceLogin >= 14) return false;
        if (inactivityFilter === '1_month' && daysSinceLogin >= 30) return false;
      }
    }
    
    return true;
  });

  const StudentProfileDialog = ({ student }) => {
    const profile = student?.profile || {};
    const efSkills = profile.executive_functioning || {};
    const topStrengths = Object.entries(efSkills).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const growthAreas = Object.entries(efSkills).sort((a, b) => a[1] - b[1]).slice(0, 3);

    const radarData = Object.entries(efSkills).map(([skill, score]) => ({
      skill: EF_SKILL_LABELS[skill]?.split(' ')[0] || skill,
      score: Math.round(score / 21 * 100)
    }));

    const englishPerf = profile.english_performance || {};
    const mathPerf = profile.sat_performance || {};

    return (
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{student.user?.name || student.user?.full_name || 'Student'} - Profile Overview</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap w-full bg-transparent p-0 border-b-2 border-emerald-50 rounded-none h-auto gap-4 mb-4">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 px-1 text-sm font-medium">Overview</TabsTrigger>
            <TabsTrigger value="math" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 px-1 text-sm font-medium">SAT Math</TabsTrigger>
            <TabsTrigger value="english" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 px-1 text-sm font-medium">SAT English</TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 px-1 text-sm font-medium">Assignments</TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 px-1 text-sm font-medium">Recommendations</TabsTrigger>
            <TabsTrigger value="mentor" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 px-1 text-sm font-medium">Mentor Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {radarData.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-white border-2 border-emerald-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4" /> Skills Radar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#d1d5db" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar name="Scores" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topStrengths.map(([skill, score]) => (
                        <div key={skill}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{EF_SKILL_LABELS[skill]}</span>
                            <span className="font-bold text-emerald-600">{Math.round(score/21*100)}%</span>
                          </div>
                          <Progress value={(score / 21) * 100} className="h-1.5" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-stone-50 border-stone-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Growth Areas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {growthAreas.map(([skill, score]) => (
                        <div key={skill}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{EF_SKILL_LABELS[skill]}</span>
                            <span className="font-bold text-stone-600">{Math.round(score/21*100)}%</span>
                          </div>
                          <Progress value={(score / 21) * 100} className="h-1.5 bg-stone-200" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                <Brain className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 text-sm">Student hasn't completed the learner profile diagnostic yet</p>
                <p className="text-xs text-stone-400 mt-1">Check the Performance tab for SAT data</p>
              </div>
            )}

            {/* Motivation Section directly integrated into Overview */}
            {profile.motivation_assessment && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-700">Motivation Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-600 mb-1">Intrinsic</p>
                      <p className="text-xl font-bold text-emerald-700">{profile.motivation_assessment.intrinsic_motivation}%</p>
                      <Progress value={profile.motivation_assessment.intrinsic_motivation} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                  <Card className="bg-stone-50 border-stone-200">
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-600 mb-1">Purpose</p>
                      <p className="text-xl font-bold text-stone-700">{profile.motivation_assessment.self_transcendent_purpose}%</p>
                      <Progress value={profile.motivation_assessment.self_transcendent_purpose} className="h-1.5 mt-2 bg-stone-200" />
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-600 mb-1">Confidence</p>
                      <p className="text-xl font-bold text-emerald-700">{profile.motivation_assessment.ability_confidence}%</p>
                      <Progress value={profile.motivation_assessment.ability_confidence} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                  <Card className="bg-stone-50 border-stone-200">
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-600 mb-1">Task Initiation</p>
                      <p className="text-xl font-bold text-stone-700">{profile.motivation_assessment.prompt_responsiveness}%</p>
                      <Progress value={profile.motivation_assessment.prompt_responsiveness} className="h-1.5 mt-2 bg-stone-200" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {profile.mindset_appraisal && (
              <Card className="bg-white border-2 border-emerald-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Mindset Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-3 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-gray-600">Mentor Mindset</p>
                    <p className="text-xl font-bold text-emerald-700">{profile.mindset_appraisal.mentor_mindset_score}%</p>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-gray-600">Growth Mindset</p>
                    <p className="text-xl font-bold text-stone-700">{profile.mindset_appraisal.growth_mindset_score}%</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="math" className="mt-4">
            <StudentPerformance studentId={student.user?.id} studentName={student.user?.name || student.user?.full_name || 'Student'} />
          </TabsContent>

          <TabsContent value="english" className="mt-4">
            <EnglishStudentPerformance studentId={student.user?.id} studentName={student.user?.name || student.user?.full_name || 'Student'} />
          </TabsContent>

          <TabsContent value="assignments" className="mt-4">
            <StudentAssignmentsTab
              studentId={student.user?.id}
              studentName={student.user?.name || student.user?.full_name || 'Student'}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <RecommendedAssignments
              studentId={student.user?.id}
              classId={classData.id}
            />
          </TabsContent>

          <TabsContent value="mentor" className="space-y-4 mt-4">
            <MentorInsights studentId={student.user?.id} studentName={student.user?.name || student.user?.full_name || 'Student'} />
          </TabsContent>


        </Tabs>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Button>
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900">{classData.class_name}</h2>
            <p className="text-sm text-gray-600">{classData.student_ids?.length || 0} students enrolled</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl('ClassView') + '?class_id=' + classData.id)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          View Class
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Search students by name or email..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={inactivityFilter} onValueChange={setInactivityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter out..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Don't filter out</SelectItem>
              <SelectItem value="1_week">Inactive 1+ Week</SelectItem>
              <SelectItem value="2_weeks">Inactive 2+ Weeks</SelectItem>
              <SelectItem value="1_month">Inactive 1+ Month</SelectItem>
              <SelectItem value="never">Never Logged In</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {students?.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No students yet</p>
            <p className="text-sm text-gray-500">Share join code: <span className="font-mono font-bold text-emerald-600">{classData.join_code}</span></p>
          </CardContent>
        </Card>
      ) : filteredStudents?.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No students found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredStudents?.map((student) => (
            <Card key={student.user?.id} className="hover:shadow-lg transition-all border-2 border-emerald-100 rounded-3xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.user?.name || student.user?.full_name || 'Student'}</h3>
                      <p className="text-sm text-gray-500">{student.user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Summary stats — show whichever data is available */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {student.profile?.sat_performance?.diagnostic_accuracy != null ? (
                      <div className="bg-emerald-50 p-2 rounded">
                        <p className="text-gray-600">SAT Score</p>
                        <p className="font-bold text-emerald-600">
                          {student.profile.sat_performance.diagnostic_accuracy}%
                        </p>
                      </div>
                    ) : student.profile?.mindset_appraisal?.growth_mindset_score != null ? (
                      <div className="bg-emerald-50 p-2 rounded">
                        <p className="text-gray-600">Growth Mindset</p>
                        <p className="font-bold text-emerald-600">
                          {student.profile.mindset_appraisal.growth_mindset_score}%
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-400 text-xs">No profile yet</p>
                      </div>
                    )}
                    {student.profile?.sat_performance?.overall_level ? (
                      <div className="bg-amber-50 p-2 rounded">
                        <p className="text-gray-600">SAT Level</p>
                        <p className="font-bold text-amber-600 capitalize">
                          {student.profile.sat_performance.overall_level}
                        </p>
                      </div>
                    ) : student.profile?.motivation_assessment?.intrinsic_motivation != null ? (
                      <div className="bg-amber-50 p-2 rounded">
                        <p className="text-gray-600">Motivation</p>
                        <p className="font-bold text-amber-600">
                          {student.profile.motivation_assessment.intrinsic_motivation}%
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-400 text-xs">No data yet</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                          <Brain className="w-4 h-4 mr-2" />
                          Profile
                        </Button>
                      </DialogTrigger>
                      <StudentProfileDialog student={student} />
                    </Dialog>
                    <Button 
                      onClick={() => navigate(createPageUrl('PrivateChat') + '?student_id=' + student.user?.id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
