import React from 'react';
import { getShopItemById } from '@/utils/gamification';
import ShopItemIcon from './ShopItemIcon';

/**
 * Renders the user's avatar — fully SVG, no raw emojis.
 *
 * Base creature → DiceBear fun-emoji SVG.
 * Hat / Outfit / Accessory → custom inline SVG icons (from ShopItemIcon).
 * Background → CSS gradient on the container.
 */
const SIZE_MAP = {
  sm: { box: 'w-12 h-12', base: 'w-9 h-9',  hat: 'w-5 h-5',  acc: 'w-4 h-4' },
  md: { box: 'w-20 h-20', base: 'w-14 h-14', hat: 'w-8 h-8', acc: 'w-6 h-6' },
  lg: { box: 'w-32 h-32', base: 'w-24 h-24', hat: 'w-12 h-12', acc: 'w-9 h-9' },
  xl: { box: 'w-48 h-48', base: 'w-36 h-36', hat: 'w-16 h-16', acc: 'w-12 h-12' },
};

const BG_GRADIENTS = {
  bg_meadow:    'from-emerald-100 to-teal-100',
  bg_space:     'from-indigo-900 via-purple-900 to-violet-900',
  bg_beach:     'from-sky-100 via-cyan-50 to-emerald-50',
  bg_library:   'from-stone-50 to-stone-100',
  bg_desk:      'from-stone-100 to-stone-50',
  bg_sunrise:   'from-rose-100 via-orange-50 to-emerald-50',
  bg_forest:    'from-emerald-900 via-green-700 to-emerald-500',
  bg_mountain:  'from-slate-300 via-slate-100 to-blue-100',
  bg_city:      'from-slate-700 via-slate-500 to-amber-200',
  bg_castle:    'from-stone-400 via-stone-300 to-amber-100',
  bg_underwater:'from-cyan-700 via-blue-500 to-sky-200',
  bg_volcano:   'from-red-900 via-orange-500 to-yellow-200',
  bg_galaxy:    'from-violet-950 via-fuchsia-700 to-pink-300',
  bg_garden:    'from-emerald-200 via-stone-100 to-rose-100',
  bg_cafe:      'from-amber-200 via-orange-100 to-stone-100',
  bg_aurora:    'from-emerald-400 via-blue-400 to-purple-400',
};

// Deterministic color helper for unmapped background ids — guarantees any new
// background still produces a distinct equipped look, even before a custom
// gradient is added to BG_GRADIENTS.
const FALLBACK_PALETTE = ['#10b981','#0ea5e9','#a855f7','#f59e0b','#ef4444','#ec4899','#14b8a6','#6366f1'];
function fallbackBgStyle(id) {
  if (!id) return null;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const c1 = FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
  const c2 = FALLBACK_PALETTE[(h >> 3) % FALLBACK_PALETTE.length];
  return { background: `linear-gradient(135deg, ${c1}, ${c2})` };
}

export default function AvatarDisplay({ avatar = {}, size = 'md', className = '' }) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;
  const baseItem = getShopItemById(avatar.base) || getShopItemById('base_fox');
  const hatItem = getShopItemById(avatar.hat);
  const outfitItem = getShopItemById(avatar.outfit);
  const accItem = getShopItemById(avatar.accessory);
  const mappedBg = BG_GRADIENTS[avatar.background];
  const inlineBg = !mappedBg ? fallbackBgStyle(avatar.background) : null;
  const bgClass = mappedBg || '';

  return (
    <div
      className={`${s.box} relative rounded-2xl overflow-hidden ${bgClass ? `bg-gradient-to-br ${bgClass}` : ''} flex items-center justify-center shadow-md ${className}`}
      style={inlineBg || undefined}
    >
      {/* Base creature — DiceBear SVG */}
      <ShopItemIcon item={baseItem} className={`${s.base} drop-shadow-sm`} />

      {/* Hat — anchored top-center */}
      {hatItem && (
        <ShopItemIcon item={hatItem} className={`${s.hat} absolute top-0.5 left-1/2 -translate-x-1/2 drop-shadow-sm`} />
      )}
      {/* Outfit — bottom-center, slightly larger so it reads as clothing */}
      {outfitItem && (
        <ShopItemIcon item={outfitItem} className={`${s.hat} absolute bottom-0.5 left-1/2 -translate-x-1/2 drop-shadow-sm`} />
      )}
      {/* Accessory — bottom-right */}
      {accItem && (
        <ShopItemIcon item={accItem} className={`${s.acc} absolute bottom-1 right-1 drop-shadow-sm`} />
      )}
    </div>
  );
}
