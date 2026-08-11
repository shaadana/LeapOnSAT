import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AttachmentRenderer from '../media/AttachmentRenderer';
import MathText from '../sat/MathText';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import ReportQuestionModal from './ReportQuestionModal';
import { resolveQuestionIds } from '@/utils/questionResolver';

export default function AssignmentPreviewModal({ open, onOpenChange, formData }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    let isMounted = true;
    
    async function loadQuestions() {
      setLoading(true);
      try {
        let loadedQs = [];
        
        // Handle specific questions — resolve from any database via prefixed IDs
        if (formData.specific_question_ids?.length > 0) {
          const qids = formData.specific_question_ids;
          if (formData.assignment_type === 'canyon_pdf') {
            // canyon_pdf stores raw (unprefixed) IDs from Canyon databases
            const canyonRes = await base44.entities.CanyonMath.filter({ id: { $in: qids } });
            const pdfRes = await base44.entities.CanyonMathPDFsandGuidance.filter({ id: { $in: qids } });
            loadedQs = [...canyonRes, ...pdfRes];
          } else {
            const defaultEntity = formData.assignment_type === 'english_practice' ? 'EnglishQuestion' : 'SATQuestion';
            loadedQs = await resolveQuestionIds(qids, defaultEntity);
          }
        }
        // Handle auto extract - we can't show it easily because extraction runs at creation time.
        // But if they have extracted_questions (maybe not yet implemented this way), we'd show them.
        else if (formData.assignment_type === 'auto_extract') {
          // Can't preview easily unless we change the flow
        }
        // Handle general (randomly selected)
        else if (formData.question_source === 'general' && (formData.assignment_type === 'sat_practice' || formData.assignment_type === 'english_practice')) {
          const filter = {};
          if (formData.domains?.length > 0) {
            filter.domain = { $in: formData.domains };
          }
          if (formData.difficulty && formData.difficulty !== 'mixed') {
            filter.difficulty = formData.difficulty;
          }
          
          const entity = formData.assignment_type === 'english_practice' ? base44.entities.EnglishQuestion : base44.entities.SATQuestion;
          
          // Get a sample
          const res = await entity.filter(filter, '-created_date', formData.question_count || 10);
          loadedQs = res;
        }

        if (isMounted) {
          setQuestions(loadedQs);
        }
      } catch (err) {
        console.error("Preview fetch error", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    loadQuestions();
    
    return () => { isMounted = false; };
  }, [open, formData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>Preview Assignment: {formData.title || 'Untitled'}</DialogTitle>
          <p className="text-sm text-stone-500">
            Preview the questions and resources that will be included in this assignment.
            {formData.question_source === 'general' && " (Showing a random sample matching your criteria)"}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex bg-stone-50">
          {/* LEFT: Resources/Attachments */}
          <div className="w-1/2 p-6 overflow-y-auto border-r bg-white">
            <h3 className="font-bold text-lg mb-4 text-stone-800">Resources</h3>
            {formData.attachments?.length > 0 ? (
              <div className="space-y-4">
                <AttachmentRenderer attachments={formData.attachments} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-stone-200 rounded-xl text-stone-400">
                No attachments added
              </div>
            )}
            
            <div className="mt-8 space-y-2">
              <h4 className="font-semibold text-stone-700">Assignment Details</h4>
              <ul className="text-sm text-stone-600 space-y-1 list-disc pl-4">
                <li>Type: {formData.assignment_type}</li>
                {formData.difficulty && <li>Difficulty: <span className="capitalize">{formData.difficulty}</span></li>}
                {formData.duration_minutes > 0 && <li>Duration: {formData.duration_minutes} mins</li>}
                {formData.due_date && <li>Due: {formData.due_date}</li>}
              </ul>
            </div>
          </div>

          {/* RIGHT: Questions */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4 text-stone-800">Questions ({questions.length})</h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-40 text-emerald-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-6">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <span className="bg-stone-100 text-stone-700 px-2 py-1 rounded text-xs font-bold">
                        Q{i + 1}
                      </span>
                      <div className="flex gap-1 items-center">
                        {(q.domain || q.category) && (
                          <Badge variant="outline" className="text-[10px] capitalize">{(q.domain || q.category).replace(/_/g, ' ')}</Badge>
                        )}
                        {q.difficulty && (
                          <Badge variant="secondary" className="text-[10px] capitalize">{q.difficulty}</Badge>
                        )}
                        <ReportQuestionModal question={q} source={q.source || q.source_pdf} />
                      </div>
                    </div>
                    
                    <div className="text-sm text-stone-800 font-medium mb-4">
                      <MathText>{q.question_text}</MathText>
                    </div>
                    
                    {q.options?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correct_answer === opt.label || q.answer === opt.label;
                          return (
                            <div 
                              key={oIdx} 
                              className={`flex items-start gap-2 p-2 rounded text-sm ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-stone-50 border border-stone-100'}`}
                            >
                              <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-stone-500'}`}>{opt.label}.</span>
                              <span className={isCorrect ? 'text-emerald-800' : 'text-stone-700'}>
                                <MathText>{opt.text}</MathText>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {!q.options?.length && (q.correct_answer || q.answer) && (
                      <div className="mb-4 text-sm bg-emerald-50 p-2 rounded border border-emerald-200">
                        <span className="font-bold text-emerald-700">Correct Answer: </span>
                        <span className="text-emerald-800"><MathText>{q.correct_answer || q.answer}</MathText></span>
                      </div>
                    )}
                    
                    {q.explanation && (
                      <div className="text-xs text-stone-500 mt-2 pt-2 border-t border-stone-100">
                        <strong>Explanation:</strong> <MathText>{q.explanation}</MathText>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-stone-200 rounded-xl text-stone-400">
                No questions found for this configuration.
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
