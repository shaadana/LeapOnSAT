import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const promises = [
  'Explain the reasoning behind each method.',
  'Use Desmos strategically, not as a shortcut without understanding.',
  'Ask students to predict, retrieve, and explain.',
  'Mine mistakes without shame.',
  'Balance syllabus coverage with student understanding.',
  'Use high standards and high support.',
];

export default function TutorPromiseSection() {
  return (
    <motion.section
      id="tutors"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-5xl mx-auto px-6 py-20"
    >
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border-2 border-emerald-200 p-8 md:p-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4">
            Our tutor promise
          </h2>
          <p className="text-lg text-stone-600 max-w-xl mx-auto">
            LeapOnSAT tutors don't just walk through answer keys. They are trained to:
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {promises.map((p) => (
            <div key={p} className="flex items-start gap-3 bg-white/70 rounded-xl p-4 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-stone-700">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
