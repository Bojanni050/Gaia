'use strict';

/**
 * Logos.ReasonIQ v0.1 — "what does this mean, what follows from the
 * available information, what hypotheses are plausible, and how certain
 * are we?"
 *
 * Scope for this phase (see the ReasonIQ v0.1 implementation brief):
 *
 *   USER -> IntentIQ -> IntentDecision -> ReasonIQ -> Reasoning LLM
 *        -> ReasoningResult -> Gaia
 *
 * ReasonIQ is a cognitive component, not an agent. It never calls Hermes,
 * Hindsight, or MCP; never selects or executes a tool; never writes to
 * any database; never decides Gaia's final response or action. It
 * consumes an already-produced IntentDecision (logos/intentIQ.js) rather
 * than re-deriving intent, and it owns its own reasoning model — a
 * separate, independently configurable LLM seam (reasoningModelClient.js)
 * that is not Hermes and not a Gaia capability. Everything it produces is
 * in-memory only; nothing here persists a hypothesis or a reasoning
 * result anywhere (§8 of the brief — Hindsight is out of scope this
 * phase).
 *
 * Reasoning depth: ReasonIQ decides for itself, per turn, whether the
 * reasoning model needs to be invoked at all (§6) — and it only does when
 * there is genuinely something to weigh. Without supplied evidence there
 * is nothing for a model call to reason *over*: no intent, however
 * substantial, turns an empty evidence list into hypotheses or verdicts,
 * so paying for a call there would only ever reproduce the same honest
 * "nothing to reason over" result the shallow path already gives for
 * free. Deep reasoning is therefore triggered by evidence, not by intent
 * or text length — the model *is* the reasoning engine, used only once
 * there is something to use it on.
 *
 * "Shallow" is not "do nothing", though — see shallowResult()/
 * EVIDENCE_DEPENDENT_INTENTS below. Before ever reaching for the model,
 * ReasonIQ still reads the cheap signals already on hand (IntentIQ's own
 * status, and whether an evidence-dependent intent got any evidence at
 * all) to report honest uncertainty and information gaps. Getting more
 * intelligent than that without a model call is future work, not a gap
 * in this pass — see the module's own limitations note in the
 * implementation report.
 */

const crypto = require('crypto');
const { buildReasoningPrompt } = require('./reasonPrompt');
const { parseAndValidateReasoningOutput, MalformedReasoningOutputError } = require('./reasonValidate');
const { createReasoningModelClient } = require('./reasoningModelClient');
const { resolveReasoningModelConfig } = require('./reasoningModelConfigResolver');
const { createReasoningModelStore } = require('./reasoningModelStore');
const { SCHEMA_VERSION, REASONER_VERSION } = require('./reasonModels');
const { logReasoningResult } = require('./reasonLog');

// --- reasoning depth heuristic --------------------------------------------

/**
 * Deep reasoning is warranted exactly when there is evidence to weigh —
 * that's the one thing a model call can do that the shallow path can't.
 * Intent and text length used to also factor in here; they were removed
 * because, with no evidence supplied, every intent bottoms out at the
 * same "nothing to reason over" result regardless of how the turn reads,
 * so branching on intent only bought extra model calls for no extra
 * signal.
 * @param {{ text: string, evidence?: Array }} input
 * @returns {'shallow'|'deep'}
 */
function decideReasoningDepth(input) {
  const hasEvidence = Array.isArray(input.evidence) && input.evidence.length > 0;
  return hasEvidence ? 'deep' : 'shallow';
}

// --- fallback / shallow result construction -------------------------------

function baseResult(overrides) {
  return {
    schemaVersion: SCHEMA_VERSION,
    interpretation: '',
    reasoningDepth: 'shallow',
    evidence: [],
    hypotheses: [],
    contradictions: [],
    uncertainties: [],
    informationGaps: [],
    conclusions: [],
    sufficientForConclusion: false,
    confidence: 0,
    meta: { reasonerVersion: REASONER_VERSION, reasoningModelConfigured: false, fallbackReason: null },
    ...overrides,
  };
}

// Intents that plausibly need supporting material to actually conclude
// anything — a request to explain, transform, decide, or act on
// something is only as good as what it has to work with. Kept small and
// legible, same posture as intentIQ.js's own signal sets: a heuristic,
// not a claim to have reasoned about the specific turn.
const EVIDENCE_DEPENDENT_INTENTS = new Set(['inform.explain', 'create.transform', 'decide.support', 'act.perform']);

