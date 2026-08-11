import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XCircle, Target, ArrowLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import { useQuery } from '@tanstack/react-query';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';
import { answersEquivalent } from '@/utils/mathUtils';

export default function MistakesReviewMode({ user, subject, onPracticeSimilar, onBack, allQuestionsLookup }) {
  const [selectedMistake, setSelectedMistake] = useState(null);

  // Fetch past sessions for this subject
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: [`${subject}Sessions`, user?.id, 'mistakes_review'],
    queryFn: async () => {
      const entityName = subject === 'english' ? 'EnglishPracticeSession' : 'PracticeSession';
      return base44.entities[entityName].filter({ user_id: user.id, status: 'completed' }, '-end_time', 50);
    },
    enabled: !!user?.id,
  });

  const allQuestionIds = React.useMemo(() => {
    const ids = [];
    sessions.forEach(s => {
      (s.question_history || []).forEach(h => {
        if (!h.correct) ids.push(h.question_id || h.id);
      });
    });
    return Array.from(new Set(ids));
  }, [sessions]);

  const { data: latestAnswers } = useQuery({
    queryKey: ['latestAnswers', allQuestionIds],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestCorrectAnswers', { question_ids: allQuestionIds });
      return res.data?.answers || {};
    },
    enabled: allQuestionIds.length > 0
  });

  // Extract mistakes
  const mistakes = React.useMemo(() => {
    const list = [];
    const seenQs = new Set();
    sessions.forEach(s => {
      (s.question_history || []).forEach(h => {
        let isNowCorrect = h.correct;
        let latestCorrectAnswer = h.correct_answer;
        if (latestAnswers && latestAnswers[h.question_id || h.id]) {
          latestCorrectAnswer = latestAnswers[h.question_id || h.id];
          isNowCorrect = answersEquivalent(h.user_answer, latestCorrectAnswer);
        }

        if (!isNowCorrect && !seenQs.has(h.question_id)) {
          seenQs.add(h.question_id);
          // Try to attach full question data if we have it locally
          const fullQ = allQuestionsLookup?.find?.(q => q.id === h.question_id || `sat_${q.id}` === h.question_id) || {};
          const questionText = h.question_text || fullQ.question_text || fullQ.question;
          
          // Always include the mistake — use session history text as primary source
          list.push({
            ...h,
            question_text: questionText || '(Question text not available)',
            options: h.options || fullQ.options || null,
            correct_answer: h.correct_answer || fullQ.correct_answer || fullQ.correct || '?',
            explanation: h.explanation || fullQ.explanation || '',
          });
        }
      });
    });
    return list;
  }, [sessions, allQuestionsLookup]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <Card className="bg-emerald-50 border-2 border-emerald-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900 mb-2">No Mistakes Yet!</h2>
            <p className="text-emerald-700 mb-6">Complete some practice sessions to unlock your personalized mistake review.</p>
            <Button onClick={onBack} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Return to Practice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedMistake) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedMistake(null)} className="text-gray-500">
          <ArrowLeft className="w-4 h-4 mr-1" />Back to all mistakes
        </Button>

        <Card className="bg-white border-2 border-red-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-red-100 text-red-800 border-red-300">Past Mistake</Badge>
              <Badge variant="outline" className="capitalize">{selectedMistake.domain.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline" className="capitalize">{selectedMistake.difficulty || 'medium'}</Badge>
            </div>
            <p className="text-lg text-gray-800 mb-6 leading-relaxed">
              <MathText>{selectedMistake.question_text}</MathText>
            </p>
            
            {/* Show Answer Comparison */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                <p className="text-xs uppercase tracking-wide font-bold text-red-600 mb-1">Your Answer Was</p>
                <p className="text-base font-semibold text-red-900"><MathText>{selectedMistake.user_answer || '(None)'}</MathText></p>
              </div>
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide font-bold text-emerald-600 mb-1">Correct Answer</p>
                <p className="text-base font-semibold text-emerald-900"><MathText>{selectedMistake.correct_answer}</MathText></p>
              </div>
            </div>

            {selectedMistake.explanation && (
              <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <p className="text-sm font-bold text-stone-700 mb-2">Explanation</p>
                <p className="text-sm text-stone-600"><MathText>{selectedMistake.explanation}</MathText></p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-stone-100">
              <ReportQuestionModal 
                question={selectedMistake} 
                source={selectedMistake.source || selectedMistake.source_pdf}
                triggerElement={
                  <button className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Report Faulty Question
                  </button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Call to action: Practice Similar */}
        <div className="text-center p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-200">
          <h3 className="text-lg font-bold text-emerald-900 mb-2">Ready to master this concept?</h3>
          <p className="text-sm text-emerald-700 mb-4">Generate similar questions in <strong>{selectedMistake.domain.replace(/_/g, ' ')}</strong> to refine your skills.</p>
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
            onClick={() => onPracticeSimilar(selectedMistake.domain, selectedMistake.difficulty, JSON.stringify({
              question: selectedMistake.question_text,
              options: selectedMistake.options,
              correct_answer: selectedMistake.correct_answer,
              explanation: selectedMistake.explanation
            }))}
          >
            <Target className="w-5 h-5 mr-2" />
            Practice Similar Questions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <h2 className="text-2xl font-bold text-stone-800">Your Mistakes</h2>
      </div>
      
      <p className="text-stone-600">Review questions you've missed across all sessions. Tap any mistake to review the explanation and launch targeted practice.</p>

      <div className="grid md:grid-cols-2 gap-4">
        {mistakes.map((m, idx) => (
          <Card 
            key={`${m.question_id}-${idx}`} 
            className="cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all border-2 border-stone-200"
            onClick={() => setSelectedMistake(m)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{m.domain.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-sm text-stone-700 line-clamp-3 leading-relaxed">
                    <MathText>{m.question_text}</MathText>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
