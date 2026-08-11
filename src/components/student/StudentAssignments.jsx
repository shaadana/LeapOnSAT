import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Target, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AssignmentResultsModal from '../teacher/AssignmentResultsModal';

/**
 * Build the URL the student lands on when starting the assignment.
 * Encodes the teacher's full config so SATPractice can auto-start in
 * the exact mode + difficulty + domains + tools the teacher chose.
 */
function buildAssignmentUrl(assignment) {
  if (assignment.assignment_type === 'lesson') {
    const cfg = assignment.assignment_config || {};
    if (cfg.lesson_subject === 'english') {
      return `${createPageUrl('SATEnglishPractice')}?mode=lesson&domain=${cfg.lesson_domain || ''}&assignmentId=${assignment.id}`;
    }
    return `${createPageUrl('SATPractice')}?mode=lesson&domain=${cfg.lesson_domain || ''}&subtopic=${encodeURIComponent(cfg.lesson_subtopic || '')}&assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'diagnostic') {
    return `${createPageUrl('SATDiagnostic')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'english_diagnostic') {
    return `${createPageUrl('SATEnglishDiagnostic')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'independent_study') {
    return `${createPageUrl('IndependentStudy')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'supplemental_diagnostic') {
    const cfg = assignment.assignment_config || {};
    return `${createPageUrl('SATDiagnostic')}?assignmentId=${assignment.id}&supplementalLevel=${cfg.supplemental_level || 1}`;
  }
  if (assignment.assignment_type === 'document_markup') {
    return `${createPageUrl('DocumentMarkup')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'auto_extract') {
    return `${createPageUrl('AutoExtractPractice')}?assignmentId=${assignment.id}`;
  }
  if (assignment.assignment_type === 'canyon_pdf') {
    return `${createPageUrl('CanyonPDFPractice')}?assignmentId=${assignment.id}`;
  }

  // english_practice — route to SATEnglishPractice with config params
  if (assignment.assignment_type === 'english_practice') {
    const cfg = assignment.assignment_config || {};
    const params = new URLSearchParams();
    params.set('assignmentId', assignment.id);
    params.set('autoStart', '1');
    if (cfg.session_type)     params.set('type',       cfg.session_type);
    if (cfg.duration_minutes) params.set('duration',   String(cfg.duration_minutes));
    if (cfg.difficulty)       params.set('difficulty', cfg.difficulty);
    if (cfg.domains?.length)  params.set('topic',      cfg.domains.join(','));
    if (cfg.question_source)  params.set('source',     cfg.question_source);
    if (cfg.specific_question_ids?.length) {
      params.set('qids', cfg.specific_question_ids.join(','));
    }
    if (cfg.tools_enabled) {
      const off = Object.entries(cfg.tools_enabled)
        .filter(([, v]) => v === false)
        .map(([k]) => k);
      if (off.length) params.set('toolsOff', off.join(','));
    }
    return `${createPageUrl('SATEnglishPractice')}?${params.toString()}`;
  }

  // sat_practice — pack everything into the URL so the student lands inside the session
  const cfg = assignment.assignment_config || {};
  const params = new URLSearchParams();
  params.set('assignmentId', assignment.id);
  params.set('autoStart', '1');
  if (cfg.session_type)     params.set('type',       cfg.session_type);
  if (cfg.duration_minutes) params.set('duration',   String(cfg.duration_minutes));
  if (cfg.question_count)   params.set('count',      String(cfg.question_count));
  if (cfg.difficulty)       params.set('difficulty', cfg.difficulty);
  if (cfg.domains?.length)  params.set('topic',      cfg.domains.join(','));
  if (cfg.question_source)  params.set('source',     cfg.question_source);
  if (cfg.specific_question_ids?.length) {
    params.set('qids', cfg.specific_question_ids.join(','));
  }
  if (cfg.pyq_sources?.length) {
    params.set('pyqSources', cfg.pyq_sources.join(','));
  }
  if (cfg.tools_enabled) {
    const off = Object.entries(cfg.tools_enabled)
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    if (off.length) params.set('toolsOff', off.join(','));
  }
  return `${createPageUrl('SATPractice')}?${params.toString()}`;
}

export default function StudentAssignments({ user }) {
  const navigate = useNavigate();

  const { data: assignments } = useQuery({
    queryKey: ['studentAssignments', user?.id],
    queryFn: async () => {
      // Limit 1000 to prevent dropping older assignments
      const progress = await base44.entities.StudentAssignmentProgress.filter(
        { student_id: user.id },
        '-created_date',
        1000
      );

      if (!progress.length) return [];

      const assignmentIds = progress.map(p => p.assignment_id);
      
      let allAssignments = [];
      try {
        // Fetch assignments directly related to the student's progress.
        // We do NOT filter by status: 'active' so they can see previous/archived ones.
        allAssignments = await base44.entities.Assignment.filter({ 
          id: { $in: assignmentIds } 
        }, '-created_date', 1000);
      } catch (e) {
        // Bulletproof fallback: fetch individually but sequentially to avoid rate limits
        const uniqueIds = [...new Set(assignmentIds)];
        for (const id of uniqueIds) {
          try {
            const res = await base44.entities.Assignment.filter({ id });
            if (res && res.length) allAssignments.push(res[0]);
          } catch(err) {
            console.error("Failed to fetch assignment:", id, err);
          }
        }
      }

      const now = new Date();
      return progress.map((p) => {
        const assignment = allAssignments.find(a => a.id === p.assignment_id);
        if (!assignment) return null;
        
        // Filter out scheduled assignments that are not yet published
        if (assignment.publish_at && new Date(assignment.publish_at) > now) {
          return null;
        }

        return {
          ...assignment,
          progress: p,
        };
      }).filter(Boolean);
    },
    enabled: !!user?.id,
  });

  const handleStartAssignment = (assignment) => {
    navigate(buildAssignmentUrl(assignment));
  };

  const notStarted = assignments?.filter(a => a.progress?.status === 'not_started') || [];
  const inProgress = assignments?.filter(a => a.progress?.status === 'in_progress') || [];
  const completed = assignments?.filter(a => a.progress?.status === 'completed') || [];
  
  const hasAssignments = (notStarted.length + inProgress.length + completed.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
          <Target className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Your Assignments</h2>
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-600 uppercase">In Progress ({inProgress.length})</h3>
          <div className="grid gap-3">
            {inProgress.map((assignment, i) => (
              <motion.div key={assignment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-2 border-emerald-300 bg-emerald-50/40 hover:border-emerald-400 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-stone-900">{assignment.title}</h4>
                        <p className="text-sm text-stone-600">{assignment.description}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <Clock className="w-3 h-3 mr-1" /> In Progress
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">Progress</span>
                        <span className="font-semibold text-stone-900">{assignment.progress?.progress_percentage || 0}%</span>
                      </div>
                      <Progress value={assignment.progress?.progress_percentage || 0} className="h-2" />
                    </div>
                    <Button
                      onClick={() => handleStartAssignment(assignment)}
                      size="sm"
                      className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold"
                    >
                      Continue <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Not Started */}
      {notStarted.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-600 uppercase">Not Started ({notStarted.length})</h3>
          <div className="grid gap-3">
            {notStarted.map((assignment, i) => (
              <motion.div key={assignment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-2 border-stone-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-stone-900">{assignment.title}</h4>
                        <p className="text-sm text-stone-600">{assignment.description}</p>
                      </div>
                      <Badge variant="outline">Not Started</Badge>
                    </div>
                    {assignment.due_date && (
                      <p className="text-xs text-stone-500 mb-3">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    )}
                    <Button
                      onClick={() => handleStartAssignment(assignment)}
                      size="sm"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold"
                    >
                      Start <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-semibold text-stone-600 uppercase">Completed ({completed.length})</h3>
          <div className="grid gap-3">
            {completed.map((assignment, i) => (
              <motion.div key={assignment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-2 border-stone-200 bg-stone-50/50 hover:border-emerald-300 transition-colors opacity-80 hover:opacity-100">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-stone-900 line-through">{assignment.title}</h4>
                        <p className="text-sm text-stone-600">{assignment.description}</p>
                      </div>
                      <Badge className="bg-stone-200 text-stone-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> Completed
                      </Badge>
                      </div>
                      {assignment.progress?.score !== undefined && assignment.progress?.score !== null && (
                      <div className="mt-2 flex items-center justify-between p-2 bg-white rounded-lg border border-stone-100 mb-3">
                        <span className="text-sm font-medium text-stone-600">Score</span>
                        <span className="text-sm font-bold text-emerald-600">{assignment.progress.score}%</span>
                      </div>
                      )}
                      <div className="flex justify-end">
                      <AssignmentResultsModal 
                        assignment={assignment} 
                        progressList={[assignment.progress]} 
                        students={[{ user: user }]} 
                      />
                      </div>
                      </CardContent>
                      </Card>
                      </motion.div>
            ))}
          </div>
        </div>
      )}

      {!hasAssignments && (
        <Card className="border-2 border-dashed border-stone-300">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No assignments. Check back soon!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
