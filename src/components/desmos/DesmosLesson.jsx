import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Lightbulb, Calculator, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from '@/components/sat/MathText';
import DesmosTipCard from './DesmosTipCard';
import DesmosCalculatorEmbed from './DesmosCalculatorEmbed';
import DesmosQuestionCard from './DesmosQuestionCard';

const TABS = ['Tips & Hacks', 'Practice Questions', 'Desmos Calculator'];

export default function DesmosLesson({ lesson, onBack }) {
  const [activeTab, setActiveTab] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [completed, setCompleted] = useState([]);

  const handleQuestionComplete = (correct) => {
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setCompleted(prev => [...prev, questionIndex]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 underline">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="bg-emerald-500 rounded-[2rem] p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">{lesson.emoji}</div>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Righteous, sans-serif' }}>{lesson.title}</h1>
            <p className="text-white/80 text-sm">{lesson.subtitle}</p>
          </div>
        </div>
        {score.total > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-sm">
              <span className="font-bold">{score.correct}/{score.total}</span> correct so far
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-sm">
              {Math.round((score.correct / score.total) * 100)}% accuracy
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-stone-100 rounded-2xl p-1.5">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === i ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div key="tips" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <p className="text-sm text-stone-500 font-medium">Core strategies for this module — try each one in the Desmos Calculator tab!</p>
            {lesson.tips.map((tip, i) => (
              <DesmosTipCard key={i} tip={tip} index={i} onTryIt={() => setActiveTab(2)} />
            ))}
          </motion.div>
        )}

        {activeTab === 1 && (
          <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Question progress */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5 flex-wrap">
                {lesson.questions.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setQuestionIndex(i)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                      i === questionIndex ? 'bg-emerald-500 text-white' :
                      completed.includes(i) ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <span className="text-sm text-stone-500">{questionIndex + 1} / {lesson.questions.length}</span>
            </div>

            <DesmosQuestionCard
              question={lesson.questions[questionIndex]}
              onComplete={handleQuestionComplete}
              onNext={() => setQuestionIndex(i => Math.min(i + 1, lesson.questions.length - 1))}
              onPrev={() => setQuestionIndex(i => Math.max(i - 1, 0))}
              isFirst={questionIndex === 0}
              isLast={questionIndex === lesson.questions.length - 1}
            />
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div key="calculator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DesmosCalculatorEmbed />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
