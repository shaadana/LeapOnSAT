/**
 * Maps a session question (with domain + question text) to the most relevant
 * SAT knowledge graph node. Used by the Deep Review feature so a student
 * can jump from a specific mistake straight to the right concept page.
 *
 * Strategy:
 *   1. Use DOMAIN_TO_NODE_IDS from satMasterySync as the base candidate set.
 *   2. Score each candidate node by keyword overlap with the question text.
 *   3. Return the highest-scoring node (with the static node metadata).
 *
 * If we can't find a confident match, we return the first node for the domain
 * so the student still gets a useful link, never a dead end.
 */

import { SAT_NODE_MAP, SAT_GRAPH_NODES } from '@/data/satKnowledgeGraph';
import { DOMAIN_TO_NODE_IDS } from '@/utils/satMasterySync';

// Keyword hints per node — picked from the node's title + description.
// Lowercased, simple substrings. Add more as we see misclassifications.
const NODE_KEYWORDS = {
  linear_eq:        ['linear equation', 'one-variable', 'multi-step'],
  linear_ineq:      ['inequality', 'inequalities', '<', '>', '≤', '≥'],
  linear_fn:        ['linear function', 'f(x) =', 'y = mx', 'y=mx'],
  slope:            ['slope', 'rate of change', 'rise over run'],
  slope_intercept:  ['y-intercept', 'slope-intercept', 'y = mx + b'],
  parallel_perp:    ['parallel', 'perpendicular', 'negative reciprocal'],
  systems_linear:   ['system of', 'two equations', 'substitution', 'elimination'],
  systems_word:     ['tickets', 'coins', 'mixture', 'two numbers'],
  word_problems:    ['age', 'work', 'distance', 'word problem'],
  abs_value:        ['absolute value', '|x', '|2x', '|3x'],
  fn_notation:      ['f(', 'g(', 'h(', 'function notation', 'evaluate'],
  domain_range:     ['domain', 'range', 'undefined'],

  polynomials:      ['polynomial', 'degree', 'leading coefficient'],
  factoring_trinomials: ['factor', 'factoring', 'trinomial'],
  diff_squares:     ['difference of squares', 'a² − b²', 'x² − 9', 'x² − 16'],
  perfect_sq:       ['perfect square', '(x +', '(x −', '² ='],
  quadratic_eq:     ['quadratic equation', 'x² +', 'x² −', 'roots'],
  quadratic_formula: ['quadratic formula', 'discriminant', 'b² − 4ac'],
  discriminant:     ['discriminant', 'real solutions', 'no real solutions', 'one solution'],
  completing_sq:    ['completing the square', 'vertex form'],
  quadratic_fn:     ['parabola', 'vertex', 'axis of symmetry', 'maximum height', 'minimum value'],
  vieta:            ['sum of roots', 'product of roots', 'vieta'],
  remainder_thm:    ['remainder', 'factor theorem', 'p(', 'divided by'],
  poly_long_div:    ['long division', 'divided by'],
  rational_expr:    ['rational expression', '/(x', 'simplif'],
  rational_eq:      ['rational equation', 'extraneous'],
  radical_expr:     ['√', 'radical', 'rational exponent', 'cube root'],
  radical_eq:       ['radical equation', 'square both sides'],
  exponential_fn:   ['exponential', 'growth', 'decay', 'half-life', 'doubles', 'triples'],
  exp_equations:    ['^x =', 'common base', 'b^x'],
  logarithms:       ['log', 'logarithm', 'ln'],
  functions:        ['composition', 'f(g(', 'g(f('],
  inverse_fn:       ['inverse function', 'f⁻¹'],
  fn_transforms:    ['shift', 'reflect', 'stretch', 'translation'],
  complex_numbers:  ['imaginary', 'complex number', 'i²', 'i = '],

  triangles:        ['triangle', 'similar', 'congruent'],
  special_triangles: ['30-60-90', '45-45-90', 'special right'],
  pythagorean:      ['pythagorean', 'hypotenuse', 'right triangle', 'leg'],
  distance_formula: ['distance formula', 'midpoint'],
  polygons:         ['polygon', 'quadrilateral', 'hexagon', 'pentagon'],
  area_2d:          ['area', 'rectangle', 'parallelogram', 'trapezoid'],
  perimeter:        ['perimeter', 'circumference'],
  circles:          ['circle', 'radius', 'diameter', 'chord'],
  arc_sector:       ['arc', 'sector', 'central angle'],
  inscribed_angles: ['inscribed', 'tangent'],
  circle_eq:        ['(x −', '(x +', '(y −', '(y +', '= r²', 'equation of'],
  volume_prisms:    ['volume', 'cylinder', 'prism'],
  volume_cones:     ['cone', 'sphere', 'pyramid'],
  surface_area:     ['surface area'],
  angles:           ['angle', 'supplementary', 'complementary', 'vertical angles'],
  parallel_lines:   ['parallel', 'transversal', 'corresponding'],

  trig_ratios:      ['sin', 'cos', 'tan', 'sine', 'cosine', 'tangent', 'soh-cah-toa'],
  trig_finding_side: ['find the side', 'side opposite', 'side adjacent'],
  trig_applications: ['elevation', 'depression', 'shadow', 'ladder'],
  special_trig:     ['sin(30', 'cos(60', 'tan(45', '30°', '45°', '60°'],
  radians:          ['radian', 'π/'],
  unit_circle:      ['unit circle', 'quadrant'],
  trig_identities:  ['sin² + cos²', 'identity', 'pythagorean identity'],
  trig_graphs:      ['amplitude', 'period', 'sin(', 'cos('],
  sine_rule:        ['law of sines'],
  cosine_rule:      ['law of cosines'],

  mean_median:      ['mean', 'median', 'mode', 'average'],
  weighted_avg:     ['weighted average'],
  spread:           ['range', 'iqr', 'spread', 'interquartile'],
  std_dev:          ['standard deviation', 'standard deviations'],
  boxplots:         ['box plot', 'boxplot', 'q1', 'q3'],
  histograms:       ['histogram', 'frequency'],
  distribution_shape: ['skewed', 'symmetric', 'bell-shaped'],
  scatterplots:     ['scatterplot', 'scatter plot', 'correlation'],
  line_of_best_fit: ['line of best fit', 'regression'],
  two_way_tables:   ['two-way table', 'two way table'],
  conditional_prob: ['conditional', 'p(a|b)', 'given that'],
  probability:      ['probability', 'random', 'chance'],
  data_inference:   ['margin of error', 'sample size', 'sample', 'survey'],
  normal_dist:      ['normal distribution', 'empirical rule', '68%', '95%'],

  ratios:           ['ratio', 'proportion'],
  percents:         ['percent', '%', 'discount', 'tax'],
  percent_apps:     ['discount', 'tax', 'tip', 'interest'],
  compound_interest: ['compound interest', 'compounded'],
  unit_conversions: ['convert', 'kilometer', 'mile', 'gallon', 'liter'],
  rates:            ['rate', 'work', 'pipe', 'fill'],
  mixture:          ['mixture', 'solution', 'concentration', 'alloy'],
  distance_word:    ['miles per hour', 'mph', 'speed', 'travel'],
  direct_variation: ['directly proportional', 'inversely proportional', 'varies'],
  sequences:        ['arithmetic sequence', 'common difference', 'nth term'],
  geometric_seq:    ['geometric sequence', 'common ratio'],
};

