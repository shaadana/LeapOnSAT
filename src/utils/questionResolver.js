import { base44 } from '@/api/base44Client';

/**
 * Maps a question entity name to its SDK accessor and a normalizer
 * that produces a common shape: { id, question_text, domain, difficulty,
 * options, correct_answer, explanation, passage, source }.
 */
const ENTITY_MAP = {
  SATQuestion: {
    entity: () => base44.entities.SATQuestion,
    normalize: (q) => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.domain,
      difficulty: q.difficulty,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      passage: q.passage,
      source: q.source,
    }),
  },
  CanyonMath: {
    entity: () => base44.entities.CanyonMath,
    normalize: (q) => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.category || 'problem_solving',
      difficulty: q.difficulty || 'hard',
      options: q.options,
      correct_answer: q.correct_answer || q.answer,
      explanation: q.explanation,
      passage: undefined,
      source: q.source,
    }),
  },
  CanyonMathPDFsandGuidance: {
    entity: () => base44.entities.CanyonMathPDFsandGuidance,
    normalize: (q) => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.category || 'problem_solving',
      difficulty: q.difficulty || 'hard',
      options: q.options,
      correct_answer: q.correct_answer || q.answer,
      explanation: q.explanation,
      passage: undefined,
      source: q.source_pdf,
    }),
  },
  PYQQuestion: {
    entity: () => base44.entities.PYQQuestion,
    normalize: (q) => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.domain,
      difficulty: q.difficulty,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      passage: undefined,
      source: q.source,
    }),
  },
  EnglishQuestion: {
    entity: () => base44.entities.EnglishQuestion,
    normalize: (q) => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.domain,
      difficulty: q.difficulty,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      passage: q.passage,
      source: q.source,
      rule_reference: q.rule_reference,
      college_board_domain: q.college_board_domain,
      college_board_skill: q.college_board_skill,
    }),
  },
  EnglishCBQuestion: {
    entity: () => base44.entities.EnglishCBQuestion,
    normalize: (q) => ({
      id: q.id,
      question_text: q.question_text,
      domain: q.domain || q.skill || 'reading_comprehension',
      difficulty: q.difficulty || 'medium',
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      passage: q.passage,
      source: 'College Board',
    }),
  },
};

/**
 * Resolve an array of (possibly entity-prefixed) question IDs into
 * normalized question objects, preserving order.
 *
 * IDs may be prefixed with the entity name, e.g. "SATQuestion:abc123".
 * Unprefixed IDs fall back to defaultEntity.
 */
export async function resolveQuestionIds(ids, defaultEntity = 'SATQuestion') {
  if (!ids || ids.length === 0) return [];

  const byEntity = {};
  ids.forEach((rawId) => {
    const colonIdx = rawId.indexOf(':');
    let entityName, questionId;
    if (colonIdx > 0) {
      entityName = rawId.substring(0, colonIdx);
      questionId = rawId.substring(colonIdx + 1);
    } else {
      entityName = defaultEntity;
      questionId = rawId;
    }
    if (!byEntity[entityName]) byEntity[entityName] = [];
    byEntity[entityName].push(questionId);
  });

  const resolvedByKey = {};
  for (const [entityName, questionIds] of Object.entries(byEntity)) {
    const config = ENTITY_MAP[entityName] || ENTITY_MAP[defaultEntity];
    if (!config) continue;
    const entity = config.entity();
    let results = [];
    try {
      results = await entity.filter({ id: { $in: questionIds } });
    } catch (e) {
      // Fallback: fetch individually
      results = (await Promise.all(
        questionIds.map((id) => entity.filter({ id }).then((r) => r[0]).catch(() => null))
      )).filter(Boolean);
    }
    results.forEach((q) => {
      const normalized = config.normalize(q);
      resolvedByKey[`${entityName}:${q.id}`] = { ...normalized, _sourceEntity: entityName };
    });
  }

  return ids.map((rawId) => {
    const colonIdx = rawId.indexOf(':');
    const entityName = colonIdx > 0 ? rawId.substring(0, colonIdx) : defaultEntity;
    const questionId = colonIdx > 0 ? rawId.substring(colonIdx + 1) : rawId;
    return (
      resolvedByKey[`${entityName}:${questionId}`] ||
      resolvedByKey[`${defaultEntity}:${questionId}`]
    );
  }).filter(Boolean);
}

/** Return the entity-prefixed ID for a question from a given database. */
export function prefixedId(entityName, questionId) {
  return `${entityName}:${questionId}`;
}