/**
 * A turn ReasonIQ judged not to need the reasoning model — "shallow"
 * means "no model call," not "no judgment." It still reads the signals
 * already on hand (IntentIQ's own status, and whether an evidence-
 * dependent intent got any) to report honest uncertainty and information
 * gaps, rather than flattening every such turn to the same unearned 0.5
 * confidence regardless of what's actually known about it. This is
 * exactly the kind of cheap, pre-LLM judgment §6 asks ReasonIQ to make —
 * it just didn't use to make much of one.
 */
function shallowResult(input) {
  const text = String(input.text || '').trim();
  if (!text) {
    return baseResult({
      interpretation: 'No interpretable user input was supplied.',
      reasoningDepth: 'shallow',
      uncertainties: ['no input text was supplied'],
      sufficientForConclusion: false,
      confidence: 0,
    });
  }

  const intent = input.intentDecision && input.intentDecision.intent;
  const status = input.intentDecision && input.intentDecision.status;

  const uncertainties = [];
  const informationGaps = [];
  let confidence = 0.5;
  let sufficientForConclusion = true;

  if (!input.intentDecision || status === 'unknown') {
    uncertainties.push('what the user is trying to achieve for this turn is unclear');
    confidence = 0.25;
    sufficientForConclusion = false;
  } else if (status === 'ambiguous') {
    uncertainties.push('multiple interpretations of this turn are plausible and were not resolved');
    confidence = Math.min(confidence, 0.3);
    sufficientForConclusion = false;
  }

  if (intent && EVIDENCE_DEPENDENT_INTENTS.has(intent)) {
    informationGaps.push('no supporting evidence was supplied for this turn');
    confidence = Math.min(confidence, 0.45);
    sufficientForConclusion = false;
  }

  return baseResult({
    interpretation: `The user said: ${text}`,
    reasoningDepth: 'shallow',
    uncertainties,
    informationGaps,
    sufficientForConclusion,
    confidence,
  });
}

/** The reasoning model was warranted but unavailable or produced unusable output — never silently substitute a guess. */
function degradedResult(reason, modelConfigured) {
  return baseResult({
    interpretation: 'Reasoning could not be completed for this turn.',
    reasoningDepth: 'deep',
    informationGaps: ['the reasoning model could not be reached or returned an unusable result'],
    sufficientForConclusion: false,
    confidence: 0,
    meta: { reasonerVersion: REASONER_VERSION, reasoningModelConfigured: modelConfigured, fallbackReason: reason },
  });
}

// --- public API ------------------------------------------------------------

/**
 * @typedef {Object} ReasonIQInput
 * @property {string} text - the current user input
 * @property {object|null} [intentDecision] - IntentIQ's IntentDecision for this turn (logos/intentIQ.js) — consumed, never re-derived
 * @property {Array<{role: string, content: string}>} [conversationContext] - recent turns, for continuity only
 * @property {Array<{content: string, source?: string}>} [evidence] - explicitly supplied evidence; never auto-loaded from memory or elsewhere
 * @property {string} [correlationId]
 * @property {string} [contextId]
 */

/**
 * Evaluates one turn and returns a ReasoningResult. Never throws — a
 * reasoning-model failure or malformed output degrades to an honest
 * `degradedResult`, exactly like intentIQ.js never lets its own failure
 * modes take down a turn.
 *
 * @param {ReasonIQInput} input
 * @param {{ reasoningModel?: { chat: Function, isConfigured?: Function }, silent?: boolean, logger?: Function }} [options]
 * @returns {Promise<import('./reasonModels').ReasoningResult>}
 */
async function evaluate(input, options = {}) {
  const correlationId = input.correlationId || crypto.randomUUID();
  const model = options.reasoningModel || createReasoningModelClient(resolveReasoningModelConfig({ store: createReasoningModelStore() }));
  const modelConfigured = typeof model.isConfigured === 'function' ? model.isConfigured() : true;

  const depth = decideReasoningDepth(input);

  let result;
  if (depth === 'shallow') {
    result = shallowResult(input);
  } else {
    const messages = buildReasoningPrompt(input);
    try {
      const raw = await model.chat(messages);
      const validated = parseAndValidateReasoningOutput(raw);
      result = {
        schemaVersion: SCHEMA_VERSION,
        reasoningDepth: 'deep',
        ...validated,
        meta: { reasonerVersion: REASONER_VERSION, reasoningModelConfigured: modelConfigured, fallbackReason: null },
      };
    } catch (err) {
      const reason = err instanceof MalformedReasoningOutputError ? 'malformed_model_output' : 'reasoning_model_unavailable';
      result = degradedResult(reason, modelConfigured);
    }
  }

  if (!options.silent) {
    logReasoningResult(
      { result, input: input.text, contextId: input.contextId, correlationId },
      options.logger
    );
  }

  return result;
}

module.exports = { evaluate, decideReasoningDepth, SCHEMA_VERSION };
