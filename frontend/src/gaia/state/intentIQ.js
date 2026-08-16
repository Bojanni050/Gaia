/**
 * intentIQ — Gaia's local, heuristic intent classifier.
 *
 * Logos's intentIQ faculty (architecture.md §4.2) reads a turn and decides
 * what it's really asking for. This is the smallest honest version of that:
 * fast, local, no extra model round-trip. It picks which foundation
 * documents (foundation/rules.js) accompany a turn — not a full reasoning
 * profile (orchestrator.md's Calm/Creative/Technical/Analytical/Playful);
 * nothing in this codebase consumes that vocabulary yet, so introducing it
 * here would be unused surface, not a real capability.
 *
 * Like memoryPolicy.js, this is explicitly a heuristic stand-in, not a
 * reasoning judgment — a real intentIQ would understand intent, not pattern
 * match for it. This exists so the seam is real and something can improve
 * behind it later without every caller changing.
 */

const boundary = (word) => new RegExp(`\\b${word}\\b`, 'i');

// Bilingual (NL/EN) — the desktop has an NL/EN toggle, and the previous
// heuristic was English-only, so it silently missed Dutch technical turns.
const TECHNICAL_SIGNALS = [
  'implement', 'implementeer', 'implementeren',
  'refactor', 'refactoren', 'refactoring',
  'architecture', 'architectuur',
  'prompt',
  'code', 'codeer', 'codeert',
  'bug', 'fout', 'error',
  'deploy', 'deployen', 'deployment',
  'database', 'databank',
  'api',
  'function', 'functie',
  'component',
].map(boundary);

const GAIA_SIGNALS = [
  /why did you answer (that|like that)/i,
  /what are your principles/i,
  /wat zijn je principes/i,
  /how do you think/i,
  /hoe denk je/i,
  /\bevolution\b/i,
  /\bevolutie\b/i,
  /who are you/i,
  /wie ben je/i,
];

function score(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

/**
 * Classifies intent from recent user turns, not the full conversation —
 * scoping to a small window means a topic shift is picked up within a turn
 * or two, instead of the classification getting stuck on whatever was
 * mentioned earliest (the bug in the previous whole-history heuristic).
 *
 * @param {{ role: string, content: string }[]} messages
 * @param {number} [windowSize] how many recent user turns to consider
 * @returns {{ type: 'technical'|'gaia'|'conversation' }}
 */
export function deriveIntent(messages, windowSize = 3) {
  const recentUserText = (messages || [])
    .filter((m) => m.role === 'user')
    .slice(-windowSize)
    .map((m) => m.content || '')
    .join(' ');

  if (!recentUserText.trim()) return { type: 'conversation' };

  const gaiaScore = score(recentUserText, GAIA_SIGNALS);
  const technicalScore = score(recentUserText, TECHNICAL_SIGNALS);

  if (gaiaScore === 0 && technicalScore === 0) return { type: 'conversation' };
  return gaiaScore >= technicalScore ? { type: 'gaia' } : { type: 'technical' };
}
