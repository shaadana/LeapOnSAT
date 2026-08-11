import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Brain, SearchX, CalendarClock, Heart } from 'lucide-react';

const principles = [
  {
    icon: Eye,
    title: 'Prediction before solution',
    text: 'Students learn to recognize what a problem is testing before jumping into steps.',
  },
  {
    icon: Brain,
    title: 'Retrieval over rewatching',
    text: "Students actively recall and solve, because watching someone else solve is not enough.",
  },
  {
    icon: SearchX,
    title: 'Mistake mining',
    text: "Wrong answers are not failures. They reveal the next skill to fix.",
  },
  {
    icon: CalendarClock,
    title: 'Spaced review',
    text: "Weak skills come back again later so students don't forget after one good session.",
  },
  {
    icon: Heart,
    title: 'Mentor mindset',
    text: "Tutors combine high standards with high support, so students feel challenged without feeling judged.",
  },
];

export default function ScienceSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      id="science"
      className="max-w-6xl mx-auto px-6 py-20"
    >
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4">
          Built on the science of engagement
        </h2>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto">
          Students do better when challenge feels respectful, mistakes feel useful, and practice feels purposeful.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {principles.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="text-base font-bold text-stone-900 mb-2">{p.title}</h4>
              <p className="text-sm text-stone-500 leading-relaxed">{p.text}</p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
