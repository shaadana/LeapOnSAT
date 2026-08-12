/**
 * Gamification core: XP curve, level math, badge definitions,
 * shop catalog, and helpers to award XP/coins/badges after sessions.
 */

import { base44 } from '@/api/base44Client';

// ──────────────────────────────────────────────────────────────────────────────
// LEVEL & XP CURVE
// ──────────────────────────────────────────────────────────────────────────────
// Level N requires `100 * N * (N+1) / 2` total XP (triangular curve).
// L1: 0, L2: 100, L3: 300, L4: 600, L5: 1000, L10: 5500, L20: 21000.
export function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return 100 * (level - 1) * level / 2;
}

export function levelFromXp(xp) {
  if (xp <= 0) return 1;
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpProgressInLevel(xp) {
  const level = levelFromXp(xp);
  const start = xpRequiredForLevel(level);
  const next  = xpRequiredForLevel(level + 1);
  const into  = xp - start;
  const span  = next - start;
  return { level, into, span, pct: span > 0 ? Math.round((into / span) * 100) : 0, nextLevelXp: next };
}

// ──────────────────────────────────────────────────────────────────────────────
// XP REWARDS — what each action is worth
// ──────────────────────────────────────────────────────────────────────────────
export const XP_REWARDS = {
  correct_answer:         10,
  correct_answer_hard:    15,
  correct_answer_expert:  25,
  session_completed:      30,
  perfect_session:        100,
  lesson_completed:       50,
  domain_mastered:        200,
  daily_streak_day:       20,
  diagnostic_completed:   150,
};

export const COIN_REWARDS = {
  per_100_xp:        10,
  perfect_session:    5,
  lesson_completed:   3,
  domain_mastered:   25,
  badge_earned:      15,
};

// ──────────────────────────────────────────────────────────────────────────────
// BADGES — milestone achievements (some are EF-targeted)
// ──────────────────────────────────────────────────────────────────────────────
export const BADGES = [
  // Streak / consistency
  { id: 'streak_3',      label: '3-Day Spark',        emoji: '🔥', desc: '3-day study streak',                ef: ['task_initiation', 'goal_directed_persistence'] },
  { id: 'streak_7',      label: 'Week Warrior',       emoji: '⚔️', desc: '7-day study streak',                ef: ['sustained_attention', 'goal_directed_persistence'] },
  { id: 'streak_30',     label: 'Marathon Mind',      emoji: '🏃', desc: '30-day study streak',               ef: ['goal_directed_persistence'] },
  // Practice volume
  { id: 'first_session', label: 'First Steps',        emoji: '👣', desc: 'Complete your first session',      ef: ['task_initiation'] },
  { id: 'sessions_10',   label: 'Getting Going',      emoji: '🌱', desc: '10 sessions completed',            ef: ['task_initiation'] },
  { id: 'sessions_50',   label: 'Practice Pro',       emoji: '💪', desc: '50 sessions completed',            ef: ['sustained_attention'] },
  { id: 'questions_100', label: 'Centurion',          emoji: '💯', desc: '100 questions answered correctly', ef: ['working_memory'] },
  { id: 'questions_500', label: 'Question Crusher',   emoji: '🏆', desc: '500 questions answered correctly', ef: ['sustained_attention'] },
  // Quality / mastery
  { id: 'perfect_1',     label: 'Flawless',           emoji: '✨', desc: 'Get 100% on a session',            ef: ['response_inhibition', 'metacognition'] },
  { id: 'perfect_5',     label: 'Pristine',           emoji: '🌟', desc: '5 perfect sessions',               ef: ['metacognition'] },
  { id: 'domain_first',  label: 'Domain Conqueror',   emoji: '🗺️', desc: 'Master your first domain',         ef: ['metacognition'] },
  { id: 'domain_5',      label: 'Polymath',           emoji: '🧠', desc: 'Master 5 domains',                 ef: ['metacognition', 'flexibility'] },
  // Lessons
  { id: 'lessons_5',     label: 'Lesson Lover',       emoji: '📖', desc: 'Complete 5 lessons',               ef: ['planning_prioritization'] },
  { id: 'lessons_25',    label: 'Scholar',            emoji: '🎓', desc: 'Complete 25 lessons',              ef: ['planning_prioritization', 'organization'] },
  // Diagnostics
  { id: 'diagnostic',    label: 'Self-Aware',         emoji: '🔍', desc: 'Complete the diagnostic',          ef: ['metacognition'] },
  // EF-tailored (low-EF support)
  { id: 'early_bird',    label: 'Early Bird',         emoji: '🌅', desc: 'Practice before 9 AM',             ef: ['task_initiation', 'time_management'] },
  { id: 'consistent',    label: 'Steady Stride',      emoji: '🐢', desc: 'Practice 3 days in a row',         ef: ['sustained_attention'] },
];

export function getBadgeById(id) {
  return BADGES.find(b => b.id === id);
}

// Recommend next badges based on EF profile (low scores → relevant badges)
export function recommendBadgesForEF(executiveFunctioning, earnedBadges = []) {
  if (!executiveFunctioning) return [];
  const lowSkills = Object.entries(executiveFunctioning)
    .filter(([, val]) => typeof val === 'number' && val < 12)
    .map(([key]) => key);
  if (lowSkills.length === 0) return [];
  const earnedSet = new Set(earnedBadges);
  return BADGES.filter(b => !earnedSet.has(b.id) && b.ef?.some(s => lowSkills.includes(s))).slice(0, 6);
}

// ──────────────────────────────────────────────────────────────────────────────
// SHOP CATALOG — items players can buy with coins
// ──────────────────────────────────────────────────────────────────────────────
// Items can carry an `ef` array — EF skills they thematically support.
// The shop highlights these for students who score low on those skills,
// turning visual rewards into reinforcement for their executive-functioning goals.
export const SHOP_ITEMS = [
  // Avatar bases
  { id: 'base_fox',     slot: 'base',       label: 'Fox',          emoji: '🦊', cost:   0, default: true },
  { id: 'base_owl',     slot: 'base',       label: 'Wise Owl',     emoji: '🦉', cost: 100, ef: ['planning_prioritization', 'metacognition'] },
  { id: 'base_panda',   slot: 'base',       label: 'Calm Panda',   emoji: '🐼', cost: 150, ef: ['emotional_control', 'stress_tolerance'] },
  { id: 'base_dragon',  slot: 'base',       label: 'Brave Dragon', emoji: '🐉', cost: 500, ef: ['goal_directed_persistence'] },
  { id: 'base_unicorn', slot: 'base',       label: 'Unicorn',      emoji: '🦄', cost: 750 },
  { id: 'base_turtle',  slot: 'base',       label: 'Steady Turtle',emoji: '🐢', cost: 120, ef: ['sustained_attention', 'goal_directed_persistence'] },
  { id: 'base_bee',     slot: 'base',       label: 'Busy Bee',     emoji: '🐝', cost: 120, ef: ['task_initiation', 'time_management'] },
  { id: 'base_cat',     slot: 'base',       label: 'Curious Cat',  emoji: '🐱', cost: 120 },
  { id: 'base_dog',     slot: 'base',       label: 'Loyal Pup',    emoji: '🐶', cost: 120, ef: ['goal_directed_persistence'] },
  { id: 'base_lion',    slot: 'base',       label: 'Bold Lion',    emoji: '🦁', cost: 300, ef: ['response_inhibition'] },
  { id: 'base_tiger',   slot: 'base',       label: 'Fierce Tiger', emoji: '🐯', cost: 300 },
  { id: 'base_koala',   slot: 'base',       label: 'Chill Koala',  emoji: '🐨', cost: 200, ef: ['emotional_control'] },
  { id: 'base_frog',    slot: 'base',       label: 'Leap Frog',    emoji: '🐸', cost: 130, ef: ['flexibility'] },
  { id: 'base_octopus', slot: 'base',       label: 'Smart Octopus',emoji: '🐙', cost: 250, ef: ['working_memory'] },
  { id: 'base_penguin', slot: 'base',       label: 'Penguin',      emoji: '🐧', cost: 180 },
  { id: 'base_robot',   slot: 'base',       label: 'Study Robot',  emoji: '🤖', cost: 350, ef: ['organization'] },
  { id: 'base_alien',   slot: 'base',       label: 'Curious Alien',emoji: '👽', cost: 350, ef: ['flexibility'] },
  { id: 'base_ghost',   slot: 'base',       label: 'Friendly Ghost',emoji:'👻', cost: 200 },
  { id: 'base_phoenix', slot: 'base',       label: 'Phoenix',      emoji: '🔥', cost: 800, ef: ['stress_tolerance', 'goal_directed_persistence'] },
  // Hats
  { id: 'hat_grad',     slot: 'hat',        label: 'Grad Cap',     emoji: '🎓', cost:  50, ef: ['metacognition'] },
  { id: 'hat_crown',    slot: 'hat',        label: 'Crown',        emoji: '👑', cost: 300 },
  { id: 'hat_party',    slot: 'hat',        label: 'Party Hat',    emoji: '🎉', cost: 100 },
  { id: 'hat_wizard',   slot: 'hat',        label: 'Wizard Hat',   emoji: '🧙', cost: 250, ef: ['flexibility'] },
  { id: 'hat_helmet',   slot: 'hat',        label: 'Focus Helmet', emoji: '⛑️', cost: 175, ef: ['sustained_attention', 'response_inhibition'] },
  { id: 'hat_beanie',   slot: 'hat',        label: 'Cozy Beanie',  emoji: '🧶', cost:  60, ef: ['stress_tolerance'] },
  { id: 'hat_cowboy',   slot: 'hat',        label: 'Cowboy Hat',   emoji: '🤠', cost: 150 },
  { id: 'hat_top',      slot: 'hat',        label: 'Top Hat',      emoji: '🎩', cost: 200 },
  { id: 'hat_baseball', slot: 'hat',        label: 'Baseball Cap', emoji: '🧢', cost:  75 },
  { id: 'hat_halo',     slot: 'hat',        label: 'Halo',         emoji: '😇', cost: 350, ef: ['emotional_control'] },
  { id: 'hat_horns',    slot: 'hat',        label: 'Devil Horns',  emoji: '😈', cost: 200 },
  { id: 'hat_flower',   slot: 'hat',        label: 'Flower Crown', emoji: '🌸', cost: 150 },
  { id: 'hat_pirate',   slot: 'hat',        label: 'Pirate Hat',   emoji: '🏴‍☠️', cost: 250 },
  { id: 'hat_chef',     slot: 'hat',        label: 'Chef Hat',     emoji: '👨‍🍳', cost: 175 },
  // Outfits
  { id: 'outfit_lab',   slot: 'outfit',     label: 'Lab Coat',     emoji: '🥼', cost: 150, ef: ['organization', 'planning_prioritization'] },
  { id: 'outfit_cape',  slot: 'outfit',     label: 'Hero Cape',    emoji: '🦸', cost: 400, ef: ['goal_directed_persistence'] },
  { id: 'outfit_zen',   slot: 'outfit',     label: 'Zen Robe',     emoji: '🧘', cost: 200, ef: ['emotional_control', 'stress_tolerance'] },
  { id: 'outfit_suit',  slot: 'outfit',     label: 'Sharp Suit',   emoji: '🤵', cost: 250 },
  { id: 'outfit_dress', slot: 'outfit',     label: 'Formal Dress', emoji: '👗', cost: 250 },
  { id: 'outfit_athl',  slot: 'outfit',     label: 'Athletic Wear',emoji: '👟', cost: 150, ef: ['task_initiation'] },
  { id: 'outfit_armor', slot: 'outfit',     label: 'Knight Armor', emoji: '🛡️', cost: 450, ef: ['response_inhibition'] },
  { id: 'outfit_ninja', slot: 'outfit',     label: 'Ninja Outfit', emoji: '🥷', cost: 350, ef: ['sustained_attention'] },
  { id: 'outfit_space', slot: 'outfit',     label: 'Spacesuit',    emoji: '👨‍🚀', cost: 500 },
  { id: 'outfit_winter',slot: 'outfit',     label: 'Winter Coat',  emoji: '🧥', cost: 175 },
  { id: 'outfit_pj',    slot: 'outfit',     label: 'Cozy PJs',     emoji: '👘', cost: 100, ef: ['stress_tolerance'] },
  // Backgrounds
  { id: 'bg_meadow',    slot: 'background', label: 'Meadow',       emoji: '🌿', cost:   0, default: true },
  { id: 'bg_space',     slot: 'background', label: 'Space',        emoji: '🌌', cost: 200, ef: ['flexibility'] },
  { id: 'bg_beach',     slot: 'background', label: 'Beach',        emoji: '🏖️', cost: 200, ef: ['stress_tolerance', 'emotional_control'] },
  { id: 'bg_library',   slot: 'background', label: 'Library',      emoji: '📚', cost: 150, ef: ['organization', 'sustained_attention'] },
  { id: 'bg_desk',      slot: 'background', label: 'Tidy Desk',    emoji: '🗂️', cost: 175, ef: ['organization', 'planning_prioritization'] },
  { id: 'bg_sunrise',   slot: 'background', label: 'Sunrise',      emoji: '🌅', cost: 175, ef: ['task_initiation', 'time_management'] },
  { id: 'bg_forest',    slot: 'background', label: 'Forest',       emoji: '🌲', cost: 150, ef: ['emotional_control'] },
  { id: 'bg_mountain',  slot: 'background', label: 'Mountain',     emoji: '🏔️', cost: 200, ef: ['goal_directed_persistence'] },
  { id: 'bg_city',      slot: 'background', label: 'City Skyline', emoji: '🏙️', cost: 200 },
  { id: 'bg_castle',    slot: 'background', label: 'Castle',       emoji: '🏰', cost: 300 },
  { id: 'bg_underwater',slot: 'background', label: 'Underwater',   emoji: '🐠', cost: 250, ef: ['flexibility'] },
  { id: 'bg_volcano',   slot: 'background', label: 'Volcano',      emoji: '🌋', cost: 300 },
  { id: 'bg_galaxy',    slot: 'background', label: 'Galaxy',       emoji: '✨', cost: 350, ef: ['flexibility'] },
  { id: 'bg_garden',    slot: 'background', label: 'Zen Garden',   emoji: '⛩️', cost: 200, ef: ['stress_tolerance', 'emotional_control'] },
  { id: 'bg_cafe',      slot: 'background', label: 'Cozy Café',    emoji: '☕', cost: 150, ef: ['task_initiation'] },
  { id: 'bg_aurora',    slot: 'background', label: 'Aurora Sky',   emoji: '🌌', cost: 400 },
  // Accessories
  { id: 'acc_glasses',  slot: 'accessory',  label: 'Glasses',      emoji: '👓', cost:  75, ef: ['metacognition'] },
  { id: 'acc_medal',    slot: 'accessory',  label: 'Gold Medal',   emoji: '🥇', cost: 350, ef: ['goal_directed_persistence'] },
  { id: 'acc_clock',    slot: 'accessory',  label: 'Pocket Watch', emoji: '⏱️', cost: 125, ef: ['time_management', 'task_initiation'] },
  { id: 'acc_planner',  slot: 'accessory',  label: 'Planner',      emoji: '📓', cost: 125, ef: ['organization', 'planning_prioritization'] },
  { id: 'acc_scarf',    slot: 'accessory',  label: 'Cozy Scarf',   emoji: '🧣', cost:  80 },
  { id: 'acc_bowtie',   slot: 'accessory',  label: 'Bow Tie',      emoji: '🎀', cost: 100 },
  { id: 'acc_backpack', slot: 'accessory',  label: 'Backpack',     emoji: '🎒', cost: 175, ef: ['organization'] },
  { id: 'acc_shades',   slot: 'accessory',  label: 'Cool Shades',  emoji: '😎', cost: 150 },
  { id: 'acc_book',     slot: 'accessory',  label: 'Reading Book', emoji: '📖', cost: 100, ef: ['sustained_attention'] },
  { id: 'acc_coffee',   slot: 'accessory',  label: 'Coffee Mug',   emoji: '☕', cost:  80, ef: ['task_initiation'] },
  { id: 'acc_camera',   slot: 'accessory',  label: 'Camera',       emoji: '📷', cost: 200 },
  { id: 'acc_headset',  slot: 'accessory',  label: 'Study Headset',emoji: '🎧', cost: 175, ef: ['sustained_attention'] },
  { id: 'acc_compass',  slot: 'accessory',  label: 'Compass',      emoji: '🧭', cost: 150, ef: ['planning_prioritization'] },
  // Streak freezes (consumable — protects streak for 1 day)
  { id: 'streak_freeze', slot: 'consumable', label: 'Streak Freeze', emoji: '❄️', cost:  50, consumable: true, desc: 'Protects your streak for 1 missed day', ef: ['stress_tolerance'] },
];

// EF skill display labels (for tooltips in the shop)
export const EF_LABELS = {
  response_inhibition:        'Response Inhibition',
  working_memory:             'Working Memory',
  emotional_control:          'Emotional Control',
  task_initiation:            'Task Initiation',
  sustained_attention:        'Sustained Attention',
  planning_prioritization:    'Planning & Prioritization',
  organization:               'Organization',
  time_management:            'Time Management',
  flexibility:                'Flexibility',
  metacognition:              'Metacognition',
  goal_directed_persistence:  'Goal-Directed Persistence',
  stress_tolerance:           'Stress Tolerance',
};

// Identify weak EF skills (score < 12 on the 3-21 scale)
export function getWeakEfSkills(executiveFunctioning) {
  if (!executiveFunctioning) return [];
  return Object.entries(executiveFunctioning)
    .filter(([, val]) => typeof val === 'number' && val < 12)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key);
}