const HEADING_FOR_DOMAIN = {
  algebra: 'Algebra',
  advanced_algebra: 'Advanced Algebra',
  geometry: 'Geometry',
  trigonometry: 'Trigonometry',
  statistics: 'Statistics',
  problem_solving: 'Problem Solving',
  systems_of_equations: 'Algebra',
  quadratics: 'Advanced Algebra',
  exponentials: 'Advanced Algebra',
  ratios_proportions: 'Foundations',
  circles: 'Geometry',
  polynomials: 'Advanced Algebra',
};

/**
 * Find the best knowledge graph node for a question.
 * @param {{question_text?: string, domain?: string}} question
 * @returns {{ id, title, domain, emoji } | null}
 */
export function getBestNodeForQuestion(question) {
  if (!question) return null;
  const text = (question.question_text || '').toLowerCase();
  const domain = question.domain;
  const candidates = DOMAIN_TO_NODE_IDS[domain] || [];

  // Score each candidate by keyword hits in the question text.
  let best = null;
  let bestScore = 0;
  for (const nodeId of candidates) {
    const node = SAT_NODE_MAP[nodeId];
    if (!node) continue;
    const keywords = NODE_KEYWORDS[nodeId] || [];
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }

  // Fallback: first valid node in the domain.
  if (!best) {
    for (const nodeId of candidates) {
      if (SAT_NODE_MAP[nodeId]) { best = SAT_NODE_MAP[nodeId]; break; }
    }
  }

  // Last fallback: any node in the matching graph domain heading.
  if (!best && domain) {
    const heading = HEADING_FOR_DOMAIN[domain];
    if (heading) {
      best = SAT_GRAPH_NODES.find(n => n.domain === heading) || null;
    }
  }

  return best;
}

/**
 * Group an array of mistakes by their best-matching concept node.
 * Returns [{ node, mistakes: [...] }, ...] sorted by mistake count desc.
 */
export function groupMistakesByConcept(mistakes) {
  const buckets = new Map();
  for (const m of mistakes || []) {
    const node = getBestNodeForQuestion(m);
    const key = node?.id || `__${m.domain || 'unknown'}__`;
    if (!buckets.has(key)) buckets.set(key, { node, mistakes: [] });
    buckets.get(key).mistakes.push(m);
  }
  return [...buckets.values()].sort((a, b) => b.mistakes.length - a.mistakes.length);
}
