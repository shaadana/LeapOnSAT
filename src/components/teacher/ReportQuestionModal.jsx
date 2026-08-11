import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Flag, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function ReportQuestionModal({ question, source, triggerElement }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setSubmitting(true);
    try {
      await base44.functions.invoke('reportFlaggedQuestion', {
        questionId: question.id,
        questionText: question.question_text,
        source: source || question.source || question.source_pdf || 'Unknown',
        feedback: feedback,
        teacherName: user?.full_name || user?.name || user?.email
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setFeedback('');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to report question. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setSuccess(false);
        setFeedback('');
      }
      setOpen(val);
    }}>
      <DialogTrigger asChild>
        {triggerElement || (
          <button 
            title="Flag an issue with this question"
            className="text-stone-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Question Issue</DialogTitle>
        </DialogHeader>
        
        {success ? (
          <div className="py-6 text-center text-emerald-600 space-y-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="font-bold text-lg">Report Submitted</p>
            <p className="text-sm text-stone-600">Thank you for helping improve our questions.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                What is wrong with this question?
              </label>
              <Textarea
                placeholder="e.g. Typo in option A, wrong correct answer, formatting issue..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="h-32"
              />
            </div>
            <p className="text-xs text-stone-500">
              This report will be sent directly to the admins along with the question ID and text.
            </p>
            <div className="flex justify-end pt-2 border-t">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !feedback.trim()}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flag className="w-4 h-4 mr-2" />}
                Submit Report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
