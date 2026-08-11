import React from 'react';
import { motion } from 'framer-motion';
import { Target, Lightbulb, Pencil, HandHelping, SearchX, RotateCcw, MapPin } from 'lucide-react';

const steps = [
  { icon: Target, label: 'Skill Target', text: 'What is the SAT testing?' },
  { icon: Lightbulb, label: 'Concept Explanation', text: 'Why does the method work?' },
  { icon: Pencil, label: 'Worked Example', text: 'The tutor models the thinking.' },
  { icon: HandHelping, label: 'Guided Practice', text: 'The student solves with hints.' },
  { icon: SearchX, label: 'Mistake Mining', text: 'Errors become learning data.' },
  { icon: RotateCcw, label: 'Transfer Check', text: 'The student explains the pattern back.' },
  { icon: MapPin, label: 'Next-Step Plan', text: 'The platform recommends what to practice next.' },
];

export default function TutoringProtocol() {
  return (
    <motion.section
      id="tutoring"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-5xl mx-auto px-6 py-20"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 mb-4">
          How our tutoring works
        </h2>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto">
          Every LeapOnSAT tutoring session follows a learning loop — so students don't just watch solutions, they own them.
        </p>
      </div>

      {/* Numbered step cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.label}
              className="relative bg-white rounded-2xl border-2 border-emerald-100 p-5 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Step {idx + 1}</span>
              </div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">{step.label}</h4>
              <p className="text-xs text-stone-500 leading-relaxed">{step.text}</p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
