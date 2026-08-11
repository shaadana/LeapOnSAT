import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb, ChevronLeft, ChevronRight, Calculator, ListOrdered } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import { motion, AnimatePresence } from 'framer-motion';

export default function DesmosQuestionCard({ question, onComplete, onNext, onPrev, isFirst, isLast }) {
  const [selected, setSelected] = useState(null);
  const [freeInput, setFreeInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleSubmit = () => {
    const answer = question.type === 'mc' ? selected : freeInput.trim();
    const correct = question.type === 'mc'
      ? answer === question.correct
      : answer.toLowerCase().replace(/\s/g, '') === question.correct.toLowerCase().replace(/\s/g, '');
    setIsCorrect(correct);
    setAnswered(true);
    onComplete(correct);
  };

  const handleNext = () => {
    setSelected(null);
    setFreeInput('');
    setAnswered(false);
    setIsCorrect(false);
    setShowSteps(false);
    onNext();
  };

  const handlePrev = () => {
    setSelected(null);
    setFreeInput('');
    setAnswered(false);
    setIsCorrect(false);
    setShowSteps(false);
    onPrev();
  };

  return (
    <div className="space-y-4">
      {/* Question Card */}
      <Card className="bg-white border-2 border-emerald-100 rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
              Q{question.number}
            </Badge>
            <Badge variant="outline" className="text-xs text-stone-500">
              {question.category}
            </Badge>
          </div>

          <div className="text-gray-800 mb-6 leading-relaxed whitespace-pre-line text-base">
            <MathText>{question.text}</MathText>
          </div>

          {question.type === 'mc' ? (
            <div className="space-y-2">
              {question.options.map(opt => {
                let cls = 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40';
                if (answered) {
                  if (opt.label === question.correct) cls = 'border-emerald-500 bg-emerald-50';
                  else if (opt.label === selected) cls = 'border-red-400 bg-red-50';
                } else if (opt.label === selected) {
                  cls = 'border-emerald-400 bg-emerald-50/60';
                }
                return (
                  <div
                    key={opt.label}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${cls}`}
                    onClick={() => !answered && setSelected(opt.label)}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      answered && opt.label === question.correct ? 'bg-emerald-500 border-emerald-500 text-white' :
                      answered && opt.label === selected ? 'bg-red-500 border-red-500 text-white' :
                      opt.label === selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-gray-500'
                    }`}>
                      {opt.label}
                    </div>
                    <span className="text-sm text-gray-700 flex-1"><MathText>{opt.text}</MathText></span>
                    {answered && opt.label === question.correct && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                    {answered && opt.label === selected && opt.label !== question.correct && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <Input
                value={freeInput}
                onChange={e => setFreeInput(e.target.value)}
                disabled={answered}
                placeholder="Enter your answer..."
                className="text-base p-4 border-2 rounded-xl"
                onKeyDown={e => e.key === 'Enter' && !answered && freeInput && handleSubmit()}
              />
              {answered && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>Correct answer: <strong>{question.correct}</strong></span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation + Desmos Steps */}
      <AnimatePresence>
        {answered && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Result card */}
            <Card className={`border-2 rounded-2xl ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-300'}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className={`w-5 h-5 ${isCorrect ? 'text-emerald-600' : 'text-stone-500'}`} />
                  <span className={`font-semibold text-sm ${isCorrect ? 'text-emerald-900' : 'text-stone-800'}`}>
                    {isCorrect ? '✓ Correct!' : `✗ The correct answer is ${question.correct}`}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{question.explanation}</p>
              </CardContent>
            </Card>

            {/* Desmos Steps card — always shown */}
            {question.desmosSteps && question.desmosSteps.length > 0 && (
              <Card className="border-2 border-emerald-300 rounded-2xl bg-white">
                <CardContent className="p-5">
                  <button
                    onClick={() => setShowSteps(s => !s)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <Calculator className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-sm text-emerald-900">Desmos Method — Step by Step</span>
                    <span className="ml-auto text-xs text-emerald-500 font-medium">{showSteps ? 'Hide' : 'Show'}</span>
                  </button>

                  {showSteps && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                      <ol className="space-y-2">
                        {question.desmosSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="bg-stone-900 rounded-lg px-3 py-2 flex-1">
                              <code className="text-emerald-400 text-xs font-mono whitespace-pre-wrap">{step}</code>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={handlePrev} disabled={isFirst} className="border-stone-200 text-stone-600 rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {!answered ? (
          <Button
            onClick={handleSubmit}
            disabled={question.type === 'mc' ? !selected : !freeInput.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isLast} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
            Next Question <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
