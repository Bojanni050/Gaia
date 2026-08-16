/**
 * Memory policy — significance gating for recall and reflection.
 *
 * architecture.md §6: "Memory policies are explicit contracts... governed by
 * declared policies — not by ad-hoc model behavior." This is that policy,
 * for the two decisions the desktop makes every turn: is this worth looking
 * up memory for, and is this worth remembering at all.
 *
 * This is a heuristic stand-in, not a reasoning judgment. Deciding real
 * significance — "does this actually matter" — is a Logos-level call
 * (architecture.md §6.2); there is no concrete Logos implementation in this
 * codebase yet (see docs/evolution.md, Milestone 7's closing note), so this
 * is length/pattern-based, cheap, and deliberately conservative: when in
 * doubt, it treats a turn as significant. A false "skip" silently loses a
 * moment; a false "keep" just costs a network call. The costs are not
 * symmetric, so neither is this policy.
 */

const MIN_RECALL_LENGTH = Number(process.env.REACT_APP_MEMORY_MIN_RECALL_LENGTH) || 12;
const MIN_REFLECT_LENGTH = Number(process.env.REACT_APP_MEMORY_MIN_REFLECT_LENGTH) || 12;

// Whole-message filler — matched only against the *entire* trimmed message,
// never as a substring, so "ok, but why does Hermes retry twice?" is never
// caught by "ok".
const FILLER_PATTERNS = new Set([
  'ok', 'okay', 'k', 'kk', 'sure', 'yes', 'yep', 'yup', 'no', 'nope',
  'thanks', 'thank you', 'thx', 'ty', 'np', 'cool', 'nice', 'great',
  'got it', 'gotcha', 'lol', 'haha', 'hi', 'hello', 'hey', 'bye',
  'goodnight', 'night', 'welcome', "you're welcome", 'alright',
]);

function normalize(text) {
  return (text || '').trim().toLowerCase().replace(/[.!?,]+$/g, '');
}

/** @param {string} text @param {number} minLength */
function isTrivial(text, minLength) {
  const normalized = normalize(text);
  if (!normalized) return true;
  if (FILLER_PATTERNS.has(normalized)) return true;
  return normalized.length < minLength;
}

/** Whether a recall lookup is worth doing for this query. */
export function shouldRecall(query) {
  return !isTrivial(query, MIN_RECALL_LENGTH);
}

/** Whether a completed exchange is worth reflecting into Hindsight. Skips only when *both* sides are trivial — reflect if either side carries real content. */
export function shouldReflect(userText, assistantText) {
  const userTrivial = isTrivial(userText, MIN_REFLECT_LENGTH);
  const assistantTrivial = isTrivial(assistantText, MIN_REFLECT_LENGTH);
  return !(userTrivial && assistantTrivial);
}

export const MEMORY_POLICY = Object.freeze({
  minRecallLength: MIN_RECALL_LENGTH,
  minReflectLength: MIN_REFLECT_LENGTH,
});
