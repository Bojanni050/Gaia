'use strict';

/**
 * Memory policy — significance gating for recall and reflection. A direct
 * port of gaia-web/src/gaia/state/memoryPolicy.js (same signal groups,
 * same thresholds) — see that file's own comment for the full reasoning
 * (architecture.md §6's "memory policies are explicit contracts", the
 * asymmetry between recall defaulting to skip and reflection defaulting
 * to keep, and why this stays heuristic rather than an LLM judgment).
 */

const MIN_RECALL_LENGTH = Number(process.env.MEMORY_MIN_RECALL_LENGTH) || 12;
const MIN_REFLECT_LENGTH = Number(process.env.MEMORY_MIN_REFLECT_LENGTH) || 12;

const FILLER_PATTERNS = new Set([
  'ok', 'okay', 'k', 'kk', 'sure', 'yes', 'yep', 'yup', 'no', 'nope',
  'thanks', 'thank you', 'thx', 'ty', 'np', 'cool', 'nice', 'great',
  'got it', 'gotcha', 'lol', 'haha', 'hi', 'hello', 'hey', 'bye',
  'goodnight', 'night', 'welcome', "you're welcome", 'alright',
]);

function normalize(text) {
  return (text || '').trim().toLowerCase().replace(/[.!?,]+$/g, '');
}

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

/** @param {string} query */
function shouldRecall(query) {
  const text = (query || '').trim();
  if (isTrivial(text, MIN_RECALL_LENGTH)) return false;
  return hasSignal(text, PAST_REFERENCE_SIGNALS) || hasSignal(text, DURABLE_CONTEXT_SIGNALS);
}

/** @param {string} userText @param {string} assistantText */
function shouldReflect(userText, assistantText) {
  const userTrivial = isTrivial(userText, MIN_REFLECT_LENGTH);
  const assistantTrivial = isTrivial(assistantText, MIN_REFLECT_LENGTH);
  return !(userTrivial && assistantTrivial);
}

const MEMORY_POLICY = Object.freeze({
  minRecallLength: MIN_RECALL_LENGTH,
  minReflectLength: MIN_REFLECT_LENGTH,
});

module.exports = { shouldRecall, shouldReflect, MEMORY_POLICY };
