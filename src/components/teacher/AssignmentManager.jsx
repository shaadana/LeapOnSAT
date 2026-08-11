import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Plus, Trash2, CheckCircle, Clock, BarChart3, BookOpen, Search, X, Target, Lock, Unlock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import FileUploader from '../media/FileUploader';
import AttachmentRenderer from '../media/AttachmentRenderer';
import AssignmentResultsModal from './AssignmentResultsModal';
import MathText from '../sat/MathText';
import AssignmentPreviewModal from './AssignmentPreviewModal';
import ReportQuestionModal from './ReportQuestionModal';
import QuestionPicker from './QuestionPicker';

const DOMAINS = [
  'algebra', 'advanced_algebra', 'geometry', 'trigonometry',
  'statistics', 'problem_solving', 'systems_of_equations',
  'quadratics', 'exponentials', 'ratios_proportions', 'circles', 'polynomials'
];

const ENGLISH_DOMAINS = [
  'apostrophes', 'semicolons_periods', 'commas', 'colons', 'dashes',
  'conciseness', 'parallel_structure', 'subject_verb_agreement', 'pronoun_agreement',
  'verb_tense', 'adjectives_adverbs', 'modifiers', 'transitions', 'vocabulary',
  'reading_comprehension', 'main_idea', 'inference', 'evidence_support', 'tone_purpose'
];

const PYQ_SOURCES = [
  'PYQ-September2025', 'PYQ-October2025', 'PYQ-November2025', 'PYQ-May2025', 'PYQ-June2025'
];

const TOOL_DEFS = [
  { key: 'formula_sheet',         label: 'Formula Sheet' },
  { key: 'scientific_calculator', label: 'Scientific calculator' },
  { key: 'graphing_calculator',   label: 'Graphing calculator (Desmos)' },
  { key: 'scratch_pad',           label: 'Scratch pad' },
  { key: 'ai_tutor',              label: 'AI tutor on questions' },
  { key: 'explanations',          label: 'Show explanations after answering' },
];

const MATH_LESSON_SUBTOPICS = {
  algebra: ['Linear equations', 'Slope and intercepts', 'Functions & notation'],
  advanced_algebra: ['Completing the square', 'Rational expressions', 'Composition of functions'],
  geometry: ['Special right triangles', 'Similar figures', 'Volume of 3D solids'],
  trigonometry: ['SOH-CAH-TOA', 'Unit circle & radians', 'Law of sines and cosines'],
  statistics: ['Standard deviation', 'Margin of error', 'Normal distribution'],
  problem_solving: ['Percentages & percent change', 'Rate/work problems', 'Mixture problems'],
  systems_of_equations: ['Elimination method', 'Number of solutions', 'Linear-quadratic systems'],
  quadratics: ['Quadratic formula', 'Discriminant and roots', 'Vertex form'],
  exponentials: ['Exponential growth/decay', 'Fractional exponents', 'Exponential equations'],
  ratios_proportions: ['Direct and inverse variation', 'Proportions', 'Percent problems'],
  circles: ['Circle equation', 'Arc length and sector area', 'Tangent lines'],
  polynomials: ['Remainder theorem', "Vieta's formulas", 'Roots and multiplicity'],
};

const defaultTools = () => ({
  formula_sheet: true,
  scientific_calculator: true,
  graphing_calculator: true,
  scratch_pad: true,
  ai_tutor: true,
  explanations: true,
});

const emptyForm = {
  title: '',
  description: '',
  assignment_type: 'sat_practice',
  session_type: 'blitz',
  domains: [],
  duration_minutes: 30,
  question_count: 10,
  difficulty: 'mixed',
  question_source: 'general',
  pyq_sources: [],
  specific_question_ids: [],
  tools_enabled: defaultTools(),
  due_date: '',
  publish_at: '',
  lesson_subject: 'math',
  lesson_domain: '',
  lesson_subtopic: '',
  supplemental_level: 1,
  assign_to: 'all',
  specific_student_ids: [],
  attachments: [],
};

// QuestionPicker is now a standalone component in ./QuestionPicker.jsx

