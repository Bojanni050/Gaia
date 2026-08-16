/**
 * Memory policy — significance gating for recall and reflection.
 *
 * architecture.md §6: "Memory policies are explicit contracts... governed by
 * declared policies — not by ad-hoc model behavior." This is that policy,
 * for the two decisions the desktop makes every turn: is this worth looking
 * up memory for, and is this worth remembering at all.
 *
 * These are heuristic stand-ins, not reasoning judgments. Deciding real
 * significance — "does this actually matter" — is a Logos-level call
 * (architecture.md §6.2); there is no concrete Logos implementation for it
 * in this codebase yet (see docs/evolution.md), so this stays cheap and
 * pattern-based. `interpretIntent` (gaia/logos) is deliberately NOT used
 * here even though it already exists: it is an LLM round-trip, and gating
 * recall on it would add that latency to every single turn before Hermes
 * even starts — exactly the cost this policy exists to avoid. When a real
 * Logos judgment for "is memory needed" exists without that cost, it can
 * replace shouldRecall's body without any caller changing.
 *
 * shouldRecall is intentionally asymmetric from shouldReflect: reflection
 * defaults to "keep" when uncertain (a false skip silently loses a moment,
 * a false keep only costs a write), but recall defaults to "skip" when
 * uncertain (Hindsight has no daemon-side tool-only mode of its own — it is
 * a plain call-only HTTP API with no automatic injection — so this gate IS
 * the tool-only enforcement point; recalling on every substantive message,
 * as the previous length-only version of this function did, defeats that
 * by making recall the default in practice). Only a concrete signal that
 * long-term memory — not just the current conversation — is actually
 * relevant should trigger a lookup.
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

function boundary(word) {
  return new RegExp(`\\b${word}\\b`, 'i');
}

function phrase(words) {
  return new RegExp(words.trim().replace(/\s+/g, '\\s+'), 'i');
}

// Two small, principled signal groups — not a sprawling keyword list.
// Bilingual (NL/EN), matching the rest of Gaia's local heuristics (see
// state/intentIQ.js). Matched on word/phrase boundaries so e.g. "before"
// doesn't fire on "beforehand", and "project" doesn't fire on "projection".
const PAST_REFERENCE_SIGNALS = [
  boundary('remember'), boundary('remind'), boundary('recall'),
  boundary('eerder'), boundary('vorige'),
  phrase('last time'), phrase('previously'),
  phrase('we discussed'), phrase('you said'), phrase('i told you'), phrase('i mentioned'),
  phrase('weet je nog'), phrase('je zei'), phrase('ik vertelde'), phrase('ik zei'),
];

const DURABLE_CONTEXT_SIGNALS = [
  'project', 'database', 'databank', 'server', 'deployment', 'deploy',
  'config', 'configuration', 'configuratie', 'decision', 'decided', 'besluit',
  'preference', 'prefer', 'voorkeur', 'setup', 'architecture', 'workflow',
].map(boundary);

function hasSignal(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Whether a recall lookup is worth doing for this query. Conservative by
 * design: a trivial/filler turn, or a turn with no concrete signal that
 * long-term memory (rather than the current conversation) is relevant,
 * skips the lookup. This is the gate named in the turn lifecycle as
 * "does this turn require memory?" — see useConversation.js's
 * assembleTranscript.
 */
export function shouldRecall(query) {
  const text = (query || '').trim();
  if (isTrivial(text, MIN_RECALL_LENGTH)) return false;
  return hasSignal(text, PAST_REFERENCE_SIGNALS) || hasSignal(text, DURABLE_CONTEXT_SIGNALS);
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
