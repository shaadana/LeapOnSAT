/**
 * Utility for syncing SAT diagnostic/practice mastery onto the static SAT Knowledge Graph nodes.
 *
 * The SAT question bank uses coarse domain labels (e.g. "algebra", "quadratics").
 * The static knowledge graph uses granular node IDs (e.g. "linear_eq", "quadratic_fn").
 * This mapping bridges them so that mastery from diagnostics/practice propagates to the right graph nodes.
 */

import { SAT_GRAPH_NODES } from '@/data/satKnowledgeGraph';

// Map from SAT question domain → static graph node IDs that domain covers
export const DOMAIN_TO_NODE_IDS = {
  algebra:              ['variables', 'linear_eq', 'linear_ineq', 'linear_fn', 'slope', 'word_problems'],
  advanced_algebra:     ['polynomials', 'factoring', 'quadratic_eq', 'quadratic_fn', 'rational_expr', 'radical_expr', 'functions', 'fn_transforms'],
  geometry:             ['angles', 'triangles', 'pythagorean', 'polygons', 'area_volume', 'coordinate_geo'],
  trigonometry:         ['trig_ratios', 'trig_applications', 'radians'],
  statistics:           ['mean_median', 'spread', 'scatterplots', 'two_way_tables', 'probability', 'data_inference'],
  problem_solving:      ['units', 'rates', 'percent_apps', 'data_tables', 'modeling'],
  systems_of_equations: ['systems_linear', 'systems_nonlin'],
  quadratics:           ['quadratic_eq', 'quadratic_fn', 'quadratic_apps'],
  exponentials:         ['exponential_fn', 'radical_expr'],
  ratios_proportions:   ['ratios', 'percents', 'units'],
  circles:              ['circles', 'area_volume'],
  polynomials:          ['polynomials', 'factoring', 'rational_expr'],
};

const MASTERY_ORDER = ['not_started', 'learning', 'practiced', 'mastered'];

// Volume-gated mastery thresholds — used ONLY when promoting a domain from
// raw practice into a persistent ConceptNode mastery_level.
//
// These intentionally differ from `MASTERY_THRESHOLDS` in performanceMetrics.js:
//   - performanceMetrics.MASTERY_THRESHOLDS = display thresholds for live accuracy %
//   - the values below                      = volume-gated promotion thresholds
//
// We require BOTH high accuracy AND enough attempts before we'll promote a node
// to "mastered" / "practiced", so a single lucky session can't fake mastery.
export function domainAccuracyToMastery(accuracyPct, totalAttempted) {
  if (accuracyPct >= 90 && totalAttempted >= 30) return 'mastered';
  if (accuracyPct >= 75 && totalAttempted >= 15) return 'practiced';
  if (accuracyPct >= 50 && totalAttempted >= 5)  return 'learning';
  return 'not_started';
}

/**
 * Given a domain → mastery map (from diagnostic or practice session),
 * upserts the corresponding ConceptNodes for all matching static graph nodes.
 *
 * Strategy per node:
 *   - If multiple domains map to the same node, take the BEST mastery level among them.
 *   - Merge with existing DB record: take the better of old vs new mastery.
 *
 * @param {string} userId
 * @param {Object} domainMasteryMap  e.g. { algebra: 'mastered', quadratics: 'learning', ... }
 * @param {Object} base44Client      the base44 SDK client
 */