export default function AssignmentManager({ user, classes }) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: students } = useQuery({
    queryKey: ['classStudents', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const res = await base44.functions.invoke('getClassStudents', { class_id: selectedClass });
      return res.data?.students || [];
    },
    enabled: !!selectedClass,
  });

  const { data: assignments } = useQuery({
    queryKey: ['assignments', user?.id],
    queryFn: () => base44.entities.Assignment.filter({ teacher_id: user?.id }),
  });

  const { data: progress } = useQuery({
    queryKey: ['assignmentProgress', user?.id],
    queryFn: async () => {
      if (!assignments?.length) return [];
      const allProgress = await Promise.all(
        assignments.map(a => base44.entities.StudentAssignmentProgress.filter({ assignment_id: a.id }))
      );
      return allProgress.flat();
    },
    enabled: !!assignments?.length,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const practice_config = {
        domains: data.domains,
        session_type: data.assignment_type === 'sat_practice' ? undefined : data.session_type,
        duration_minutes: data.assignment_type === 'sat_practice' ? undefined : data.duration_minutes,
        question_count: data.assignment_type === 'sat_practice' ? data.question_count : undefined,
        difficulty: data.difficulty,
        question_source: data.question_source,
        specific_question_ids: data.question_source === 'specific' ? data.specific_question_ids : [],
        pyq_sources: data.question_source === 'pyq' ? data.pyq_sources : [],
        tools_enabled: data.tools_enabled,
        subject: data.assignment_type === 'english_practice' ? 'english' : 'math',
      };
      let finalConfig = practice_config;
      if (data.assignment_type === 'english_diagnostic') {
        finalConfig = { subject: 'english' };
      } else if (data.assignment_type === 'lesson') {
        finalConfig = { lesson_subject: data.lesson_subject, lesson_domain: data.lesson_domain, lesson_subtopic: data.lesson_subtopic };
      } else if (data.assignment_type === 'supplemental_diagnostic') {
        finalConfig = { supplemental_level: data.supplemental_level };
      } else if (data.assignment_type === 'canyon_pdf') {
        finalConfig = { specific_question_ids: data.specific_question_ids, tools_enabled: data.tools_enabled };
      }

      if (data.assignment_type === 'auto_extract' && data.attachments?.length > 0) {
        setIsExtracting(true);
        try {
          const res = await base44.functions.invoke('extractQuestions', { file_url: data.attachments[0].url });
          if (res.data?.questions) {
            finalConfig = { extracted_questions: res.data.questions };
          }
        } finally {
          setIsExtracting(false);
        }
      }

      const assignmentId = await base44.entities.Assignment.create({
        teacher_id: user.id,
        class_id: selectedClass,
        assignment_type: data.assignment_type,
        title: data.title,
        description: data.description,
        due_date: data.due_date,
        publish_at: data.publish_at,
        assignment_config: finalConfig,
        attachments: data.attachments || [],
      });
      const classData = classes.find(c => c.id === selectedClass);
      
      let targetStudentIds = [];
      if (data.assign_to === 'specific') {
        targetStudentIds = data.specific_student_ids || [];
      } else if (classData?.student_ids?.length) {
        targetStudentIds = classData.student_ids;
      }

      if (targetStudentIds.length > 0) {
        await Promise.all(
          targetStudentIds.map(studentId =>
            base44.entities.StudentAssignmentProgress.create({
              assignment_id: assignmentId.id,
              student_id: studentId,
              status: 'not_started',
            })
          )
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignmentProgress'] });
      setOpen(false);
      setFormData(emptyForm);
      setSelectedClass('');
    },
    onError: (err) => {
      console.error(err);
      alert('Failed to create assignment: ' + (err.response?.data?.error || err.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId) => base44.entities.Assignment.delete(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignmentProgress'] });
    },
  });

  const toggleDomain = (domain) => {
    setFormData(prev => ({
      ...prev,
      domains: prev.domains.includes(domain)
        ? prev.domains.filter(d => d !== domain)
        : [...prev.domains, domain]
    }));
  };

  const togglePyq = (src) => {
    setFormData(prev => ({
      ...prev,
      pyq_sources: prev.pyq_sources.includes(src)
        ? prev.pyq_sources.filter(s => s !== src)
        : [...prev.pyq_sources, src]
    }));
  };

  const toggleQuestionId = (id) => {
    setFormData(prev => ({
      ...prev,
      specific_question_ids: prev.specific_question_ids.includes(id)
        ? prev.specific_question_ids.filter(x => x !== id)
        : [...prev.specific_question_ids, id]
    }));
  };

  const toggleTool = (key) => {
    setFormData(prev => ({
      ...prev,
      tools_enabled: { ...prev.tools_enabled, [key]: !prev.tools_enabled[key] }
    }));
  };

  const getProgressStats = (assignmentId) => {
    const ap = progress?.filter(p => p.assignment_id === assignmentId) || [];
    const completedList = ap.filter(p => p.status === 'completed');
    
    // Compute each student's score from multiple sources
    const scores = completedList.map(p => {
      if (p.score != null) return p.score;
      // Fall back to question_history accuracy
      if (p.question_history?.length > 0) {
        const correct = p.question_history.filter(q => q.correct).length;
        return Math.round((correct / p.question_history.length) * 100);
      }
      return null;
    }).filter(s => s !== null);
    
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

    return {
      completed: completedList.length,
      inProgress: ap.filter(p => p.status === 'in_progress').length,
      notStarted: ap.filter(p => p.status === 'not_started').length,
      total: ap.length,
      avgScore
    };
  };

  const isCreateDisabled = !selectedClass || !formData.title || createMutation.isPending ||
    (formData.assignment_type === 'lesson' && !formData.lesson_domain) ||
    ((formData.assignment_type === 'sat_practice' || formData.assignment_type === 'english_practice') && formData.question_source === 'specific' && formData.specific_question_ids.length === 0) ||
    (formData.assignment_type === 'canyon_pdf' && formData.specific_question_ids.length === 0) ||
    (formData.assign_to === 'specific' && (!formData.specific_student_ids || formData.specific_student_ids.length === 0));

  const getAssignmentTypeLabel = (type) => {
    const labels = {
      sat_practice: 'SAT Math Practice',
      english_practice: 'SAT English Practice',
      lesson: 'Lesson',
      diagnostic: 'Math Diagnostic',
      english_diagnostic: 'English Diagnostic',
      supplemental_diagnostic: 'Supplemental Diagnostic',
      document_markup: 'Document Markup',
      auto_extract: 'Auto-Extract',
      canyon_pdf: 'CanyonMath Questions',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Assignments</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold">
              <Plus className="w-5 h-5 mr-2" /> Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
              {/* Left Column: General Info */}
              <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-2">Assign To</label>
                  <Select value={formData.assign_to} onValueChange={(val) => setFormData(prev => ({ ...prev, assign_to: val, specific_student_ids: [] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire Class</SelectItem>
                      <SelectItem value="specific">Specific Students</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.assign_to === 'specific' && (
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto border border-stone-200 rounded-lg p-2">
                      {students?.length === 0 && <p className="text-sm text-stone-500 p-2">Loading students or no students found.</p>}
                      {students?.map(s => (
                        <label key={s.user.id} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.specific_student_ids?.includes(s.user.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                specific_student_ids: checked 
                                  ? [...(prev.specific_student_ids || []), s.user.id] 
                                  : (prev.specific_student_ids || []).filter(id => id !== s.user.id)
                              }));
                            }}
                            className="w-4 h-4 accent-emerald-500"
                          />
                          <span className="text-sm text-stone-700">{s.user.name || s.user.full_name || s.user.email || 'Student'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">Title</label>
                <Input
                  placeholder="e.g. Week 3 SAT Practice"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">Description</label>
                <Textarea
                  placeholder="What is this assignment about?"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="h-20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">Attachments</label>
                <div className="flex gap-2 items-center flex-wrap bg-stone-50 p-2 rounded-lg border border-stone-200">
                  {formData.attachments?.map((att, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 py-1 px-2 bg-white">
                      {att.locked && <Lock className="w-3 h-3 text-amber-500" />}
                      <span className="truncate max-w-[150px]">{att.name}</span>
                      <button type="button" onClick={() => {
                        const newAtt = [...formData.attachments];
                        newAtt[idx] = { ...newAtt[idx], locked: !newAtt[idx].locked };
                        setFormData(prev => ({...prev, attachments: newAtt}));
                      }} className="text-amber-500 hover:text-amber-700 ml-1" title={att.locked ? "Unlock" : "Lock"}>
                        {att.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button type="button" onClick={() => setFormData(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)}))} className="text-stone-500 hover:text-stone-900 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <FileUploader 
                    onUploadComplete={(fileData) => setFormData(prev => ({...prev, attachments: [...(prev.attachments || []), fileData]}))} 
                  />
                </div>
              </div>

              {formData.assignment_type === 'document_markup' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm">
                  <strong>Note:</strong> For "Document Markup" assignments, students will be able to draw/write over the attached images and submit them. PDFs are also allowed but students will need to mark them up via standard tools or print.
                </div>
              )}
              {formData.assignment_type === 'auto_extract' && (
                <div className="bg-purple-50 border border-purple-200 text-purple-800 p-3 rounded-lg text-sm">
                  <strong>Note:</strong> Please attach a PDF or Image. We will automatically extract the questions into a standard quiz format when you click "Create Assignment". This may take up to 30 seconds.
                </div>
              )}
              </div>

              {/* Right Column: Specific Settings */}
              <div className="space-y-4 bg-stone-50/50 p-5 rounded-xl border border-stone-100">

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">Assignment Type</label>
                <Select value={formData.assignment_type} onValueChange={(val) => setFormData(prev => ({ ...prev, assignment_type: val, domains: [], specific_question_ids: [], question_source: 'general' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sat_practice">SAT Math Practice</SelectItem>
                    <SelectItem value="english_practice">SAT English Practice</SelectItem>
                    <SelectItem value="lesson">Lesson</SelectItem>
                    <SelectItem value="diagnostic">Math Diagnostic</SelectItem>
                    <SelectItem value="english_diagnostic">English Diagnostic</SelectItem>
                    <SelectItem value="supplemental_diagnostic">Supplemental Diagnostic</SelectItem>
                    <SelectItem value="document_markup">Document Markup</SelectItem>
                    <SelectItem value="auto_extract">Auto-Extract Questions (PDF/Image)</SelectItem>
                    <SelectItem value="canyon_pdf">CanyonMath Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.assignment_type === 'canyon_pdf' && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-2">Pick Questions</label>
                  <QuestionPicker
                    selectedIds={formData.specific_question_ids}
                    onToggle={toggleQuestionId}
                    canyonOnly={true}
                  />
                </div>
              )}

              {formData.assignment_type === 'supplemental_diagnostic' && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-2">Level</label>
                  <Select value={String(formData.supplemental_level)} onValueChange={(val) => setFormData(prev => ({ ...prev, supplemental_level: parseInt(val) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 (Beginner / Foundational)</SelectItem>
                      <SelectItem value="2">Level 2 (Intermediate)</SelectItem>
                      <SelectItem value="3">Level 3 (Advanced / Expert)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.assignment_type === 'lesson' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-stone-700 block mb-2">Subject</label>
                    <Select value={formData.lesson_subject} onValueChange={(val) => setFormData(prev => ({ ...prev, lesson_subject: val, lesson_domain: '', lesson_subtopic: '' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="math">SAT Math</SelectItem>
                        <SelectItem value="english">SAT English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-700 block mb-2">Domain</label>
                    <Select value={formData.lesson_domain} onValueChange={(val) => setFormData(prev => ({ ...prev, lesson_domain: val, lesson_subtopic: '' }))}>
                      <SelectTrigger><SelectValue placeholder="Select a domain" /></SelectTrigger>
                      <SelectContent>
                        {(formData.lesson_subject === 'math' ? DOMAINS : ENGLISH_DOMAINS).map(d => (
                          <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.lesson_subject === 'math' && formData.lesson_domain && MATH_LESSON_SUBTOPICS[formData.lesson_domain] && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Subtopic</label>
                      <Select value={formData.lesson_subtopic} onValueChange={(val) => setFormData(prev => ({ ...prev, lesson_subtopic: val }))}>
                        <SelectTrigger><SelectValue placeholder="Select a subtopic" /></SelectTrigger>
                        <SelectContent>
                          {MATH_LESSON_SUBTOPICS[formData.lesson_domain].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {(formData.assignment_type === 'sat_practice' || formData.assignment_type === 'english_practice') && (
                <>
                  {formData.assignment_type === 'english_practice' && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Session Type</label>
                      <Select value={formData.session_type} onValueChange={(val) => setFormData(prev => ({ ...prev, session_type: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blitz">Blitz (Fast)</SelectItem>
                          <SelectItem value="class">Class Mode</SelectItem>
                          <SelectItem value="choice">Student Choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.assignment_type === 'sat_practice' && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Question Selection Method</label>
                      <Select value={formData.question_source} onValueChange={(val) => setFormData(prev => ({ ...prev, question_source: val, specific_question_ids: [] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Select Amount & Domains</SelectItem>
                          <SelectItem value="specific">Pick Specific Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.assignment_type === 'english_practice' && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Question Selection Method</label>
                      <Select value={formData.question_source} onValueChange={(val) => setFormData(prev => ({ ...prev, question_source: val, specific_question_ids: [] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Select Domains & Duration</SelectItem>
                          <SelectItem value="specific">Pick Specific Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-stone-700 block mb-2">Difficulty</label>
                    <Select value={formData.difficulty} onValueChange={(val) => setFormData(prev => ({ ...prev, difficulty: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed (adaptive)</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(!((formData.assignment_type === 'sat_practice' || formData.assignment_type === 'english_practice') && (formData.question_source === 'specific'))) && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-3">
                        {formData.assignment_type === 'english_practice' ? 'English Domains' : 'Math Domains'} to Practice
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(formData.assignment_type === 'english_practice' ? ENGLISH_DOMAINS : DOMAINS).map(domain => (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => toggleDomain(domain)}
                            className={`p-2 rounded-lg text-sm font-medium transition-all capitalize ${
                              formData.domains.includes(domain)
                                ? 'bg-emerald-500 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {domain.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.assignment_type === 'english_practice' && formData.question_source !== 'specific' && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Duration (minutes)</label>
                      <Input
                        type="number"
                        min="5"
                        max="180"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                      />
                    </div>
                  )}

                  {formData.assignment_type === 'sat_practice' && formData.question_source === 'general' && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Question Amount</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.question_count}
                        onChange={(e) => setFormData(prev => ({ ...prev, question_count: parseInt(e.target.value) }))}
                      />
                    </div>
                  )}

                  {(formData.assignment_type === 'sat_practice' || formData.assignment_type === 'english_practice') && formData.question_source === 'specific' && (
                    <div>
                      <label className="text-sm font-medium text-stone-700 block mb-2">Pick Questions</label>
                      <QuestionPicker
                        selectedIds={formData.specific_question_ids}
                        onToggle={toggleQuestionId}
                        subject={formData.assignment_type === 'english_practice' ? 'english' : 'math'}
                      />
                    </div>
                  )}
                </>
              )}

              {(formData.assignment_type === 'sat_practice' || formData.assignment_type === 'english_practice' || formData.assignment_type === 'canyon_pdf') && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-2">Tools Available to Students</label>
                  <div className="space-y-2 rounded-lg border border-stone-200 p-3">
                    {TOOL_DEFS.filter(t => {
                      // Hide calculator tools for English assignments
                      if (formData.assignment_type === 'english_practice') {
                        return !['scientific_calculator', 'graphing_calculator', 'formula_sheet'].includes(t.key);
                      }
                      return true;
                    }).map(t => (
                      <label key={t.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!formData.tools_enabled[t.key]}
                          onChange={() => toggleTool(t.key)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-sm text-stone-700">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-2">Schedule Post Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.publish_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, publish_at: e.target.value }))}
                  />
                  <p className="text-xs text-stone-500 mt-1">Leave empty to post immediately.</p>
                </div>
              </div>

              </div>
            </div>

            <div className="pt-6 mt-6 border-t flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Preview Assignment
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={isCreateDisabled || isExtracting}
                className="bg-emerald-500 hover:bg-emerald-600 px-8 rounded-full font-bold"
              >
                {isExtracting ? 'Extracting Questions (may take 30s)...' : createMutation.isPending ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AssignmentPreviewModal 
          open={previewOpen} 
          onOpenChange={setPreviewOpen} 
          formData={formData} 
        />
      </div>

      <div className="grid gap-4">
        {assignments?.map(assignment => {
          const stats = getProgressStats(assignment.id);
          const classData = classes.find(c => c.id === assignment.class_id);
          const cfg = assignment.assignment_config || {};
          const disabledTools = cfg.tools_enabled
            ? Object.entries(cfg.tools_enabled).filter(([, v]) => v === false).map(([k]) => k)
            : [];
          return (
            <motion.div key={assignment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-stone-200 hover:border-emerald-300 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-stone-900">{assignment.title}</CardTitle>
                      <p className="text-sm text-stone-500 mt-1">{classData?.class_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap justify-end gap-2">
                        {assignment.publish_at && new Date(assignment.publish_at) > new Date() && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            Scheduled
                          </Badge>
                        )}
                        <Badge className={`capitalize ${
                          assignment.assignment_type === 'english_practice' || assignment.assignment_type === 'english_diagnostic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          {getAssignmentTypeLabel(assignment.assignment_type)}
                        </Badge>
                      </div>
                      {stats.total < (classData?.student_ids?.length || 0) && (
                        <span className="text-[10px] text-stone-400 font-medium px-1">Specific Students</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignment.description && (
                    <p className="text-sm text-stone-600">{assignment.description}</p>
                  )}
                  {assignment.attachments && assignment.attachments.length > 0 && (
                    <AttachmentRenderer attachments={assignment.attachments} />
                  )}

                  {assignment.assignment_type === 'lesson' && cfg.lesson_domain && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
                      <span className="capitalize">{cfg.lesson_subject}</span>
                      <span>·</span>
                      <span className="capitalize">{cfg.lesson_domain.replace(/_/g, ' ')}</span>
                      {cfg.lesson_subtopic && (
                        <><span>·</span><span>{cfg.lesson_subtopic}</span></>
                      )}
                    </div>
                  )}

                  {(assignment.assignment_type === 'sat_practice' || assignment.assignment_type === 'english_practice' || assignment.assignment_type === 'canyon_pdf') && (
                    <div className="flex flex-wrap gap-1">
                      {cfg.difficulty && cfg.difficulty !== 'mixed' && (
                        <Badge variant="outline" className="text-xs capitalize">Difficulty: {cfg.difficulty}</Badge>
                      )}
                      {cfg.question_count && (
                        <Badge variant="outline" className="text-xs capitalize">{cfg.question_count} Questions</Badge>
                      )}
                      {cfg.question_source && cfg.question_source !== 'general' && (
                        <Badge variant="outline" className="text-xs capitalize">Source: {cfg.question_source}</Badge>
                      )}
                      {assignment.assignment_type === 'canyon_pdf' && (
                        <Badge variant="outline" className="text-xs capitalize">Source: Specific</Badge>
                      )}
                      {cfg.specific_question_ids?.length > 0 && (
                        <Badge variant="outline" className="text-xs">{cfg.specific_question_ids.length} hand-picked</Badge>
                      )}
                      {cfg.domains?.map(d => (
                        <Badge key={d} variant="outline" className="text-xs capitalize">{d.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  )}

                  {disabledTools.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
                      <X className="w-3 h-3" /> Disabled tools:
                      {disabledTools.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px] capitalize">
                          {t.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-xs text-stone-500">Completed</p>
                        <p className="text-lg font-bold text-stone-900">{stats.completed}/{stats.total}</p>
                      </div>
                    </div>
                    {stats.avgScore !== null && (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-500" />
                        <div>
                          <p className="text-xs text-stone-500">Avg Score</p>
                          <p className="text-lg font-bold text-emerald-600">{stats.avgScore}%</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-xs text-stone-500">In Progress</p>
                        <p className="text-lg font-bold text-stone-900">{stats.inProgress}/{stats.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500">Not Started</p>
                        <p className="text-lg font-bold text-stone-900">{stats.notStarted}/{stats.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-stone-100 items-center">
                    {assignment.due_date && (
                      <p className="text-xs text-stone-500">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <AssignmentResultsModal assignment={assignment} progressList={progress} students={students || []} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(assignment.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
