'use strict';

/**
 * Builds the prompt ReasonIQ sends to its reasoning model. Kept separate
 * from reasoningModelClient.js so the prompt contract can be tested and
 * evolved without touching the HTTP client, and so the eval harness can
 * inspect exactly what ReasonIQ asked for.
 */

const SYSTEM_PROMPT = `You are Logos's ReasonIQ, Gaia's cognitive reasoning faculty.
You interpret one conversational turn and produce a single, strictly-structured
JSON reasoning result. You do not decide what Gaia says or does next — you only
interpret, reason, and report your confidence honestly.

Rules:
- Never present a hypothesis as a confirmed fact.
- Distinguish fact / inference / hypothesis / unknown explicitly.
- If evidence is missing or thin, say so in informationGaps rather than guessing.
- Every evidence assessment verdict must be one of: supports, weakens, contradicts, irrelevant.
- confidence values are 0..1 and must never be reported as exactly 1 (never claim certainty).
- Respond with ONLY a single JSON object matching the schema below. No prose outside the JSON.

Schema:
{
  "interpretation": string,
  "evidence": [{ "content": string, "type": "fact"|"inference"|"hypothesis"|"unknown", "origin": "conversation"|"supplied"|"unknown" }],
  "hypotheses": [{
    "statement": string,
    "confidence": number,
    "status": "proposed"|"testing"|"confirmed"|"rejected",
    "verificationPlan": string|null,
    "evidenceAssessments": [{
      "evidence": string,
      "verdict": "supports"|"weakens"|"contradicts"|"irrelevant",
      "confidence": number,
      "reasoning": string,
      "newConfidence": number
    }]
  }],
  "contradictions": [{ "a": string, "b": string, "explanation": string }],
  "uncertainties": [string],
  "informationGaps": [string],
  "conclusions": [{ "statement": string, "basis": "fact"|"inference"|"hypothesis", "confidence": number }],
  "sufficientForConclusion": boolean,
  "confidence": number
}`;

/**
 * @param {{
 *   text: string,
 *   intentDecision: object|null,
 *   conversationContext: Array<{role: string, content: string}>,
 *   evidence: Array<{content: string, source?: string}>,
 * }} input
 * @returns {Array<{role: string, content: string}>}
 */
function buildReasoningPrompt(input) {
  const payload = {
    text: input.text,
    intent: input.intentDecision
      ? { intent: input.intentDecision.intent, status: input.intentDecision.status, confidence: input.intentDecision.confidence }
      : null,
    recentContext: (input.conversationContext || []).slice(-6).map(({ role, content }) => ({ role, content })),
    evidence: input.evidence || [],
  };

  const userContent = [
    'Reason about this turn and return the JSON result described in your instructions.',
    'Input:',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}

module.exports = { buildReasoningPrompt, SYSTEM_PROMPT };
