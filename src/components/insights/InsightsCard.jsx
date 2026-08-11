import { motion } from 'framer-motion';

export function StatCard({ icon, label, value, sub, color }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border-2 border-stone-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-display font-bold text-emerald-900">{value}</div>
        <div className="text-sm font-medium text-stone-600">{label}</div>
        {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-stone-100 shadow-sm p-6">
      <h2 className="font-display font-bold text-stone-800 mb-5 flex items-center gap-2 text-lg">{icon}{title}</h2>
      {children}
    </div>
  );
}
