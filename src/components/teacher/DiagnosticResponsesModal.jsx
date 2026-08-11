import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import DiagnosticResponseList from './DiagnosticResponseList';

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { answersEquivalent } from '@/utils/mathUtils';

export default function DiagnosticResponsesModal({ responses, title, studentName, accuracy, trigger }) {
  const [open, setOpen] = useState(false);

  const questionIds = (responses || []).map(q => q.question_id || q.id);
  
  const { data: latestAnswers } = useQuery({
    queryKey: ['latestAnswers', questionIds],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestCorrectAnswers', { question_ids: questionIds });
      return res.data?.answers || {};
    },
    enabled: open && questionIds.length > 0
  });

  if (!responses || responses.length === 0) return null;

  let displayResponses = responses;
  if (latestAnswers) {
    displayResponses = responses.map(q => {
      const latestCorrect = latestAnswers[q.question_id || q.id];
      if (latestCorrect) {
        const isNowCorrect = answersEquivalent(q.user_answer, latestCorrect);
        return { ...q, correct_answer: latestCorrect, correct: isNowCorrect };
      }
      return q;
    });
  }

  const correct = displayResponses.filter(r => r.correct).length;
  const totalTime = displayResponses.reduce((s, r) => s + (r.time_spent_seconds || 0), 0);
  const avgTime = responses.length > 0 ? Math.round(totalTime / responses.length) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-emerald-600 hover:text-emerald-800">
            View <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-stone-50">
        <DialogHeader>
          <DialogTitle className="text-xl text-stone-800">
            {title || 'Diagnostic Responses'}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {studentName && <span className="font-bold text-stone-800">{studentName}</span>}
            <span className="text-stone-600">{correct}/{responses.length} Correct ({accuracy ?? Math.round((correct / responses.length) * 100)}%)</span>
            <span className="text-stone-600">Avg {avgTime}s / Q</span>
            <span className="text-stone-600">Total {Math.ceil(totalTime / 60)} min</span>
          </div>
          <DiagnosticResponseList responses={displayResponses} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
