import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Timer, AlertTriangle, Sparkles, Calculator } from 'lucide-react';

const gaps = [
  { icon: BookOpen, issue: 'If the issue is algebra:', fix: 'concept explanation + targeted practice.' },
  { icon: Timer, issue: 'If the issue is timing:', fix: 'strategy + pacing drills.' },
  { icon: AlertTriangle, issue: 'If the issue is careless errors:', fix: 'mistake log + review routines.' },
  { icon: Sparkles, issue: 'If the issue is confidence:', fix: 'guided wins + mentor support.' },
  { icon: Calculator, issue: 'If the issue is Desmos:', fix: 'digital SAT calculator strategies.' },
];

export default function ForStudentsSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      id="students"
      className="max-w-5xl mx-auto px-6 py-20"
    >
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border-2 border-emerald-200 p-8 md:p-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4 text-center">
          Starting in the 500s?
        </h2>
        <p className="text-center text-lg text-stone-600 mb-3 max-w-xl mx-auto">
          You don't need more random practice. You need a clearer path.
        </p>
        <p className="text-center text-sm text-stone-500 mb-10 max-w-2xl mx-auto">
          A 550 SAT score usually doesn't mean the student is incapable. It often means there are gaps in algebra fluency, problem recognition, timing, confidence, or test strategy. LeapOnSAT identifies which gaps matter most and builds a plan around them.
        </p>
        <div className="space-y-4 max-w-lg mx-auto">
          {gaps.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.issue} className="flex items-start gap-4 bg-white/70 rounded-xl p-4 border border-emerald-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 text-sm">{g.issue}</span>
                  <span className="text-sm text-stone-600 ml-1">{g.fix}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
