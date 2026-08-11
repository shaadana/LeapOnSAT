import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, Plus, CheckCircle2, ClipboardCheck, ChevronDown, Mail } from 'lucide-react';
import { toast } from 'sonner';

const REVIEW_QUESTIONS = [
  'I understood why the steps worked.',
  'I could solve a similar problem tomorrow.',
  'The pace felt right.',
  'I felt comfortable asking questions.',
  'I know what to practice next.',
];

export default function SessionSummaryManager({ user, classes }) {
  const [showSummaryForm, setShowSummaryForm] = useState(false);
  const [showReviewPush, setShowReviewPush] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [summaryData, setSummaryData] = useState({
    focus_topic: '',
    student_win: '',
    mistake_pattern: '',
    tutor_note: '',
    next_step: '',
  });
  const queryClient = useQueryClient();

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const { data: students = [] } = useQuery({
    queryKey: ['classStudentsForSummary', selectedClassId],
    queryFn: async () => {
      if (!selectedClass?.student_ids?.length) return [];
      const res = await base44.functions.invoke('getClassStudents', { class_id: selectedClassId });
      return res.data?.students || [];
    },
    enabled: !!selectedClass?.student_ids?.length,
  });

  const { data: summaries = [] } = useQuery({
    queryKey: ['sessionSummaries', user?.id],
    queryFn: () => base44.entities.SessionSummary.filter({ teacher_id: user?.id }, '-created_date', 20),
    enabled: !!user?.id,
  });

  const { data: reviewForms = [] } = useQuery({
    queryKey: ['sessionReviewForms', user?.id],
    queryFn: () => base44.entities.SessionReviewForm.filter({ teacher_id: user?.id }, '-created_date', 20),
    enabled: !!user?.id,
  });

  const selectedStudent = students.find(s => s.user?.id === selectedStudentId);
  const selectedStudentName = selectedStudent?.user?.name || selectedStudent?.user?.full_name || 'Student';

  const createSummaryMutation = useMutation({
    mutationFn: async () => {
      const summary = await base44.entities.SessionSummary.create({
        teacher_id: user.id,
        student_id: selectedStudentId,
        student_name: selectedStudentName,
        class_id: selectedClassId,
        session_date: new Date().toISOString().split('T')[0],
        ...summaryData,
        sent_to_parent: true,
      });

      // Auto-send to all parents in the student's families
      const res = await base44.functions.invoke('sendSummaryToParents', {
        student_id: selectedStudentId,
        student_name: selectedStudentName,
        ...summaryData,
      });

      return { summary, parentResult: res.data };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['sessionSummaries']);
      setShowSummaryForm(false);
      setSummaryData({ focus_topic: '', student_win: '', mistake_pattern: '', tutor_note: '', next_step: '' });
      setSelectedStudentId('');
      const sent = result?.parentResult?.sent || 0;
      toast.success(sent > 0 
        ? `Summary saved and emailed to ${sent} parent${sent > 1 ? 's' : ''}!` 
        : 'Summary saved! (No parent families found for this student)');
    },
  });

  const pushReviewMutation = useMutation({
    mutationFn: () =>
      base44.entities.SessionReviewForm.create({
        teacher_id: user.id,
        student_id: selectedStudentId,
        class_id: selectedClassId,
        status: 'pending',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sessionReviewForms']);
      setShowReviewPush(false);
      setSelectedStudentId('');
      toast.success('Review form pushed to student\'s study plan!');
    },
  });

  const isSummaryValid = selectedStudentId && summaryData.focus_topic;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-display font-bold text-stone-900">Session Tools</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSummaryForm(true)}
            className="bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold shadow-lg"
          >
            <FileText className="w-4 h-4 mr-2" />
            New Summary
          </Button>
          <Button
            onClick={() => setShowReviewPush(true)}
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full font-bold"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Push Review Form
          </Button>
        </div>
      </div>

      {/* Recent summaries */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-600 uppercase tracking-wider">Recent Summaries</h3>
          {summaries.length === 0 && (
            <p className="text-sm text-stone-400 py-4">No session summaries yet.</p>
          )}
          {summaries.map((s) => (
            <Card key={s.id} className="border-2 border-emerald-100 rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">{s.student_name || 'Student'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{s.session_date}</span>
                    {s.sent_to_parent && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                        <Mail className="w-3 h-3 mr-1" /> Sent
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs space-y-1 text-stone-600">
                  <p><span className="font-semibold text-emerald-700">Focus:</span> {s.focus_topic}</p>
                  {s.student_win && <p><span className="font-semibold text-emerald-700">Win:</span> {s.student_win}</p>}
                  {s.mistake_pattern && <p><span className="font-semibold text-amber-600">Pattern:</span> {s.mistake_pattern}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-600 uppercase tracking-wider">Recent Review Forms</h3>
          {reviewForms.length === 0 && (
            <p className="text-sm text-stone-400 py-4">No review forms pushed yet.</p>
          )}
          {reviewForms.map((f) => {
            const st = students.find(s => s.user?.id === f.student_id);
            return (
              <Card key={f.id} className="border-2 border-emerald-100 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">{st?.user?.name || st?.user?.full_name || 'Student'}</span>
                    <Badge className={f.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {f.status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                  {f.status === 'completed' && f.responses && (
                    <div className="mt-2 space-y-1">
                      {REVIEW_QUESTIONS.map((q, idx) => {
                        const keys = ['understood_steps', 'could_solve_tomorrow', 'pace_felt_right', 'comfortable_asking', 'know_what_to_practice'];
                        const val = f.responses[keys[idx]];
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 truncate mr-2">{q}</span>
                            <span className="font-bold text-emerald-600">{val}/5</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* New Summary Dialog */}
      <Dialog open={showSummaryForm} onOpenChange={setShowSummaryForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Weekly Session Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudentId(''); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClassId && (
              <div>
                <Label>Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.user?.id} value={s.user?.id}>
                        {s.user?.name || s.user?.full_name || s.user?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>This week's focus</Label>
              <Input
                value={summaryData.focus_topic}
                onChange={e => setSummaryData(d => ({ ...d, focus_topic: e.target.value }))}
                placeholder="e.g., Systems of linear equations"
              />
            </div>
            <div>
              <Label>Student win</Label>
              <Input
                value={summaryData.student_win}
                onChange={e => setSummaryData(d => ({ ...d, student_win: e.target.value }))}
                placeholder="e.g., Correctly identified overlap vs. parallel lines"
              />
            </div>
            <div>
              <Label>Mistake pattern</Label>
              <Input
                value={summaryData.mistake_pattern}
                onChange={e => setSummaryData(d => ({ ...d, mistake_pattern: e.target.value }))}
                placeholder="e.g., Ratio setup errors in standard form"
              />
            </div>
            <div>
              <Label>Tutor note</Label>
              <Textarea
                value={summaryData.tutor_note}
                onChange={e => setSummaryData(d => ({ ...d, tutor_note: e.target.value }))}
                placeholder="e.g., Needs more explanation before independent practice"
                className="h-16"
              />
            </div>
            <div>
              <Label>Next step</Label>
              <Input
                value={summaryData.next_step}
                onChange={e => setSummaryData(d => ({ ...d, next_step: e.target.value }))}
                placeholder="e.g., 12 spaced review problems + 1 Desmos mini-lesson"
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-stone-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                This summary will be automatically emailed to all parents in the student's families.
              </p>
            </div>
            <Button
              onClick={() => createSummaryMutation.mutate()}
              disabled={!isSummaryValid || createSummaryMutation.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold shadow-lg"
            >
              {createSummaryMutation.isPending ? 'Saving & emailing...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Save & Send to Parents
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Push Review Form Dialog */}
      <Dialog open={showReviewPush} onOpenChange={setShowReviewPush}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Push Session Review Form</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">
            This will add a 5-question review form to the top of the student's study plan. They'll rate their session before continuing.
          </p>
          <div className="bg-stone-50 rounded-xl p-4 space-y-2 border border-stone-200 my-2">
            {REVIEW_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-stone-600">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                {q}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudentId(''); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClassId && (
              <div>
                <Label>Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.user?.id} value={s.user?.id}>
                        {s.user?.name || s.user?.full_name || s.user?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={() => pushReviewMutation.mutate()}
              disabled={!selectedStudentId || pushReviewMutation.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold shadow-lg"
            >
              {pushReviewMutation.isPending ? 'Pushing...' : (
                <>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Push to Student
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