// Recommend shop items based on weak EF skills (EF-tagged & not yet owned)
export function recommendShopItemsForEF(executiveFunctioning, ownedItems = []) {
  const weak = getWeakEfSkills(executiveFunctioning);
  if (weak.length === 0) return [];
  const ownedSet = new Set(ownedItems);
  return SHOP_ITEMS
    .filter(i => !ownedSet.has(i.id) && !i.default && i.ef?.some(s => weak.includes(s)))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 6);
}

export function getShopItemById(id) {
  return SHOP_ITEMS.find(i => i.id === id);
}

export function getDefaultOwnedItems() {
  return SHOP_ITEMS.filter(i => i.default).map(i => i.id);
}

// ──────────────────────────────────────────────────────────────────────────────
// PROFILE FETCH / UPSERT
// ──────────────────────────────────────────────────────────────────────────────
export async function getOrCreateGamificationProfile(userId) {
  if (!userId) return null;
  const existing = await base44.entities.GamificationProfile.filter({ user_id: userId });
  if (existing[0]) return existing[0];
  return await base44.entities.GamificationProfile.create({
    user_id: userId,
    xp: 0,
    coins: 0,
    level: 1,
    earned_badges: [],
    owned_items: getDefaultOwnedItems(),
    avatar: { base: 'fox', hat: '', outfit: '', background: 'meadow', accessory: '' },
    preferences: { daily_reminder_enabled: true, daily_reminder_time: '18:00', streak_freeze_count: 0, celebration_intensity: 'normal' },
    stats: { total_correct: 0, total_attempted: 0, total_sessions: 0, lessons_completed: 0, domains_mastered: 0, perfect_sessions: 0, longest_streak: 0 },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// AWARD AFTER SESSION — call this when a practice session completes.
// Updates XP, coins, level, badges, stats. Returns the deltas for celebration UI.
//
// EF-CUSTOMIZATION: pass the user's executive_functioning profile to enable
// personalized bonuses. Students with low scores in specific EF skills get
// targeted XP boosts that reinforce the behaviors they need most:
//   • low task_initiation        → bonus for STARTING a session
//   • low sustained_attention    → bonus for FINISHING a long session
//   • low response_inhibition    → bonus for ACCURATE play
//   • low metacognition          → bonus for PERFECT sessions
//   • low goal_directed_persistence → bonus for DIFFICULT sessions
// ──────────────────────────────────────────────────────────────────────────────
export async function awardForSession(userId, session, executiveFunctioning = null) {
  if (!userId || !session) return null;
  const profile = await getOrCreateGamificationProfile(userId);

  const correct = session.questions_correct || 0;
  const attempted = session.questions_attempted || 0;
  if (attempted === 0) return null;

  const accuracy = correct / attempted;
  const isPerfect = correct === attempted && attempted >= 5;

  // Compute XP gained
  let xpGained = 0;
  // Per-question XP (rough avg by difficulty)
  const diff = session.current_difficulty || 'medium';
  const perQ = diff === 'expert' ? XP_REWARDS.correct_answer_expert
            : diff === 'hard'   ? XP_REWARDS.correct_answer_hard
            : XP_REWARDS.correct_answer;
  xpGained += correct * perQ;
  xpGained += XP_REWARDS.session_completed;
  if (isPerfect) xpGained += XP_REWARDS.perfect_session;

  // ── EF-tailored bonus XP ──
  const efBonuses = [];
  const ef = executiveFunctioning || {};
  const isLow = (key) => typeof ef[key] === 'number' && ef[key] < 12;

  if (isLow('task_initiation')) {
    efBonuses.push({ skill: 'task_initiation', label: 'Starting Bonus', amount: 15, reason: 'You showed up — that\'s the hardest part!' });
  }
  if (isLow('sustained_attention') && attempted >= 10) {
    efBonuses.push({ skill: 'sustained_attention', label: 'Focus Bonus', amount: 25, reason: 'You stayed focused for 10+ questions' });
  }
  if (isLow('response_inhibition') && accuracy >= 0.85) {
    efBonuses.push({ skill: 'response_inhibition', label: 'Patience Bonus', amount: 20, reason: 'You answered carefully (85%+ accuracy)' });
  }
  if (isLow('metacognition') && isPerfect) {
    efBonuses.push({ skill: 'metacognition', label: 'Self-Aware Bonus', amount: 30, reason: 'A perfect session shows real self-awareness' });
  }
  if (isLow('goal_directed_persistence') && (diff === 'hard' || diff === 'expert')) {
    efBonuses.push({ skill: 'goal_directed_persistence', label: 'Persistence Bonus', amount: 20, reason: 'You took on a tougher session' });
  }
  if (isLow('stress_tolerance') && attempted >= 5 && accuracy >= 0.6) {
    efBonuses.push({ skill: 'stress_tolerance', label: 'Calm Under Pressure', amount: 15, reason: 'You kept going through tough questions' });
  }
  const efBonusXp = efBonuses.reduce((s, b) => s + b.amount, 0);
  xpGained += efBonusXp;

  // Coin gain
  let coinsGained = Math.floor(xpGained / 100) * COIN_REWARDS.per_100_xp;
  if (isPerfect) coinsGained += COIN_REWARDS.perfect_session;

  // Update stats
  const newStats = {
    ...profile.stats,
    total_correct:    (profile.stats?.total_correct || 0) + correct,
    total_attempted:  (profile.stats?.total_attempted || 0) + attempted,
    total_sessions:   (profile.stats?.total_sessions || 0) + 1,
    perfect_sessions: (profile.stats?.perfect_sessions || 0) + (isPerfect ? 1 : 0),
  };

  const newXp = (profile.xp || 0) + xpGained;
  const newLevel = levelFromXp(newXp);
  const oldLevel = profile.level || 1;
  const leveledUp = newLevel > oldLevel;

  // Badge checks
  const earnedSet = new Set(profile.earned_badges || []);
  const newlyEarned = [];
  const tryAward = (id) => {
    if (!earnedSet.has(id)) {
      earnedSet.add(id);
      newlyEarned.push(id);
    }
  };

  if (newStats.total_sessions >= 1)   tryAward('first_session');
  if (newStats.total_sessions >= 10)  tryAward('sessions_10');
  if (newStats.total_sessions >= 50)  tryAward('sessions_50');
  if (newStats.total_correct >= 100)  tryAward('questions_100');
  if (newStats.total_correct >= 500)  tryAward('questions_500');
  if (isPerfect)                      tryAward('perfect_1');
  if (newStats.perfect_sessions >= 5) tryAward('perfect_5');

  // Bonus coins for new badges
  coinsGained += newlyEarned.length * COIN_REWARDS.badge_earned;

  await base44.entities.GamificationProfile.update(profile.id, {
    xp: newXp,
    coins: (profile.coins || 0) + coinsGained,
    level: newLevel,
    earned_badges: Array.from(earnedSet),
    stats: newStats,
  });

  return {
    xpGained,
    coinsGained,
    leveledUp,
    oldLevel,
    newLevel,
    newlyEarnedBadges: newlyEarned.map(id => getBadgeById(id)).filter(Boolean),
    isPerfect,
    efBonuses,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SHOP — purchase item
// ──────────────────────────────────────────────────────────────────────────────
export async function purchaseShopItem(userId, itemId) {
  const item = getShopItemById(itemId);
  if (!item) throw new Error('Item not found');
  const profile = await getOrCreateGamificationProfile(userId);
  if (!item.consumable && (profile.owned_items || []).includes(itemId)) {
    throw new Error('Already owned');
  }
  if ((profile.coins || 0) < item.cost) {
    throw new Error('Not enough coins');
  }
  const updates = { coins: profile.coins - item.cost };
  if (item.consumable) {
    if (item.id === 'streak_freeze') {
      updates.preferences = {
        ...profile.preferences,
        streak_freeze_count: (profile.preferences?.streak_freeze_count || 0) + 1,
      };
    }
  } else {
    updates.owned_items = [...(profile.owned_items || []), itemId];
  }
  await base44.entities.GamificationProfile.update(profile.id, updates);
  return { ...profile, ...updates };
}

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOM REWARDS — teachers can award bonus coins or custom badges
// to a student for in-class achievements (e.g. "Class Participation",
// "Kindness Award"). Reflects in the student's gamification profile immediately.
// ──────────────────────────────────────────────────────────────────────────────
export async function awardCustomCoins(teacher, studentId, studentName, { coin_amount, title, message, class_id }) {
  if (!teacher?.id || !studentId) throw new Error('Missing teacher or student');
  const amount = Number(coin_amount) || 0;
  if (amount <= 0) throw new Error('Coin amount must be greater than 0');

  const profile = await getOrCreateGamificationProfile(studentId);
  await base44.entities.GamificationProfile.update(profile.id, {
    coins: (profile.coins || 0) + amount,
  });

  await base44.entities.CustomReward.create({
    teacher_id: teacher.id,
    teacher_name: teacher.full_name || teacher.email,
    student_id: studentId,
    student_name: studentName,
    class_id: class_id || '',
    reward_type: 'coins',
    title,
    message: message || '',
    coin_amount: amount,
  });
  return { coins_added: amount };
}

export async function awardCustomBadge(teacher, studentId, studentName, { title, message, badge_emoji, class_id }) {
  if (!teacher?.id || !studentId) throw new Error('Missing teacher or student');
  if (!title) throw new Error('Badge needs a title');

  const badgeId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const profile = await getOrCreateGamificationProfile(studentId);
  const earned = Array.from(new Set([...(profile.earned_badges || []), badgeId]));

  // Custom badges also award a small celebratory coin bonus so the student
  // immediately feels the reward (in addition to the badge itself).
  const coinBonus = COIN_REWARDS.badge_earned;

  await base44.entities.GamificationProfile.update(profile.id, {
    earned_badges: earned,
    coins: (profile.coins || 0) + coinBonus,
  });

  await base44.entities.CustomReward.create({
    teacher_id: teacher.id,
    teacher_name: teacher.full_name || teacher.email,
    student_id: studentId,
    student_name: studentName,
    class_id: class_id || '',
    reward_type: 'badge',
    title,
    message: message || '',
    badge_emoji: badge_emoji || '🏅',
    badge_id: badgeId,
  });
  return { badge_id: badgeId, coin_bonus: coinBonus };
}

// Build a badge object compatible with BADGES from a CustomReward record
export function customRewardToBadge(reward) {
  return {
    id: reward.badge_id,
    label: reward.title,
    emoji: reward.badge_emoji || '🏅',
    desc: reward.message || `Awarded by ${reward.teacher_name}`,
    custom: true,
  };
}

// Equip an avatar item
export async function equipAvatarItem(userId, itemId) {
  const item = getShopItemById(itemId);
  if (!item) throw new Error('Item not found');
  if (item.consumable) throw new Error('Cannot equip consumable');
  const profile = await getOrCreateGamificationProfile(userId);
  if (!(profile.owned_items || []).includes(itemId) && !item.default) {
    throw new Error('Item not owned');
  }
  const newAvatar = { ...(profile.avatar || {}), [item.slot]: item.id.replace(`${item.slot}_`, '') };
  // Clean: store the item id directly so we can render it
  newAvatar[item.slot] = itemId;
  await base44.entities.GamificationProfile.update(profile.id, { avatar: newAvatar });
  return newAvatar;
}
