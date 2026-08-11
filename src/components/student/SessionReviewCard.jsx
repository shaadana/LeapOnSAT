import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Star } from 'lucide-react';
import { toast } from 'sonner';

const QUESTIONS = [
  { key: 'understood_steps', text: 'I understood why the steps worked.' },
  { key: 'could_solve_tomorrow', text: 'I could solve a similar problem tomorrow.' },
  { key: 'pace_felt_right', text: 'The pace felt right.' },
  { key: 'comfortable_asking', text: 'I felt comfortable asking questions.' },
  { key: 'know_what_to_practice', text: 'I know what to practice next.' },
];

export default function SessionReviewCard({ form }) {
  const [responses, setResponses] = useState({});
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () =>
      base44.entities.SessionReviewForm.update(form.id, {
        status: 'completed',
        responses,
        completed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingReviews']);
      toast.success('Review submitted! Keep up the great work.');
    },
  });

  const allAnswered = QUESTIONS.every(q => responses[q.key]);

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Session Review</h3>
          <p className="text-xs text-stone-500">Your tutor wants to hear how the session felt. Rate each statement.</p>
        </div>
      </div>

      <div className="space-y-3">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="bg-white/70 rounded-xl p-3 border border-amber-100">
            <p className="text-xs text-stone-700 font-medium mb-2">{q.text}</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  onClick={() => setResponses(r => ({ ...r, [q.key]: val }))}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    responses[q.key] === val
                      ? 'bg-amber-500 text-white shadow-md scale-110'
                      : 'bg-stone-100 text-stone-500 hover:bg-amber-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => submitMutation.mutate()}
        disabled={!allAnswered || submitMutation.isPending}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold shadow-lg"
      >
        {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}
