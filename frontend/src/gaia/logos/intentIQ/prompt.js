/**
 * prompt.js — the dedicated IntentIQ prompt.
 *
 * This is deliberately not the normal Gaia response prompt (SOUL/Foundation).
 * IntentIQ never answers the user, never solves the task, and never speaks
 * as Gaia — it only interprets. Output is JSON-only; free-form reasoning
 * text must never enter the application (architecture.md §4.2).
 */
import { INTENT_REGISTRY, INTENT_IDS, SOURCES_OF_TRUTH } from './registry';

const CONTEXT_WINDOW = 8; // recent turns of conversation, not the whole history

function formatRegistry() {
  return INTENT_IDS.map((id) => {
    const def = INTENT_REGISTRY[id];
    const examples = def.examples.length ? def.examples.map((e) => `    - "${e}"`).join('\n') : '    (none — this is a fallback outcome, not a positive intent)';
    const hardNegatives = def.hardNegatives.length ? def.hardNegatives.map((e) => `    - ${e}`).join('\n') : '    (none)';
    return [
      `- ${id} (family: ${def.family}, capability if genuinely required: ${def.capability}, reasoning profile: ${def.reasoningProfile ?? 'none'})`,
      `  Definition: ${def.definition}`,
      `  Positive examples:`,
      examples,
      `  Hard negatives / nearby intents:`,
      hardNegatives,
    ].join('\n');
  }).join('\n\n');
}

const INSTRUCTIONS = `You are intentIQ, a faculty of Logos — Gaia's cognitive reasoning layer.

Your only job is to interpret what the user is actually trying to achieve in their current turn. You are not Gaia. You do not talk to the user.

You MUST NOT:
- answer the user's question or solve their task
- write, fix, or design any code, text, or content the user asked for
- choose a reasoning provider or model, or mention one
- decide whether generated content is acceptable
- invent entities, facts, or a source of truth that isn't evidenced in the conversation
- force a known intent when the evidence is insufficient

You MUST:
- distinguish the user's underlying GOAL (intent) from the TOPIC they are discussing — the same topic can carry different intents (see hard negatives below)
- consider the recent conversation context, not just the last message, when it changes what the user is actually asking for
- return "ambiguous" when multiple listed intents remain materially plausible and the distinction matters
- return "unknown" when nothing in the registry genuinely fits
- return needsClarification: true when Gaia would need more information from the user before safely deciding what to do
- return capability: "none" whenever no capability is genuinely required — most turns need none

Respond with ONLY a single JSON object matching this exact shape — no prose, no markdown fences, no explanation:

{
  "intent": "<one of the registered intent ids below, or null>",
  "intentFamily": "<the family of the chosen intent, or \\"unknown\\">",
  "status": "accepted | ambiguous | unknown | unsafe_to_route",
  "confidence": <number 0 to 1>,
  "candidates": [ { "intent": "<intent id>", "confidence": <0 to 1> }, ... ],
  "entities": [ { "type": "<string>", "value": "<string>" }, ... ],
  "sourceOfTruth": "${SOURCES_OF_TRUTH.join(' | ')}",
  "capability": "<capability id from the registry, or \\"none\\">",
  "reasoningProfile": "<reasoning profile from the registry, or null>",
  "needsClarification": <true|false>
}`;

/**
 * @param {{ role: string, content: string }[]} messages full conversation so far, most recent last
 * @param {{ attachments?: Array<{ name?: string, type?: string }> }} [options]
 * @returns {import('@gaia/contracts').ReasoningMessage[]}
 */
export function buildIntentPrompt(messages, options = {}) {
  const { attachments = [] } = options;
  const recent = (messages || []).slice(-CONTEXT_WINDOW);
  const currentTurn = [...recent].reverse().find((m) => m.role === 'user');

  const conversationBlock = recent.length
    ? recent.map((m) => `${m.role}: ${m.content}`).join('\n')
    : '(no prior conversation)';

  const attachmentsBlock = attachments.length
    ? attachments.map((a) => `- ${a.name || 'attachment'}${a.type ? ` (${a.type})` : ''}`).join('\n')
    : '(none)';

  const userBlock = [
    'Recent conversation context:',
    conversationBlock,
    '',
    'Current user turn:',
    currentTurn ? currentTurn.content : '(none)',
    '',
    'Attachments/references available:',
    attachmentsBlock,
    '',
    'Intent registry:',
    formatRegistry(),
    '',
    'Return the IntentDecision JSON now.',
  ].join('\n');

  return [
    { role: 'system', content: INSTRUCTIONS },
    { role: 'user', content: userBlock },
  ];
}
