/**
 * schema.js — the IntentDecision contract and its validation.
 *
 * intentIQ speaks JSON to a reasoning provider and gets JSON back. That
 * output is untrusted until it passes this schema — malformed, incomplete,
 * or out-of-range output must never reach Gaia's decision pipeline
 * (coding-standards.md §6: contracts are explicit and typed; §7: boundary
 * tests are mandatory). No provider or model identifier is part of this
 * contract, and none may ever be added to it (principles.md — Invisible
 * Implementation; architecture.md §12 — No provider leakage).
 */
import { z } from 'zod';
import { INTENT_IDS, CAPABILITIES, SOURCES_OF_TRUTH, REASONING_PROFILES } from './registry';

const IntentEnum = z.enum(INTENT_IDS);
const StatusEnum = z.enum(['accepted', 'ambiguous', 'unknown', 'unsafe_to_route']);
const CapabilityEnum = z.enum(CAPABILITIES);
const SourceOfTruthEnum = z.enum(SOURCES_OF_TRUTH);
const ReasoningProfileEnum = z.enum(REASONING_PROFILES);

const CandidateSchema = z.object({
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
});

const EntitySchema = z.object({
  type: z.string().min(1),
  value: z.string().min(1),
});

export const IntentDecisionSchema = z.object({
  intent: IntentEnum.nullable(),
  intentFamily: z.string().min(1),
  status: StatusEnum,
  confidence: z.number().min(0).max(1),
  candidates: z.array(CandidateSchema).default([]),
  entities: z.array(EntitySchema).default([]),
  sourceOfTruth: SourceOfTruthEnum,
  capability: CapabilityEnum,
  reasoningProfile: ReasoningProfileEnum.nullable(),
  needsClarification: z.boolean(),
});

/**
 * A schema-valid, honest "I don't know" decision. Used whenever intentIQ
 * cannot produce a trustworthy decision — provider failure, malformed JSON,
 * or a schema violation — so a bad classification never masquerades as a
 * confident one, and a failure never breaks the surrounding conversation
 * (architecture.md §10 — failure is invisible/graceful, never fatal).
 * @returns {import('zod').infer<typeof IntentDecisionSchema>}
 */
export function fallbackDecision() {
  return {
    intent: 'unknown',
    intentFamily: 'unknown',
    status: 'unknown',
    confidence: 0,
    candidates: [],
    entities: [],
    sourceOfTruth: 'unknown',
    capability: 'none',
    reasoningProfile: null,
    needsClarification: false,
  };
}

/**
 * Validates a raw (parsed-JSON) object against the IntentDecision contract.
 * @param {unknown} raw
 * @returns {{ ok: true, decision: import('zod').infer<typeof IntentDecisionSchema> } | { ok: false, issues: string[] }}
 */
export function validateIntentDecision(raw) {
  const result = IntentDecisionSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, issues: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  return { ok: true, decision: result.data };
}
