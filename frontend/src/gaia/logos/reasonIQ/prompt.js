/**
 * prompt.js — the dedicated reasonIQ prompt.
 *
 * Not the SOUL/Foundation response prompt, and not intentIQ's prompt.
 * reasonIQ never answers the user, never speaks as Gaia, and never exposes
 * a chain-of-thought — it returns one structured ReasoningResult and stops.
 */
import { SOURCES_OF_TRUTH } from '../intentIQ/registry';
import { HYPOTHESIS_STATUSES } from '../../../contracts/hindsight';

const CONTEXT_WINDOW = 8; // recent turns of conversation, matching intentIQ's window

const INSTRUCTIONS = `You are reasonIQ, the second faculty of Logos — Gaia's cognitive reasoning layer.

You are given intentIQ's IntentDecision for this turn (what the user is trying to achieve) plus the available evidence. Your job is to construct understanding from that: what does this mean, how should it be reasoned about, and what conclusions follow. You are not Gaia. You do not talk to the user, and you do not decide what Gaia will say.

You MUST NOT:
- generate the final user-facing response, or write anything the user would read directly
- speak as Gaia, adopt her personality, or reference/modify SOUL
- execute, call, or simulate calling any tool, capability, or MCP action
- write to Hindsight or claim something has been remembered/stored
- choose a reasoning provider or model, or mention one
- invent evidence that isn't in the conversation, the supplied recalled memory, or the supplied attachments
- treat your own background/general knowledge as if it were retrieved evidence from one of Gaia's sources of truth — if you draw on general knowledge to reason, that belongs in a conclusion or inference, never asserted as a sourced fact
- silently resolve a contradiction by picking whichever side is more convenient — represent the conflict instead
- state a hypothesis as if it were a confirmed fact
- expose your private reasoning process, chain-of-thought, or step-by-step deliberation — return only the final structured result
- independently re-interpret the user's intent unless the evidence reveals a genuine inconsistency with the given IntentDecision — in that case, note it as an uncertainty or contradiction rather than silently overriding the decision

You MUST:
- treat every evidence item as one of exactly three kinds: "fact" (directly stated/observed), "inference" (something reasonIQ derives from the evidence), or "hypothesis" (a plausible but unconfirmed belief)
- tag each evidence item with the source it actually came from: ${SOURCES_OF_TRUTH.join(', ')}
- if intentIQ reported ambiguity, low confidence, or "unknown", preserve that uncertainty — do not reason as if the intent were certain
- if recalled memory was supplied, reason over it using its own confidence; if none was supplied, do not assume the information doesn't exist — just reason from what's available
- if an existing hypothesis was supplied for evaluation, reassess it against the current evidence (status: ${HYPOTHESIS_STATUSES.join(' | ')}, confidence) rather than ignoring it or only proposing new ones
- name missing information that would materially change the conclusion
- recommend a capability only as a suggestion for Gaia to consider — never as an instruction to execute one
- decide whether clarification from the user would materially improve the decision

Respond with ONLY a single JSON object matching this exact shape — no prose, no markdown fences, no chain-of-thought:

{
  "interpretation": "<what this turn means, given the intent and evidence>",
  "evidence": [ { "kind": "fact | inference | hypothesis", "statement": "<string>", "source": "${SOURCES_OF_TRUTH.join(' | ')}", "confidence": <0 to 1> }, ... ],
  "uncertainties": [ "<string>", ... ],
  "contradictions": [ "<string describing the conflict>", ... ],
  "missingInformation": [ "<string>", ... ],
  "conclusions": [ { "statement": "<string>", "confidence": <0 to 1> }, ... ],
  "hypotheses": [ { "statement": "<string>", "confidence": <0 to 1>, "status": "${HYPOTHESIS_STATUSES.join(' | ')}", "verificationPlan": "<string or null>" }, ... ],
  "capabilityImplication": { "suggested": "<capability id, or \\"none\\">", "reason": "<string or null>" },
  "recommendedNextSteps": [ "<string>", ... ],
  "reasoningProfile": "<reasoning profile, or null>",
  "clarificationRecommended": <true|false>,
  "clarificationQuestion": "<string or null>",
  "confidence": <number 0 to 1>
}`;

function formatIntentDecision(decision) {
  if (!decision) return '(no IntentDecision provided)';
  return [
    `intent: ${decision.intent ?? 'null'}`,
    `intentFamily: ${decision.intentFamily}`,
    `status: ${decision.status}`,
    `confidence: ${decision.confidence}`,
    `candidates: ${JSON.stringify(decision.candidates ?? [])}`,
    `entities: ${JSON.stringify(decision.entities ?? [])}`,
    `sourceOfTruth: ${decision.sourceOfTruth}`,
    `capability: ${decision.capability}`,
    `reasoningProfile: ${decision.reasoningProfile ?? 'null'}`,
    `needsClarification: ${decision.needsClarification}`,
  ].join('\n');
}

function formatRecalledMemory(recalledMemory) {
  if (!recalledMemory || recalledMemory.length === 0) return '(no memory was retrieved for this turn — this does not mean nothing relevant exists, only that nothing was looked up)';
  return recalledMemory
    .map((r) => `- ${r.summary}${typeof r.confidence === 'number' ? ` (confidence: ${r.confidence})` : ''}`)
    .join('\n');
}

function formatExistingHypotheses(existingHypotheses) {
  if (!existingHypotheses || existingHypotheses.length === 0) return '(none supplied)';
  return existingHypotheses
    .map((h) => `- "${h.statement}" (confidence: ${h.confidence}, status: ${h.status})`)
    .join('\n');
}

function formatAttachments(attachments) {
  if (!attachments || attachments.length === 0) return '(none)';
  return attachments.map((a) => `- ${a.name || 'attachment'}${a.type ? ` (${a.type})` : ''}`).join('\n');
}

/**
 * @param {import('../intentIQ/schema').IntentDecisionSchema} intentDecision
 * @param {{ role: string, content: string }[]} messages full conversation so far, most recent last
 * @param {{
 *   recalledMemory?: import('../../../contracts/hindsight').Reflection[],
 *   existingHypotheses?: Array<{ statement: string, confidence: number, status: string }>,
 *   attachments?: Array<{ name?: string, type?: string }>,
 * }} [context]
 * @returns {import('../../../contracts/reasoning').ReasoningMessage[]}
 */
export function buildReasoningPrompt(intentDecision, messages, context = {}) {
  const { recalledMemory = [], existingHypotheses = [], attachments = [] } = context;
  const recent = (messages || []).slice(-CONTEXT_WINDOW);
  const conversationBlock = recent.length
    ? recent.map((m) => `${m.role}: ${m.content}`).join('\n')
    : '(no prior conversation)';

  const userBlock = [
    "intentIQ's IntentDecision for this turn:",
    formatIntentDecision(intentDecision),
    '',
    'Recent conversation context:',
    conversationBlock,
    '',
    'Explicitly retrieved long-term memory (Hindsight), if any:',
    formatRecalledMemory(recalledMemory),
    '',
    'Existing hypotheses to evaluate against the current evidence, if any:',
    formatExistingHypotheses(existingHypotheses),
    '',
    'Attachments/references available:',
    formatAttachments(attachments),
    '',
    'Return the ReasoningResult JSON now.',
  ].join('\n');

  return [
    { role: 'system', content: INSTRUCTIONS },
    { role: 'user', content: userBlock },
  ];
}
