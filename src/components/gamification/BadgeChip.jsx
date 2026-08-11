import React from 'react';

/**
 * Badge chip — earned state uses an emerald gradient (no amber).
 * Locked badges are de-saturated stone.
 */
export default function BadgeChip({ badge, earned = false, size = 'md' }) {
  if (!badge) return null;
  const sizeCls = size === 'sm'
    ? 'w-12 h-12 text-xl'
    : 'w-16 h-16 text-3xl';
  return (
    <div className="flex flex-col items-center gap-1 group" title={badge.desc}>
      <div className={`${sizeCls} rounded-2xl flex items-center justify-center shadow-md transition-all ${
        earned
          ? 'bg-gradient-to-br from-emerald-200 to-emerald-400 border-2 border-emerald-500 group-hover:scale-110'
          : 'bg-stone-100 border-2 border-stone-200 grayscale opacity-50'
      }`}>
        {badge.emoji}
      </div>
      <span className={`text-[10px] text-center font-medium leading-tight max-w-[64px] truncate ${
        earned ? 'text-emerald-800' : 'text-stone-400'
      }`}>
        {badge.label}
      </span>
    </div>
  );
}
