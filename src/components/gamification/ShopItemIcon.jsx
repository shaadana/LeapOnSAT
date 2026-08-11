import React from 'react';

/**
 * Renders a proper SVG visual for each shop item — replaces raw emojis.
 *
 *  • Base creatures → DiceBear "fun-emoji" SVG (consistent cross-platform faces).
 *  • Hats / Outfits / Accessories / Backgrounds / Consumables → custom inline SVG
 *    icon tiles styled in the app's emerald + stone palette.
 *
 * Always returns a square element sized to fill its parent (use a sized wrapper).
 */

// Stable seeds for each base creature so the same item always renders the same face
const DICEBEAR_SEEDS = {
  base_fox:     'Fox-Felix',
  base_owl:     'Owl-Oliver',
  base_panda:   'Panda-Polly',
  base_dragon:  'Dragon-Drako',
  base_unicorn: 'Unicorn-Una',
  base_turtle:  'Turtle-Tito',
  base_bee:     'Bee-Bumble',
  base_cat:     'Cat-Mochi',
  base_dog:     'Dog-Biscuit',
  base_lion:    'Lion-Leo',
  base_tiger:   'Tiger-Stripe',
  base_koala:   'Koala-Kuma',
  base_frog:    'Frog-Hopper',
  base_octopus: 'Octopus-Inky',
  base_penguin: 'Penguin-Pip',
  base_robot:   'Robot-Bolt',
  base_alien:   'Alien-Nova',
  base_ghost:   'Ghost-Casper',
  base_phoenix: 'Phoenix-Blaze',
};

