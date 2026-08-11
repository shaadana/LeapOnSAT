import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Lightbulb, MessageCircle, User, Brain, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function extractJson(text) {
  if (!text) return null;
  // Try direct parse first
  try { return JSON.parse(text); } catch (_) {}
  // Fallback: pull out the first {...} block
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  return null;
}

export default function MentorInsights({ studentId, studentName }) {
  const { data: context, isLoading: loadingContext, isError: contextError, refetch, isFetching } = useQuery({
    queryKey: ['mentorInsightsContext', studentId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getComentorContext', { student_id: studentId });
      return res.data;
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  const teacher = context?.teacher_profile || {};
  const student = context?.student_data || {};

  const { data: insights, isLoading: loadingInsights, isError: insightsError } = useQuery({
    queryKey: ['mentorInsightsLLM', studentId, teacher.email],
    queryFn: async () => {
      const tp = teacher;
      const sp = student;

      const teacherSummary = [
        `TEACHER: ${tp.name || 'the teacher'}`,
        tp.mindset_beliefs ? `Mindset — mentor: ${tp.mindset_beliefs.mentor_mindset_score ?? '?'}, enforcer tendencies: ${tp.mindset_beliefs.enforcer_tendencies ?? '?'}, protector tendencies: ${tp.mindset_beliefs.protector_tendencies ?? '?'}, growth mindset: ${tp.mindset_beliefs.growth_mindset_score ?? '?'}` : 'Mindset: not assessed',
        tp.teaching_practices ? `Teaching practices (likelihood 0-100) — retrieval practice: ${tp.teaching_practices.retrieval_practice_likelihood ?? '?'}, spaced practice: ${tp.teaching_practices.spaced_practice_likelihood ?? '?'}, discussing mistakes: ${tp.teaching_practices.discuss_mistakes_likelihood ?? '?'}, open-ended questions: ${tp.teaching_practices.open_ended_questions_likelihood ?? '?'}, productive failure: ${tp.teaching_practices.productive_failure_likelihood ?? '?'}` : 'Teaching practices: not assessed',
        tp.strengths?.length ? `Teacher strengths: ${tp.strengths.join(', ')}` : '',
        tp.growth_areas?.length ? `Teacher growth areas: ${tp.growth_areas.join(', ')}` : '',
      ].filter(Boolean).join('\n');

      const ef = sp.executive_functioning || {};
      const efEntries = Object.entries(ef).filter(([, v]) => typeof v === 'number');
      const efLow = efEntries.filter(([, v]) => v < 10).map(([k]) => k.replace(/_/g, ' '));
      const efHigh = efEntries.filter(([, v]) => v >= 14).map(([k]) => k.replace(/_/g, ' '));

      const studentSummary = [
        `STUDENT: ${sp.user?.name || studentName || 'the student'} (grade ${sp.grade_level || 'unknown'}${sp.sat_target_date ? `, SAT target ${sp.sat_target_date}` : ''})`,
        sp.mindset_appraisal ? `Student mindset — mentor: ${sp.mindset_appraisal.mentor_mindset_score ?? '?'}, growth: ${sp.mindset_appraisal.growth_mindset_score ?? '?'}, enforcer: ${sp.mindset_appraisal.enforcer_tendencies ?? '?'}, protector: ${sp.mindset_appraisal.protector_tendencies ?? '?'}` : 'Student mindset: not assessed',
        sp.motivation_assessment ? `Student motivation — intrinsic: ${sp.motivation_assessment.intrinsic_motivation ?? '?'}, purpose: ${sp.motivation_assessment.self_transcendent_purpose ?? '?'}, ability confidence: ${sp.motivation_assessment.ability_confidence ?? '?'}, task initiation: ${sp.motivation_assessment.prompt_responsiveness ?? '?'}` : 'Student motivation: not assessed',
        efHigh.length ? `Student EF strengths: ${efHigh.join(', ')}` : '',
        efLow.length ? `Student EF growth areas: ${efLow.join(', ')}` : '',
        sp.math_practice ? `Math practice — ${sp.math_practice.total_completed_sessions} sessions, ${sp.math_practice.overall_accuracy != null ? sp.math_practice.overall_accuracy + '% accuracy' : 'no accuracy data'}` : '',
        sp.english_practice ? `English practice — ${sp.english_practice.total_completed_sessions} sessions, ${sp.english_practice.overall_accuracy != null ? sp.english_practice.overall_accuracy + '% accuracy' : 'no accuracy data'}` : '',
        sp.concept_mastery ? `Concept mastery — mastered: ${sp.concept_mastery.mastered_count}, learning: ${sp.concept_mastery.learning_count}${sp.concept_mastery.weak_topics?.length ? `, weak topics: ${sp.concept_mastery.weak_topics.slice(0, 5).join(', ')}` : ''}` : '',
        sp.streak ? `Study streak — current: ${sp.streak.current}, longest: ${sp.streak.longest}` : '',
        sp.active_habits?.length ? `Active habits: ${sp.active_habits.map(h => h.title).join(', ')}` : '',
        sp.strengths?.length ? `Student listed strengths: ${sp.strengths.join(', ')}` : '',
        sp.growth_areas?.length ? `Student listed growth areas: ${sp.growth_areas.join(', ')}` : '',
      ].filter(Boolean).join('\n');

      const prompt = `You are an expert instructional coach helping a teacher mentor a specific student. Using the real data below, produce a concise, genuinely tailored mentoring brief. Ground every recommendation in the specific numbers and traits provided — do not give generic advice. Address the teacher directly as "you".

${teacherSummary}

${studentSummary}

IMPORTANT: Write in plain, everyday language a busy teacher would naturally use. Do NOT use technical or academic jargon — avoid terms like "executive functioning", "enforcer tendencies", "protector tendencies", "mentor mindset", "retrieval practice", "spaced practice", "productive failure", "self-transcendent purpose", or "metacognition". Describe the real-world behavior in plain words (e.g., say "struggles to get started on tasks" rather than "low task initiation").

Respond with ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "student_snapshot": "2-3 sentence read of where this student is right now academically and emotionally, citing specifics",
  "alignment": "2-3 sentences on how THIS teacher's tendencies fit or clash with THIS student's profile, and what to watch for",
  "recommendations": [
    { "title": "short label", "detail": "one concrete action the teacher can take this week, tailored to both profiles", "why": "the reasoning tied to specific student/teacher data" }
  ],
  "conversation_starters": ["2-3 specific opening lines the teacher could use with this student, adapted to the student's mindset and motivation"]
}

Provide 3-4 recommendations. Keep each field tight and specific.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const parsed = extractJson(typeof res === 'string' ? res : res?.text || res?.response || JSON.stringify(res));
      return parsed || { raw: typeof res === 'string' ? res : JSON.stringify(res) };
    },
    enabled: !!context,
    staleTime: 10 * 60 * 1000,
  });

  const hasData = context && (student.profile || student.math_practice || student.english_practice);

  if (loadingContext) {
    return (
      <Card className="border-2 border-emerald-100">
        <CardContent className="p-6 flex items-center gap-3 text-stone-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Gathering student and teacher context…</span>
        </CardContent>
      </Card>
    );
  }

  if (contextError || !context) {
    return (
      <Card className="border-2 border-stone-200">
        <CardContent className="p-6 text-center space-y-2">
          <p className="text-sm text-stone-600">Couldn't load mentoring context for this student.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="border-2 border-dashed border-stone-200 bg-stone-50">
        <CardContent className="p-6 text-center">
          <Brain className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-600">Once {studentName || 'this student'} completes a diagnostic or practice, tailored mentor insights will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Teacher + student context banner */}
      <Card className="bg-white border-2 border-emerald-100">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-stone-700">Teacher</p>
              <p className="text-stone-500">{teacher.name || '—'}</p>
              {teacher.mindset_beliefs && (
                <p className="text-stone-400 mt-0.5">
                  Mentor {teacher.mindset_beliefs.mentor_mindset_score ?? '—'}% · Enforcer {teacher.mindset_beliefs.enforcer_tendencies ?? '—'}% · Protector {teacher.mindset_beliefs.protector_tendencies ?? '—'}%
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-stone-700">Student</p>
              <p className="text-stone-500">{student.user?.name || studentName || '—'}</p>
              {student.mindset_appraisal && (
                <p className="text-stone-400 mt-0.5">
                  Mentor {student.mindset_appraisal.mentor_mindset_score ?? '—'}% · Growth {student.mindset_appraisal.growth_mindset_score ?? '—'}% · Confidence {student.motivation_assessment?.ability_confidence ?? '—'}%
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingInsights && (
        <Card className="border-2 border-emerald-100">
          <CardContent className="p-6 flex items-center gap-3 text-stone-500">
            <Sparkles className="w-4 h-4 animate-pulse text-emerald-500" />
            <span className="text-sm">Generating tailored recommendations from both profiles…</span>
          </CardContent>
        </Card>
      )}

      {insightsError && !loadingInsights && (
        <Card className="border-2 border-stone-200">
          <CardContent className="p-4 text-sm text-stone-600">
            Insights are temporarily unavailable. You can still use the context above to guide your mentoring.
          </CardContent>
        </Card>
      )}

      {insights && !loadingInsights && (
        <>
          {insights.raw ? (
            <Card className="border-2 border-stone-200">
              <CardContent className="p-4 text-sm text-stone-700 whitespace-pre-wrap">{insights.raw}</CardContent>
            </Card>
          ) : (
            <>
              {insights.student_snapshot && (
                <Card className="bg-white border-2 border-emerald-200">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-stone-800"><Brain className="w-4 h-4 text-emerald-600" />Student Snapshot</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-stone-700 leading-relaxed">{insights.student_snapshot}</p></CardContent>
                </Card>
              )}

              {insights.alignment && (
                <Card className="bg-emerald-50/60 border-2 border-emerald-100">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-emerald-800"><Sparkles className="w-4 h-4" />Teacher–Student Fit</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-emerald-900 leading-relaxed">{insights.alignment}</p></CardContent>
                </Card>
              )}

              {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 && (
                <Card className="bg-white border-2 border-stone-200">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-stone-800"><Lightbulb className="w-4 h-4 text-amber-500" />Tailored Recommendations</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {insights.recommendations.map((r, i) => (
                      <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <p className="font-semibold text-sm text-stone-800">{r.title}</p>
                        <p className="text-sm text-stone-600 mt-1">{r.detail}</p>
                        {r.why && <p className="text-xs text-emerald-700 mt-1.5"><span className="font-semibold">Why:</span> {r.why}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {Array.isArray(insights.conversation_starters) && insights.conversation_starters.length > 0 && (
                <Card className="bg-white border-2 border-stone-200">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-stone-800"><MessageCircle className="w-4 h-4 text-stone-500" />Conversation Starters</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {insights.conversation_starters.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
                        <span className="text-emerald-500 mt-0.5">“</span>
                        <span className="italic">{s}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
