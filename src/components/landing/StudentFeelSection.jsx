import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const statements = [
  "I understand why the step works.",
  "I know how to recognize this problem next time.",
  "I can use Desmos when it helps.",
  "I know what mistake I made and how to fix it.",
  "I feel more confident than when I started.",
];

export default function StudentFeelSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-5xl mx-auto px-6 py-20 text-center"
    >
      <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-3">
        Students should leave saying:
      </h2>
      <p className="text-lg text-stone-500 mb-10">"I know what to do next."</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {statements.map((s) => (
          <div key={s} className="bg-white rounded-2xl p-5 border-2 border-emerald-100 shadow-sm flex items-start gap-3 text-left">
            <Quote className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
            <p className="text-sm text-stone-700 font-medium italic">{s}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