export async function syncMasteryToKnowledgeGraph(userId, domainMasteryMap, base44Client, isDiagnostic = false) {
  if (!userId || !domainMasteryMap) return;

  // Build a map of nodeId → best mastery from the incoming domain data
  const nodeMasteryMap = {};
  for (const [domain, mastery] of Object.entries(domainMasteryMap)) {
    const nodeIds = DOMAIN_TO_NODE_IDS[domain] || [];
    for (const nodeId of nodeIds) {
      const existing = nodeMasteryMap[nodeId];
      if (!existing || MASTERY_ORDER.indexOf(mastery) > MASTERY_ORDER.indexOf(existing)) {
        nodeMasteryMap[nodeId] = mastery;
      }
    }
  }

  if (Object.keys(nodeMasteryMap).length === 0) return;

  // Fetch existing DB nodes for this user
  const existingNodes = await base44Client.entities.ConceptNode.filter({
    user_id: userId,
    study_plan_title: 'SAT Math Practice',
  });

  // Build lookup: node_id → DB record
  const existingByNodeId = {};
  for (const node of existingNodes) {
    existingByNodeId[node.node_id] = node;
  }

  // Upsert each affected graph node
  const operations = [];
  for (const [nodeId, newMastery] of Object.entries(nodeMasteryMap)) {
    const staticNode = SAT_GRAPH_NODES.find(n => n.id === nodeId);
    if (!staticNode) continue;

    const existing = existingByNodeId[nodeId];
    let finalMastery = newMastery;

    if (existing) {
      if (isDiagnostic) {
        // If diagnostic, always overwrite to establish new baseline.
        finalMastery = newMastery;
      } else {
        // Merge: keep the better mastery level
        const prevIdx = MASTERY_ORDER.indexOf(existing.mastery_level || 'not_started');
        const newIdx = MASTERY_ORDER.indexOf(newMastery);
        finalMastery = MASTERY_ORDER[Math.max(prevIdx, newIdx)];
      }

      operations.push(
        base44Client.entities.ConceptNode.update(existing.id, {
          mastery_level: finalMastery,
          description: `SAT Math: ${staticNode.title}. Updated from your practice.`,
        })
      );
    } else {
      operations.push(
        base44Client.entities.ConceptNode.create({
          user_id: userId,
          study_plan_title: 'SAT Math Practice',
          node_id: nodeId,
          title: staticNode.title,
          type: 'skill',
          description: `SAT Math: ${staticNode.title}.`,
          emoji: staticNode.emoji,
          subject_area: staticNode.domain,
          tags: ['sat', 'math', staticNode.domain.toLowerCase().replace(' ', '_')],
          mastery_level: finalMastery,
          completed: finalMastery === 'mastered',
        })
      );
    }
  }

  await Promise.all(operations);
}

/**
 * Recalculates and syncs the SAT Knowledge Graph for a user based on ALL their past performance
 * across practice sessions, lessons, diagnostics, and assignments.
 * 
 * @param {string} userId
 * @param {Object} base44Client
 */
export async function recalculateKnowledgeGraph(userId, base44Client) {
  if (!userId) return;

  // Fetch all completed practice sessions for the user
  const sessions = await base44Client.entities.PracticeSession.filter({
    user_id: userId,
    status: 'completed'
  });
  
  const profiles = await base44Client.entities.UserProfile.filter({ user_id: userId });
  const userProfile = profiles.length > 0 ? profiles[0] : null;

  const domainStats = {};

  // Aggregate performance across all sessions
  for (const session of sessions) {
    // If it's a lesson with domains_covered but no question_history, use its summary
    if (session.session_type === 'lesson' && session.domains_covered?.length > 0 && (!session.question_history || session.question_history.length === 0)) {
      const domain = session.domains_covered[0];
      if (!domainStats[domain]) domainStats[domain] = { correct: 0, attempted: 0, is_diagnostic: false };
      const attempted = session.questions_attempted || 0;
      const correct = session.questions_correct || 0;
      domainStats[domain].attempted += attempted;
      domainStats[domain].correct += correct;
    } else {
      let history = session.question_history;
      if ((!history || history.length === 0) && session.session_type === 'diagnostic' && userProfile?.sat_performance?.responses) {
        history = userProfile.sat_performance.responses;
      }

      if (history && history.length > 0) {
        // For choice, blitz, pyq, etc. calculate from question_history
        for (const q of history) {
          if (!q.domain) continue;
          if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, attempted: 0, is_diagnostic: false };
          domainStats[q.domain].attempted += 1;
          if (q.correct) domainStats[q.domain].correct += 1;
          if (session.session_type === 'diagnostic') {
            domainStats[q.domain].is_diagnostic = true;
          }
        }
      }
    }
  }

  // Calculate mastery per domain
  const domainMasteryMap = {};
  for (const [domain, stats] of Object.entries(domainStats)) {
    if (stats.attempted === 0) continue;
    const accuracyPct = Math.round((stats.correct / stats.attempted) * 100);
    
    // Fast-track diagnostic results to bypass volume gating
    if (stats.is_diagnostic && stats.attempted < 5) {
      if (accuracyPct === 100) domainMasteryMap[domain] = 'mastered';
      else if (accuracyPct >= 67) domainMasteryMap[domain] = 'practiced';
      else if (accuracyPct >= 33) domainMasteryMap[domain] = 'learning';
      else domainMasteryMap[domain] = 'not_started';
    } else {
      domainMasteryMap[domain] = domainAccuracyToMastery(accuracyPct, stats.attempted);
    }
  }

  // Sync to graph
  await syncMasteryToKnowledgeGraph(userId, domainMasteryMap, base44Client, true); // true forces overwrite with newly calculated baseline
}
