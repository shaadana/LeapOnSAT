import React from 'react';

/**
 * Maps a numeric score (0-100) or mastery level string to a labeled
 * proficiency badge using emerald/stone palette.
 */
export function getProficiency(score) {
  if (score >= 85) return { label: 'Advanced', tone: 'emerald-strong', emoji: '🏆' };
  if (score >= 70) return { label: 'Proficient', tone: 'emerald', emoji: '✓' };
  if (score >= 50) return { label: 'Developing', tone: 'stone', emoji: '◐' };
  if (score > 0) return { label: 'Beginning', tone: 'amber', emoji: '○' };
  return { label: 'Not Started', tone: 'gray', emoji: '–' };
}

const toneClass = {
  'emerald-strong': 'bg-emerald-500 text-white border-emerald-600',
  'emerald': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'stone': 'bg-stone-100 text-stone-700 border-stone-300',
  'amber': 'bg-amber-100 text-amber-700 border-amber-300',
  'gray': 'bg-stone-50 text-stone-500 border-stone-200',
};

export default function ProficiencyBadge({ score, level, className = '' }) {
  let p;
  if (level) {
    const map = {
      mastered: { label: 'Mastered', tone: 'emerald-strong', emoji: '🏆' },
      practiced: { label: 'Proficient', tone: 'emerald', emoji: '✓' },
      learning: { label: 'Developing', tone: 'stone', emoji: '◐' },
      not_started: { label: 'Not Started', tone: 'gray', emoji: '–' },
    };
    p = map[level] || map.not_started;
  } else {
    p = getProficiency(score);
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${toneClass[p.tone]} ${className}`}>
      <span>{p.emoji}</span>
      {p.label}
    </span>
  );
}
