import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, Loader2, ArrowLeft, Trophy, Target } from 'lucide-react';
import CalculatorPanel from './CalculatorPanel';

export default function UnitQuiz({ unit, domain, domainLabel, quizType, onComplete, onBack }) {
  const [phase, setPhase] = useState('loading');
  const [quiz, setQuiz] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);

  const loadQuiz = async () => {
    setPhase('loading');
    const res = await base44.functions.invoke('generateUnitQuiz', {
      domain,
      domainLabel,
      unitTitle: unit.title,
      lessons: unit.lessons,
      quizType,
    });
    setQuiz(res.data);
    setIndex(0);
    setSelected('');
    setAnswered(false);
    setResults([]);
    setPhase('quiz');
  };

  React.useEffect(() => { loadQuiz(); }, []);

  if (phase === 'loading') {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="font-semibold text-stone-800">
          {quizType === 'unit_test' ? 'Building your unit test...' : 'Building checkpoint quiz...'}
        </p>
        <p className="text-sm text-stone-500 mt-1">Computing all answers to ensure accuracy</p>
      </div>
    );
  }

  if (!quiz) return null;

  if (phase === 'results') {
    const score = results.filter(r => r.correct).length;
    const total = quiz.questions.length;
    const pct = Math.round((score / total) * 100);
    const passed = pct >= (quizType === 'unit_test' ? 70 : 60);

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-4">
        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-xl ${passed ? 'bg-emerald-500' : 'bg-amber-400'}`}>
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900 mb-1">
            {quizType === 'unit_test' ? 'Unit Test Complete!' : 'Checkpoint Complete!'}
          </h2>
          <p className="text-stone-500">{quiz.title}</p>
        </div>
        <div className={`inline-block rounded-2xl border-2 px-8 py-4 ${passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-4xl font-bold ${passed ? 'text-emerald-700' : 'text-amber-600'}`}>{pct}%</p>
          <p className="text-sm text-stone-600">{score}/{total} correct</p>
          <p className={`text-sm font-semibold mt-1 ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
            {passed ? '✓ Passed!' : '✗ Review lessons and retry'}
          </p>
        </div>

        {/* Per-question review */}
        <div className="text-left space-y-2 max-h-64 overflow-y-auto px-1">
          {quiz.questions.map((q, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${results[i]?.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              {results[i]?.correct
                ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-medium text-stone-700 line-clamp-2">{q.question}</p>
                {!results[i]?.correct && (
                  <p className="text-xs text-stone-500 mt-0.5">Correct: {q.correct} — {q.explanation}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          {!passed && (
            <Button variant="outline" onClick={loadQuiz} className="rounded-full border-stone-300">
              Retry Quiz
            </Button>
          )}
          <Button onClick={() => onComplete({ score, total, passed })} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
            {passed ? 'Continue' : 'Back to Unit'} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    );
  }

  const q = quiz.questions[index];
  const total = quiz.questions.length;

  const handleAnswer = (letter) => {
    if (answered) return;
    setSelected(letter);
    setAnswered(true);
    setResults(r => [...r, { correct: letter === q.correct }]);
  };

  const handleNext = () => {
    if (index < total - 1) {
      setIndex(i => i + 1);
      setSelected('');
      setAnswered(false);
    } else {
      setPhase('results');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <Badge className={`mb-1 ${quizType === 'unit_test' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
            {quizType === 'unit_test' ? '🎯 Unit Test' : '📝 Checkpoint Quiz'}
          </Badge>
          <p className="text-sm font-semibold text-stone-700">Question {index + 1} of {total}</p>
          <Progress value={((index) / total) * 100} className="h-1.5 w-32 mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-emerald-600 font-bold">{results.filter(r => r.correct).length}/{results.length} ✓</span>
          <CalculatorPanel />
        </div>
      </div>

      <Card className="border-2 border-white shadow-xl rounded-2xl">
        <CardContent className="p-5">
          {q.topic && <p className="text-xs text-stone-400 mb-2 font-medium uppercase tracking-wide">{q.topic}</p>}
          <p className="font-medium text-stone-800 mb-5 leading-relaxed">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const letter = opt[0];
              const isSelected = selected === letter;
              const isCorrect = letter === q.correct;
              let cls = 'border-2 border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50';
              if (answered) {
                if (isCorrect) cls = 'border-2 border-emerald-500 bg-emerald-50';
                else if (isSelected) cls = 'border-2 border-red-400 bg-red-50';
                else cls = 'border-2 border-stone-100 bg-stone-50 opacity-50';
              }
              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => handleAnswer(letter)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${cls}`}
                >
                  <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{letter}</span>
                  <span className="text-sm text-stone-700">{opt.slice(3)}</span>
                  {answered && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
                  {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                </button>
              );
            })}
          </div>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <div className={`rounded-xl p-4 border-2 ${selected === q.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-300'}`}>
                <p className="text-xs font-bold mb-1 text-stone-600">
                  {selected === q.correct ? '✓ Correct!' : `✗ Correct answer: ${q.correct}`}
                </p>
                <p className="text-sm text-stone-700">{q.explanation}</p>
              </div>
              <Button onClick={handleNext} className="w-full mt-3 bg-stone-700 hover:bg-stone-800 text-white rounded-full">
                {index < total - 1 ? 'Next Question' : 'See Results'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
