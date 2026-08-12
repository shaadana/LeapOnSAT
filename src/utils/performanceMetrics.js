/**
 * Single source of truth for performance metrics across student/parent/teacher views.
 *
 * All accuracy and mastery calculations should go through this module so the same
 * student sees consistent numbers in their dashboard, their parent's portal, their
 * teacher's portal, and the detailed report.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Mastery thresholds (used everywhere — tied to satMasterySync.js volume gates)
// ──────────────────────────────────────────────────────────────────────────────
export const MASTERY_THRESHOLDS = {
  mastered:  85, // ≥ 85% accuracy
  practiced: 70, // ≥ 70% accuracy
  learning:  50, // ≥ 50% accuracy
  // below 50 = not_started / struggling
};

export const MASTERY_LEVEL_TO_PCT = {
  mastered:    100,
  practiced:    75,
  learning:     40,
  not_started:   0,
};

export function scoreToMasteryLevel(pct) {
  if (pct >= MASTERY_THRESHOLDS.mastered)  return 'mastered';
  if (pct >= MASTERY_THRESHOLDS.practiced) return 'practiced';
  if (pct >= MASTERY_THRESHOLDS.learning)  return 'learning';
  return 'not_started';
}

// ──────────────────────────────────────────────────────────────────────────────
// Accuracy calculation — TOTAL correct / TOTAL attempted (NOT average of %)
// Averaging session percentages biases short sessions; pooled totals are honest.
// ──────────────────────────────────────────────────────────────────────────────
export function computeOverallAccuracy(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const completed = sessions.filter(s => s.status === 'completed' && (s.questions_attempted || 0) > 0);
  if (completed.length === 0) return null;
  const totalAttempted = completed.reduce((sum, s) => sum + (s.questions_attempted || 0), 0);
  const totalCorrect   = completed.reduce((sum, s) => sum + (s.questions_correct || 0), 0);
  if (totalAttempted === 0) return null;
  return Math.round((totalCorrect / totalAttempted) * 100);
}

export function computeSessionTotals(sessions) {
  const completed = (sessions || []).filter(s => s.status === 'completed');
  const totalAttempted = completed.reduce((sum, s) => sum + (s.questions_attempted || 0), 0);
  const totalCorrect   = completed.reduce((sum, s) => sum + (s.questions_correct || 0), 0);
  const totalMinutes   = completed.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  return {
    completedCount: completed.length,
    totalAttempted,
    totalCorrect,
    totalMinutes,
    accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Domain-level accuracy from session question_history
// ──────────────────────────────────────────────────────────────────────────────
export function computeDomainAccuracy(sessions) {
  const stats = {};
  (sessions || []).forEach(s => {
    if (s.status !== 'completed') return;
    (s.question_history || []).forEach(q => {
      if (!q.domain) return;
      if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0 };
      stats[q.domain].total++;
      if (q.correct) stats[q.domain].correct++;
    });
  });
  const result = {};
  Object.entries(stats).forEach(([domain, s]) => {
    result[domain] = {
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
      correct: s.correct,
    };
  });
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// Reconcile a domain's mastery using BOTH the live practice signal
// AND the diagnostic / knowledge-graph node level, taking the more
// recent / stronger signal.
// ──────────────────────────────────────────────────────────────────────────────
import { DOMAIN_TO_NODE_IDS } from './satMasterySync';

export function getConsistentDomainScores(userProfile, conceptNodes = [], sessions = []) {
  const domainScores = { ...(userProfile?.sat_performance?.domain_scores || {}) };
  const latestDiagSession = (sessions || []).find(s => s.session_type === 'diagnostic');
  const diagResponses = latestDiagSession?.question_history?.length > 0 
    ? latestDiagSession.question_history 
    : (userProfile?.sat_performance?.responses || []);

  if (diagResponses.length > 0) {
    const dCounts = {};
    diagResponses.forEach(r => {
      if (!r.domain) return;
      if (!dCounts[r.domain]) dCounts[r.domain] = { correct: 0, total: 0 };
      dCounts[r.domain].total++;
      if (r.correct) dCounts[r.domain].correct++;
    });
    Object.keys(dCounts).forEach(d => {
      domainScores[d] = (dCounts[d].correct / dCounts[d].total) * 100;
    });
  }

  const liveAccuracies = computeDomainAccuracy(sessions);
  
  const nodesById = {};
  conceptNodes.forEach(n => {
    if (n.node_id) nodesById[n.node_id] = n;
  });

  const mergedScores = {};
  const allDomains = Object.keys(DOMAIN_TO_NODE_IDS);
  
  allDomains.forEach(domain => {
    const liveStats = liveAccuracies[domain];
    const liveAccuracy = liveStats?.accuracy;
    const liveTotal = liveStats?.total;
    const diagnosticScore = domainScores[domain];

    let conceptNodeLevel = null;
    const nodeIds = DOMAIN_TO_NODE_IDS[domain] || [];
    const validNodes = nodeIds.map(id => nodesById[id]).filter(Boolean);
    if (validNodes.length > 0) {
      const avgPct = validNodes.reduce((sum, n) => sum + (MASTERY_LEVEL_TO_PCT[n.mastery_level] ?? 0), 0) / validNodes.length;
      conceptNodeLevel = scoreToMasteryLevel(avgPct);
    }

    const { score } = reconcileDomainScore({ liveAccuracy, liveTotal, diagnosticScore, conceptNodeLevel });
    if (score !== null) {
      mergedScores[domain] = score;
    }
  });

  return mergedScores;
}

export function reconcileDomainScore({ liveAccuracy, liveTotal, diagnosticScore, conceptNodeLevel }) {
  // Live accuracy needs at least 5 attempts to be trusted
  const liveTrusted = liveAccuracy != null && (liveTotal || 0) >= 5;
  const conceptPct = conceptNodeLevel ? MASTERY_LEVEL_TO_PCT[conceptNodeLevel] : null;

  // If we have trusted live data, that wins (most recent signal)
  if (liveTrusted) return { score: liveAccuracy, source: 'practice' };

  // Otherwise fall back to diagnostic score (exact percentage), then concept node mastery
  if (diagnosticScore != null) return { score: diagnosticScore, source: 'diagnostic' };
  if (conceptPct != null) return { score: conceptPct, source: 'graph' };
  
  if (liveAccuracy != null) return { score: liveAccuracy, source: 'practice_low_volume' };
  return { score: null, source: null };
}

// ──────────────────────────────────────────────────────────────────────────────
// Color tones for mastery (used everywhere for visual consistency)
// ──────────────────────────────────────────────────────────────────────────────
export function masteryTone(pct) {
  if (pct == null) return { bg: 'bg-stone-100', text: 'text-stone-500', fill: '#a8a29e' };
  if (pct >= MASTERY_THRESHOLDS.mastered)  return { bg: 'bg-emerald-500', text: 'text-white',         fill: '#059669' };
  if (pct >= MASTERY_THRESHOLDS.practiced) return { bg: 'bg-emerald-100', text: 'text-emerald-700',   fill: '#10b981' };
  if (pct >= MASTERY_THRESHOLDS.learning)  return { bg: 'bg-amber-100',   text: 'text-amber-700',     fill: '#f59e0b' };
  return                                          { bg: 'bg-rose-100',    text: 'text-rose-700',      fill: '#f43f5e' };
}
