import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Award, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BadgeChip from './BadgeChip';

/**
 * Shown after a practice session completes to celebrate XP, level-ups, and badges.
 * `reward` shape: { xpGained, coinsGained, leveledUp, oldLevel, newLevel, newlyEarnedBadges, isPerfect }
 */
export default function SessionRewardModal({ reward, onClose }) {
  useEffect(() => {
    if (!reward) return;
    if (reward.leveledUp || reward.newlyEarnedBadges?.length || reward.isPerfect) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#10b981', '#34d399', '#6ee7b7', '#0d9488'] });
    }
  }, [reward]);

  if (!reward) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-200 max-w-sm w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Righteous, sans-serif' }}>
              {reward.isPerfect ? 'Flawless Session!' : 'Session Complete!'}
            </h2>
          </div>

          {/* XP & coins gained */}
          <div className="flex items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-2xl font-bold text-emerald-700">+{reward.xpGained}</p>
              <p className="text-[10px] text-emerald-600 uppercase font-semibold">XP</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-center">
              <p className="text-2xl font-bold text-teal-700">+{reward.coinsGained} 🪙</p>
              <p className="text-[10px] text-teal-600 uppercase font-semibold">Coins</p>
            </div>
          </div>

          {/* Level up */}
          {reward.leveledUp && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl p-3 flex items-center gap-3"
            >
              <ArrowUp className="w-6 h-6" />
              <div className="flex-1">
                <p className="text-xs uppercase font-semibold opacity-80">Level Up!</p>
                <p className="text-lg font-bold">{reward.oldLevel} → {reward.newLevel}</p>
              </div>
            </motion.div>
          )}

          {/* EF-tailored bonuses */}
          {reward.efBonuses?.length > 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-3 border border-teal-200"
            >
              <p className="text-xs uppercase font-semibold text-teal-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Personalized Bonus{reward.efBonuses.length > 1 ? 'es' : ''}
              </p>
              <div className="space-y-1.5">
                {reward.efBonuses.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-teal-700 whitespace-nowrap">+{b.amount} XP</span>
                    <span className="text-stone-600 leading-tight">
                      <span className="font-semibold text-stone-700">{b.label}</span> — {b.reason}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Badges */}
          {reward.newlyEarnedBadges?.length > 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200"
            >
              <p className="text-xs uppercase font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> New Badge{reward.newlyEarnedBadges.length > 1 ? 's' : ''}!
              </p>
              <div className="flex gap-2 justify-center">
                {reward.newlyEarnedBadges.map(b => <BadgeChip key={b.id} badge={b} earned size="md" />)}
              </div>
            </motion.div>
          )}

          <Button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
            Keep Going
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
