import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck } from 'lucide-react';

const questions = [
  'I understood why the steps worked.',
  'I could solve a similar problem tomorrow.',
  'The pace felt right.',
  'I felt comfortable asking questions.',
  'I know what to practice next.',
];

export default function QualityCheckSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-4xl mx-auto px-6 py-20"
    >
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <ClipboardCheck className="w-7 h-7 text-emerald-700" />
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4">
          Session quality check
        </h2>
        <p className="text-stone-600 max-w-xl mx-auto">
          After every session, students answer five quick questions so we catch issues early.
        </p>
      </div>
      <div className="max-w-md mx-auto space-y-3">
        {questions.map((q, idx) => (
          <div key={q} className="flex items-center gap-4 bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {idx + 1}
            </div>
            <p className="text-sm text-stone-700">{q}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
