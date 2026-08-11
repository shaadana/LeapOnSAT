import React from 'react';
import { Users, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsBar({ stats }) {
  const items = [
    { icon: Users, value: stats?.usersOnboarded, label: 'Users Onboarded' },
    { icon: CheckCircle2, value: stats?.questionsSolved, label: 'Questions Solved' },
    { icon: Clock, value: stats ? Math.round(stats.timeSpentMinutes) : null, label: 'Minutes Practiced' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto px-6"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border-2 border-emerald-100 flex flex-col items-center">
            <Icon className="w-8 h-8 text-emerald-600 mb-3" />
            <h4 className="text-4xl font-display font-bold text-emerald-700">
              {item.value != null ? item.value.toLocaleString() : '-'}
            </h4>
            <p className="text-sm font-bold text-slate-800/80 uppercase tracking-wider mt-2">{item.label}</p>
          </div>
        );
      })}
    </motion.div>
  );
}
