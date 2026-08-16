/**
 * LEGACY local heuristic — NOT Logos's semantic intentIQ.
 *
 * The real, Logos-level intentIQ now lives at gaia/logos/intentIQ (an LLM
 * call through the generic reasoning-provider abstraction, schema-validated
 * into an IntentDecision — see gaia/logos/intentIQ/intentIQ.js). This
 * module predates it and remains only as a fast, synchronous, zero-latency
 * local context hint: it picks which foundation documents
 * (foundation/rules.js) accompany a turn, a narrower and cheaper job than a
 * full IntentDecision. Nothing in this codebase treats this module's output
 * as Gaia's understanding of user intent anymore — that responsibility
 * belongs to gaia/logos.
 *
 * Kept deliberately simple: pattern matching over the last few user turns,
 * no reasoning, no model call. useConversation.js still calls deriveIntent()
 * synchronously for Foundation selection because that selection has to
 * happen before the transcript is sent, cheaply; it separately calls
 * gaia/logos's interpretIntent() for the real decision (currently
 * dev-logged only — see useConversation.js).
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
