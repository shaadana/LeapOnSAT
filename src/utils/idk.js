/**
 * Shared helpers for the "I Don't Know" (IDK) feature.
 *
 * An IDK response is stored in question_history as a normal entry with:
 *   - correct: false   (counts as incorrect for scoring & mastery)
 *   - idk: true        (marker so it can be displayed separately everywhere)
 *
 * This keeps all existing accuracy/mastery logic working unchanged, while
 * letting results/report views surface "not known" separately from wrong answers.
 */

// The sentinel value stored as the user's answer when they press IDK.
export const IDK_ANSWER = "__IDK__";

export function isIdkEntry(entry) {
  return !!(entry && (entry.idk === true || entry.user_answer === IDK_ANSWER));
}

// Count IDK entries in a question history array.
export function countIdk(history = []) {
  return history.filter(isIdkEntry).length;
}

// Breakdown of a question history into correct / wrong / idk counts.
export function tallyHistory(history = []) {
  let correct = 0, idk = 0, wrong = 0;
  for (const h of history) {
    if (isIdkEntry(h)) idk++;
    else if (h.correct) correct++;
    else wrong++;
  }
  return { correct, wrong, idk, total: history.length };
}
