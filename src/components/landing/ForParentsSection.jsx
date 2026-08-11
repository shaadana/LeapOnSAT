import React from 'react';
import { motion } from 'framer-motion';

export default function ForParentsSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      id="parents"
      className="max-w-5xl mx-auto px-6 py-20"
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4">
          Parents see progress, not just attendance.
        </h2>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto">
          Parents buying tutoring need visibility. LeapOnSAT makes sure you never have to guess whether your student felt taught.
        </p>
      </div>
      <div className="max-w-xl mx-auto bg-white rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden">
        <div className="bg-emerald-600 px-6 py-4">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Sample Parent Report</p>
          <p className="text-white font-display text-lg mt-1">Weekly Session Summary</p>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "This week's focus", value: 'Systems of linear equations' },
            { label: 'Student win', value: 'Correctly identified overlap vs. parallel lines' },
            { label: 'Mistake pattern', value: 'Ratio setup errors in standard form' },
            { label: 'Tutor note', value: 'Needs more explanation before independent practice' },
            { label: 'Next step', value: '12 spaced review problems + 1 Desmos mini-lesson' },
          ].map((row) => (
            <div key={row.label} className="flex gap-3 text-sm">
              <span className="font-bold text-emerald-700 min-w-[140px] flex-shrink-0">{row.label}</span>
              <span className="text-stone-600">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
