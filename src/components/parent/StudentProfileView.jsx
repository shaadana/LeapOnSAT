import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Brain, Target, TrendingUp, Zap, CheckCircle, Clock } from 'lucide-react';
import AssignmentResultsModal from '@/components/teacher/AssignmentResultsModal';
import StudentPerformance from '@/components/teacher/StudentPerformance';
import EnglishStudentPerformance from '@/components/teacher/EnglishStudentPerformance';

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

export default function StudentProfileView({ studentId, onBack }) {
  const [userEmail, setUserEmail] = useState(null);

  // Fetch student profile data
  const { data: studentUser } = useQuery({
    queryKey: ['studentUser', studentId],
    queryFn: () => base44.entities.User.get(studentId),
    enabled: !!studentId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['studentProfile', studentId],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: studentId }),
    enabled: !!studentId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['studentSessions', studentId],
    queryFn: async () => {
      const [mathSessions, englishSessions] = await Promise.all([
        base44.entities.PracticeSession.filter({ user_id: studentId }, '-created_date', 10),
        base44.entities.EnglishPracticeSession.filter({ user_id: studentId }, '-created_date', 10)
      ]);
      return [...mathSessions, ...englishSessions].sort((a, b) => new Date(b.created_date || b.start_time) - new Date(a.created_date || a.start_time)).slice(0, 10);
    },
    enabled: !!studentId,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['studentHabits', studentId],
    queryFn: () => base44.entities.StudyHabit.filter({ user_id: studentId, status: 'active' }),
    enabled: !!studentId,
  });

  const { data: assignments } = useQuery({
    queryKey: ['studentAssignments', studentId],
    queryFn: async () => {
      const progress = await base44.entities.StudentAssignmentProgress.filter({
        student_id: studentId
      });

      if (!progress.length) return [];

      const assignmentIds = progress.map(p => p.assignment_id);
      const allAssignments = await Promise.all(
        assignmentIds.map(id => base44.entities.Assignment.filter({ id }))
      );

      return progress.map((p, i) => ({
        ...allAssignments[i]?.[0],
        progress: p,
      })).filter(a => a.id);
    },
    enabled: !!studentId,
  });

  const profile = profiles[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Student Profile</h2>
          <p className="text-gray-600">Complete view of student progress and insights</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="math">SAT Math</TabsTrigger>
            <TabsTrigger value="english">SAT English</TabsTrigger>
            <TabsTrigger value="executive">Executive Function</TabsTrigger>
            <TabsTrigger value="mindset">Mindset</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="math" className="mt-4">
            <StudentPerformance studentId={studentId} studentName={studentUser?.full_name || 'Student'} />
          </TabsContent>
          <TabsContent value="english" className="mt-4">
            <EnglishStudentPerformance studentId={studentId} studentName={studentUser?.full_name || 'Student'} />
          </TabsContent>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="text-xs text-stone-500 font-semibold uppercase text-center">Overall Proficiency</p>
                <p className="text-xl font-bold text-stone-800 capitalize text-center">
                  {profile?.sat_performance?.overall_level || profile?.english_performance?.overall_level || 'Pending'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                <Brain className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="text-xs text-stone-500 font-semibold uppercase text-center">Diagnostic Score</p>
                <div className="text-center">
                  <p className="text-sm font-bold text-stone-800">
                    Math: {profile?.sat_performance?.diagnostic_accuracy != null ? `${profile.sat_performance.diagnostic_accuracy}%` : '—'}
                  </p>
                  <p className="text-sm font-bold text-stone-800">
                    English: {profile?.english_performance?.diagnostic_accuracy != null ? `${profile.english_performance.diagnostic_accuracy}%` : '—'}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="text-xs text-stone-500 font-semibold uppercase text-center">Practice Sessions</p>
                <p className="text-xl font-bold text-stone-800 text-center">{sessions.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                <Zap className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-xs text-stone-500 font-semibold uppercase text-center">Active Habits</p>
                <p className="text-xl font-bold text-stone-800 text-center">{habits.length}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-stone-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.strengths?.length > 0 ? (
                    <div className="space-y-2">
                      {profile.strengths.slice(0, 3).map((strength, i) => (
                        <div key={i} className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-sm text-emerald-900">{strength}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No strengths recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-stone-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-stone-600" />
                    Growth Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.growth_areas?.length > 0 ? (
                    <div className="space-y-2">
                      {profile.growth_areas.slice(0, 3).map((area, i) => (
                        <div key={i} className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                          <p className="text-sm text-stone-900">{area}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No growth areas recorded</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-stone-200 bg-gradient-to-br from-stone-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Study Habits</p>
                      <p className="text-3xl font-bold text-gray-900">{habits.length}</p>
                    </div>
                    <Brain className="w-10 h-10 text-stone-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Practice Sessions</p>
                      <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Executive Function */}
          <TabsContent value="executive" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>Executive Functioning Skills</CardTitle>
                <p className="text-sm text-stone-500">Scores indicate the student's self-reported strengths and areas for growth in cognitive regulation and behavioral execution.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.executive_functioning && (
                  <>
                    {Object.entries(profile.executive_functioning)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, value]) => (
                      <div key={key} className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900 capitalize">
                            {EF_SKILL_LABELS[key] || key.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-sm font-bold ${value >= 15 ? 'text-emerald-600' : value <= 10 ? 'text-amber-600' : 'text-stone-600'}`}>
                            {value}/21
                          </span>
                        </div>
                        <Progress value={(value / 21) * 100} className={`h-2 ${value >= 15 ? '[&>div]:bg-emerald-500' : value <= 10 ? '[&>div]:bg-amber-500' : ''}`} />
                        <p className="text-xs text-stone-500 mt-2">
                          {value >= 15 ? "This is a relative strength. The student naturally handles this area well." : value <= 10 ? "This is a growth opportunity. Providing structural support here will be beneficial." : "This area is average and generally stable."}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mindset */}
          <TabsContent value="mindset" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>Mindset & Motivation</CardTitle>
                <p className="text-sm text-stone-500">Insights into the student's psychological approach to learning, setbacks, and their inner drive.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile?.mindset_appraisal && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-emerald-900">Mentor Mindset</span>
                        <span className="text-sm font-bold text-emerald-700">{profile.mindset_appraisal.mentor_mindset_score || 0}%</span>
                      </div>
                      <Progress value={profile.mindset_appraisal.mentor_mindset_score || 0} className="h-2 [&>div]:bg-emerald-500" />
                      <p className="text-xs text-emerald-800 mt-2">Reflects how well the student integrates high standards with high self-support.</p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-stone-900">Growth Mindset</span>
                        <span className="text-sm font-bold text-stone-700">{profile.mindset_appraisal.growth_mindset_score || 0}%</span>
                      </div>
                      <Progress value={profile.mindset_appraisal.growth_mindset_score || 0} className="h-2" />
                      <p className="text-xs text-stone-600 mt-2">Indicates belief that intelligence and abilities can be developed through effort.</p>
                    </div>
                  </div>
                )}

                {profile?.motivation_assessment && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-orange-900">Intrinsic Motivation</span>
                        <span className="text-sm font-bold text-orange-700">{profile.motivation_assessment.intrinsic_motivation || 0}%</span>
                      </div>
                      <Progress value={profile.motivation_assessment.intrinsic_motivation || 0} className="h-2 [&>div]:bg-orange-500" />
                      <p className="text-xs text-orange-800 mt-2">The degree to which the student is driven by internal satisfaction rather than external rewards.</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-900">Ability Confidence</span>
                        <span className="text-sm font-bold text-blue-700">{profile.motivation_assessment.ability_confidence || 0}%</span>
                      </div>
                      <Progress value={profile.motivation_assessment.ability_confidence || 0} className="h-2 [&>div]:bg-blue-500" />
                      <p className="text-xs text-blue-800 mt-2">Self-efficacy and belief in their capacity to succeed in academic challenges.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress */}
          <TabsContent value="progress" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>SAT Practice Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.sat_performance ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                        <p className="text-lg font-bold text-emerald-700 capitalize">{profile.sat_performance.overall_level || '—'}</p>
                        <p className="text-xs text-gray-500">SAT Level</p>
                      </div>
                      {profile.sat_performance.diagnostic_accuracy != null ? (
                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
                          <p className="text-lg font-bold text-stone-700">{profile.sat_performance.diagnostic_accuracy}%</p>
                          <p className="text-xs text-gray-500">Diagnostic Score</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
                          <p className="text-lg font-bold text-stone-700">—</p>
                          <p className="text-xs text-gray-500">Diagnostic Score</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Practice Sessions Completed</p>
                      <p className="text-lg font-bold text-gray-900">{sessions.length}</p>
                    </div>

                    {profile.sat_performance.domain_scores && Object.keys(profile.sat_performance.domain_scores).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Domain Mastery (from Diagnostic)</p>
                        <div className="space-y-1.5">
                          {Object.entries(profile.sat_performance.domain_scores).slice(0, 6).map(([domain, score]) => (
                            <div key={domain} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 w-28 capitalize flex-shrink-0">{domain.replace(/_/g, ' ')}</span>
                              <Progress value={score} className="flex-1 h-1.5" />
                              <span className="text-xs text-gray-500 w-8 text-right">{score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.sat_performance.last_diagnostic_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last diagnostic: {new Date(profile.sat_performance.last_diagnostic_date).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">No SAT performance data yet</p>
                )}
              </CardContent>
            </Card>

            {/* SAT English Performance */}
            {profile?.english_performance && (
              <Card className="border-2 border-stone-200">
                <CardHeader>
                  <CardTitle>SAT English Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {profile.english_performance.overall_level && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                        <p className="text-lg font-bold text-emerald-700 capitalize">{profile.english_performance.overall_level}</p>
                        <p className="text-xs text-gray-500">English Level</p>
                      </div>
                    )}
                    {profile.english_performance.diagnostic_accuracy != null ? (
                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
                        <p className="text-lg font-bold text-stone-700">{profile.english_performance.diagnostic_accuracy}%</p>
                        <p className="text-xs text-gray-500">Accuracy</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
                        <p className="text-lg font-bold text-stone-700">—</p>
                        <p className="text-xs text-gray-500">Accuracy</p>
                      </div>
                    )}
                  </div>
                  {profile.english_performance.domain_scores && Object.keys(profile.english_performance.domain_scores).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Domain Scores</p>
                      <div className="space-y-1.5">
                        {Object.entries(profile.english_performance.domain_scores)
                          .sort(([, a], [, b]) => a - b)
                          .slice(0, 6)
                          .map(([domain, score]) => (
                            <div key={domain} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 w-32 capitalize flex-shrink-0">{domain.replace(/_/g, ' ')}</span>
                              <Progress value={score} className="flex-1 h-1.5" />
                              <span className="text-xs text-gray-500 w-8 text-right">{score}%</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {profile.english_performance.vocab_words_mastered > 0 && (
                    <p className="text-xs text-stone-500">📚 {profile.english_performance.vocab_words_mastered} vocab words mastered</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Habits */}
            {habits.length > 0 && (
              <Card className="border-2 border-stone-200">
                <CardHeader>
                  <CardTitle>Active Study Habits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {habits.slice(0, 3).map((habit) => (
                      <div key={habit.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{habit.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{habit.tiny_behavior}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{habit.streak_count || 0} 🔥</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments" className="space-y-4">
            <Card className="border-2 border-stone-200">
              <CardHeader>
                <CardTitle>Assignments & Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments && assignments.length > 0 ? (
                    assignments.sort((a, b) => {
                      if (a.progress?.status === 'completed' && b.progress?.status !== 'completed') return 1;
                      if (a.progress?.status !== 'completed' && b.progress?.status === 'completed') return -1;
                      return 0;
                    }).map((assignment, i) => (
                      <div key={assignment.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-stone-900">{assignment.title}</p>
                            <p className="text-sm text-stone-600">{assignment.description}</p>
                          </div>
                          <Badge variant={assignment.progress?.status === 'completed' ? 'default' : 'outline'} className={assignment.progress?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}>
                            {assignment.progress?.status === 'completed' ? <><CheckCircle className="w-3 h-3 mr-1" /> Completed</> :
                             assignment.progress?.status === 'in_progress' ? <><Clock className="w-3 h-3 mr-1" /> In Progress</> :
                             'Not Started'}
                          </Badge>
                        </div>
                        {assignment.progress?.status === 'completed' && assignment.progress?.score !== undefined && assignment.progress?.score !== null && (
                          <>
                            <div className="mt-3 flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100 mb-3">
                              <span className="text-sm font-medium text-stone-600">Score</span>
                              <span className="text-sm font-bold text-emerald-600">{assignment.progress.score}%</span>
                            </div>
                            <div className="flex justify-end">
                              <AssignmentResultsModal 
                                assignment={assignment} 
                                progressList={[assignment.progress]} 
                                students={[{ user: studentUser || { id: studentId, full_name: 'Student' } }]} 
                              />
                            </div>
                          </>
                        )}
                        {assignment.progress?.status === 'in_progress' && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-stone-600">Progress</span>
                              <span className="font-semibold">{assignment.progress.progress_percentage || 0}%</span>
                            </div>
                            <Progress value={assignment.progress.progress_percentage || 0} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">No assignments found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
