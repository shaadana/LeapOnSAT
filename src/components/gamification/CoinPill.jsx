import React from 'react';

/**
 * Coin balance pill — emerald-toned to match the app theme (no amber).
 * The 🪙 emoji is fine on its own as a single accent character.
 */
export default function CoinPill({ coins = 0, size = 'md' }) {
  const sizeCls = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';
  return (
    <span className={`inline-flex items-center ${sizeCls} rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold`}>
      <span className={size === 'sm' ? 'text-sm' : 'text-base'}>🪙</span>
      {coins.toLocaleString()}
    </span>
  );
}
