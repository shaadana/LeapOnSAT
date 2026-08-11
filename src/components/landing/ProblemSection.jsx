import React from 'react';
import { Search, MessageSquare, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProblemSection() {
  const columns = [
    {
      icon: Search,
      title: 'Diagnose',
      text: 'Find the exact skill gaps, careless-error patterns, and confidence blockers.',
      color: 'bg-rose-500',
    },
    {
      icon: MessageSquare,
      title: 'Teach',
      text: 'Human tutors explain the "why," model SAT thinking, and guide students through Desmos and algebra strategies.',
      color: 'bg-amber-500',
    },
    {
      icon: ArrowRightLeft,
      title: 'Transfer',
      text: 'Students practice, review mistakes, revisit weak areas, and prove they can solve similar problems later.',
      color: 'bg-emerald-500',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-6xl mx-auto px-6 py-20"
    >
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4">
          Not just practice. Not just tutoring.
        </h2>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto">
          Most SAT prep stops at questions. Most tutoring stops at explanations. LeapOnSAT connects both.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div key={col.title} className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-900/5 border-2 border-emerald-100 text-center hover:-translate-y-1 transition-transform">
              <div className={`w-14 h-14 ${col.color} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-md`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold text-stone-900 mb-3">{col.title}</h3>
              <p className="text-stone-600 leading-relaxed">{col.text}</p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