function dicebearUrl(itemId) {
  // For mapped seeds use them; otherwise use the item id itself as the seed so
  // every base creature produces a distinct, stable face — never falls back to fox.
  const seed = DICEBEAR_SEEDS[itemId] || itemId;
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

// Deterministic color picker — same item id always gets the same color
const PALETTE = ['#10b981','#0ea5e9','#a855f7','#f59e0b','#ef4444','#ec4899','#14b8a6','#6366f1','#84cc16','#f97316'];
function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * Inline SVG icon set — emerald-toned visuals for non-creature items.
 * Each is designed at 64x64 viewBox so they scale cleanly.
 */
const SVG_ICONS = {
  // ── HATS ──
  hat_grad: (
    <g>
      <rect x="14" y="32" width="36" height="6" rx="1" fill="#1c1917" />
      <polygon points="32,16 56,28 32,40 8,28" fill="#0f172a" />
      <line x1="48" y1="26" x2="50" y2="44" stroke="#10b981" strokeWidth="2" />
      <circle cx="50" cy="46" r="3" fill="#10b981" />
    </g>
  ),
  hat_crown: (
    <g>
      <path d="M12 38 L18 18 L26 30 L32 14 L38 30 L46 18 L52 38 Z" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
      <rect x="12" y="38" width="40" height="6" rx="1" fill="#047857" />
      <circle cx="32" cy="22" r="2.5" fill="#a7f3d0" />
      <circle cx="20" cy="30" r="1.8" fill="#a7f3d0" />
      <circle cx="44" cy="30" r="1.8" fill="#a7f3d0" />
    </g>
  ),
  hat_party: (
    <g>
      <polygon points="32,8 22,46 42,46" fill="#10b981" />
      <polygon points="32,8 32,46 42,46" fill="#059669" />
      <circle cx="28" cy="20" r="2" fill="#fff" />
      <circle cx="34" cy="32" r="2" fill="#fff" />
      <circle cx="32" cy="6" r="3" fill="#34d399" />
      <ellipse cx="32" cy="48" rx="14" ry="3" fill="#047857" />
    </g>
  ),
  hat_wizard: (
    <g>
      <polygon points="32,6 18,46 46,46" fill="#0f172a" />
      <ellipse cx="32" cy="48" rx="18" ry="3" fill="#1c1917" />
      <circle cx="28" cy="22" r="1.5" fill="#10b981" />
      <circle cx="34" cy="32" r="1.5" fill="#34d399" />
      <path d="M32 6 L34 12 L40 14 L34 16 L32 22 L30 16 L24 14 L30 12 Z" fill="#10b981" />
    </g>
  ),
  hat_helmet: (
    <g>
      <path d="M12 36 Q12 14 32 14 Q52 14 52 36 L52 44 L12 44 Z" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
      <rect x="12" y="36" width="40" height="4" fill="#047857" />
      <path d="M16 28 Q32 22 48 28" stroke="#a7f3d0" strokeWidth="2" fill="none" />
    </g>
  ),

  // ── OUTFITS ──
  outfit_lab: (
    <g>
      <path d="M16 22 L24 18 L40 18 L48 22 L48 52 L16 52 Z" fill="#fff" stroke="#0f766e" strokeWidth="1.5" />
      <path d="M24 18 L32 26 L40 18" fill="none" stroke="#0f766e" strokeWidth="1.5" />
      <circle cx="24" cy="34" r="1.5" fill="#10b981" />
      <circle cx="24" cy="40" r="1.5" fill="#10b981" />
      <line x1="32" y1="26" x2="32" y2="52" stroke="#cbd5e1" strokeWidth="1" />
    </g>
  ),
  outfit_cape: (
    <g>
      <path d="M14 18 Q32 14 50 18 L46 54 Q32 50 18 54 Z" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
      <path d="M22 18 Q32 22 42 18" fill="#047857" />
      <circle cx="32" cy="28" r="3" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
      <text x="32" y="32" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#fff">S</text>
    </g>
  ),
  outfit_zen: (
    <g>
      <path d="M16 22 L32 16 L48 22 L46 52 L18 52 Z" fill="#a7f3d0" stroke="#0f766e" strokeWidth="1.5" />
      <path d="M16 22 L32 28 L48 22" fill="none" stroke="#0f766e" strokeWidth="1.5" />
      <path d="M28 32 Q32 36 36 32" stroke="#0f766e" strokeWidth="1.5" fill="none" />
      <circle cx="32" cy="40" r="2" fill="#0f766e" />
    </g>
  ),

  // ── BACKGROUNDS ──
  bg_meadow: (
    <g>
      <rect x="0" y="0" width="64" height="40" fill="#a7f3d0" />
      <rect x="0" y="40" width="64" height="24" fill="#10b981" />
      <circle cx="14" cy="14" r="5" fill="#fef3c7" />
      <path d="M8 44 L8 48 M16 42 L16 48 M28 44 L28 48 M40 42 L40 48 M52 44 L52 48" stroke="#047857" strokeWidth="1.5" />
    </g>
  ),
  bg_space: (
    <g>
      <rect x="0" y="0" width="64" height="64" fill="#1e1b4b" />
      <circle cx="14" cy="14" r="1.5" fill="#fff" />
      <circle cx="50" cy="20" r="1" fill="#fff" />
      <circle cx="40" cy="40" r="1.5" fill="#fff" />
      <circle cx="20" cy="50" r="1" fill="#fff" />
      <circle cx="48" cy="48" r="6" fill="#a78bfa" />
      <circle cx="46" cy="46" r="1.5" fill="#7c3aed" />
    </g>
  ),
  bg_beach: (
    <g>
      <rect x="0" y="0" width="64" height="32" fill="#bae6fd" />
      <rect x="0" y="32" width="64" height="20" fill="#67e8f9" />
      <rect x="0" y="52" width="64" height="12" fill="#fde68a" />
      <circle cx="50" cy="14" r="6" fill="#fbbf24" />
      <path d="M0 36 Q16 32 32 36 T 64 36" stroke="#fff" strokeWidth="1" fill="none" />
    </g>
  ),
  bg_library: (
    <g>
      <rect x="0" y="0" width="64" height="64" fill="#fef3c7" />
      <rect x="6" y="14" width="6" height="36" fill="#a16207" />
      <rect x="14" y="10" width="6" height="40" fill="#92400e" />
      <rect x="22" y="16" width="6" height="34" fill="#a16207" />
      <rect x="30" y="12" width="6" height="38" fill="#78350f" />
      <rect x="38" y="14" width="6" height="36" fill="#92400e" />
      <rect x="46" y="10" width="6" height="40" fill="#a16207" />
      <rect x="0" y="50" width="64" height="14" fill="#92400e" />
    </g>
  ),
  bg_desk: (
    <g>
      <rect x="0" y="0" width="64" height="64" fill="#f5f5f4" />
      <rect x="0" y="40" width="64" height="24" fill="#d6d3d1" />
      <rect x="8" y="20" width="20" height="14" rx="1" fill="#10b981" />
      <rect x="32" y="22" width="14" height="12" fill="#fff" stroke="#a8a29e" strokeWidth="1" />
      <circle cx="52" cy="28" r="4" fill="#fbbf24" />
    </g>
  ),
  bg_sunrise: (
    <g>
      <rect x="0" y="0" width="64" height="40" fill="#fed7aa" />
      <rect x="0" y="40" width="64" height="24" fill="#10b981" />
      <circle cx="32" cy="40" r="14" fill="#fbbf24" />
      <line x1="32" y1="20" x2="32" y2="14" stroke="#fbbf24" strokeWidth="2" />
      <line x1="14" y1="40" x2="8"  y2="40" stroke="#fbbf24" strokeWidth="2" />
      <line x1="50" y1="40" x2="56" y2="40" stroke="#fbbf24" strokeWidth="2" />
    </g>
  ),

  // ── ACCESSORIES ──
  acc_glasses: (
    <g>
      <circle cx="22" cy="34" r="10" fill="none" stroke="#0f172a" strokeWidth="3" />
      <circle cx="42" cy="34" r="10" fill="none" stroke="#0f172a" strokeWidth="3" />
      <line x1="32" y1="34" x2="32" y2="34" stroke="#0f172a" strokeWidth="3" />
      <line x1="30" y1="34" x2="34" y2="34" stroke="#0f172a" strokeWidth="3" />
      <circle cx="22" cy="34" r="9" fill="#a7f3d0" opacity="0.4" />
      <circle cx="42" cy="34" r="9" fill="#a7f3d0" opacity="0.4" />
    </g>
  ),
  acc_medal: (
    <g>
      <path d="M22 10 L26 24 L22 24 Z" fill="#10b981" />
      <path d="M42 10 L38 24 L42 24 Z" fill="#10b981" />
      <circle cx="32" cy="38" r="14" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      <circle cx="32" cy="38" r="8" fill="#fde68a" />
      <text x="32" y="42" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">1</text>
    </g>
  ),
  acc_clock: (
    <g>
      <circle cx="32" cy="36" r="16" fill="#fff" stroke="#0f172a" strokeWidth="2" />
      <circle cx="32" cy="36" r="2" fill="#0f172a" />
      <line x1="32" y1="36" x2="32" y2="26" stroke="#0f172a" strokeWidth="2" />
      <line x1="32" y1="36" x2="40" y2="36" stroke="#10b981" strokeWidth="2" />
      <circle cx="32" cy="14" r="3" fill="#10b981" />
      <line x1="32" y1="14" x2="32" y2="20" stroke="#0f172a" strokeWidth="2" />
    </g>
  ),
  acc_planner: (
    <g>
      <rect x="14" y="12" width="36" height="44" rx="2" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
      <line x1="14" y1="22" x2="50" y2="22" stroke="#047857" strokeWidth="1" />
      <line x1="20" y1="30" x2="44" y2="30" stroke="#a7f3d0" strokeWidth="1.5" />
      <line x1="20" y1="38" x2="44" y2="38" stroke="#a7f3d0" strokeWidth="1.5" />
      <line x1="20" y1="46" x2="36" y2="46" stroke="#a7f3d0" strokeWidth="1.5" />
      <rect x="22" y="6" width="3" height="12" fill="#0f172a" />
      <rect x="39" y="6" width="3" height="12" fill="#0f172a" />
    </g>
  ),

  // ── CONSUMABLES ──
  streak_freeze: (
    <g>
      <line x1="32" y1="10" x2="32" y2="54" stroke="#0ea5e9" strokeWidth="3" />
      <line x1="14" y1="32" x2="50" y2="32" stroke="#0ea5e9" strokeWidth="3" />
      <line x1="18" y1="18" x2="46" y2="46" stroke="#38bdf8" strokeWidth="3" />
      <line x1="46" y1="18" x2="18" y2="46" stroke="#38bdf8" strokeWidth="3" />
      <circle cx="32" cy="32" r="3" fill="#fff" />
    </g>
  ),
};

/**
 * Renders a deterministic colored badge with the item's emoji for items that
 * don't have a custom inline SVG. This guarantees every item — including new
 * shop additions and teacher custom badges — has a distinct, equippable visual.
 */
function fallbackIcon(item) {
  const fill = colorFor(item.id);
  return (
    <g>
      <circle cx="32" cy="32" r="28" fill={fill} stroke="#0f172a" strokeOpacity="0.15" strokeWidth="1.5" />
      <text x="32" y="42" textAnchor="middle" fontSize="32" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
        {item.emoji || '✨'}
      </text>
    </g>
  );
}

export default function ShopItemIcon({ item, className = '' }) {
  if (!item) return null;

  // Base creatures use DiceBear
  if (item.slot === 'base') {
    return (
      <img
        src={dicebearUrl(item.id)}
        alt={item.label}
        className={`object-contain ${className}`}
        loading="lazy"
      />
    );
  }

  // Backgrounds — render a small preview swatch using the avatar's gradient
  if (item.slot === 'background') {
    return (
      <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`bg-${item.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorFor(item.id)} />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="10" fill={`url(#bg-${item.id})`} stroke="#0f172a" strokeOpacity="0.1" />
        <text x="32" y="42" textAnchor="middle" fontSize="28" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
          {item.emoji || '🌅'}
        </text>
      </svg>
    );
  }

  const svg = SVG_ICONS[item.id] || fallbackIcon(item);
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {svg}
    </svg>
  );
}
