/**
 * schema.js — the ReasoningResult contract and its validation.
 *
 * reasonIQ speaks JSON to a reasoning provider and gets JSON back, exactly
 * like intentIQ. That output is untrusted until it passes this schema —
 * malformed, incomplete, or out-of-range output must never reach Gaia's
 * decision pipeline (coding-standards.md §6-7). No provider or model
 * identifier is part of this contract, and none may ever be added to it
 * (principles.md — Invisible Implementation; architecture.md §12).
 *
 * Vocabulary is deliberately reused rather than reinvented: `capability`
 * and `reasoningProfile` share their enums with intentIQ's registry, and
 * hypothesis `status` shares HYPOTHESIS_STATUSES with the Hindsight
 * contract (architecture.md §6.1) — a hypothesis reasonIQ proposes or
 * re-evaluates here is shaped exactly like the one Hindsight would
 * eventually persist, so wiring them together later is a plumbing change,
 * not a redesign.
 */
import { z } from 'zod';
import { CAPABILITIES, REASONING_PROFILES, SOURCES_OF_TRUTH } from '../intentIQ/registry';
import { HYPOTHESIS_STATUSES } from '../../../contracts/hindsight';

const CapabilityEnum = z.enum(CAPABILITIES);
const ReasoningProfileEnum = z.enum(REASONING_PROFILES);
const SourceOfTruthEnum = z.enum(SOURCES_OF_TRUTH);
const HypothesisStatusEnum = z.enum(HYPOTHESIS_STATUSES);

// Evidence carries exactly one of three epistemic kinds. "Uncertainty" and
// "recommendation" — the other two categories the brief names — are not
// evidence kinds; they are their own top-level fields (uncertainties,
// recommendedNextSteps) because they aren't things reasonIQ asserts, they're
// gaps it flags or actions it suggests.
const EvidenceKindEnum = z.enum(['fact', 'inference', 'hypothesis']);

const EvidenceItemSchema = z.object({
  kind: EvidenceKindEnum,
  statement: z.string().min(1),
  // Source First (principles.md): every piece of evidence must be
  // traceable to one of Gaia's recognized sources of truth. There is no
  // "model knowledge" source — reasonIQ's own background knowledge is not
  // a legitimate evidence source; if it's used at all, it belongs in
  // reasoning (conclusions/inferences), never asserted as sourced fact.
  source: SourceOfTruthEnum,
  confidence: z.number().min(0).max(1),
});

const ConclusionSchema = z.object({
  statement: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// A hypothesis entry doubles as "propose new" (status defaults to
// 'proposed') and "evaluate existing" (caller supplies an existing
// hypothesis as context; reasonIQ echoes it back with a revised confidence
// and/or status). reasonIQ never writes this anywhere — see reasonIQ.js.
const HypothesisEntrySchema = z.object({
  statement: z.string().min(1),
  confidence: z.number().min(0).max(1),
  status: HypothesisStatusEnum,
  verificationPlan: z.string().nullable(),
});

const CapabilityImplicationSchema = z.object({
  suggested: CapabilityEnum,
  reason: z.string().nullable(),
});

export const ReasoningResultSchema = z.object({
  // What reasonIQ understood the turn to mean, given the IntentDecision and
  // available evidence — not the user-facing answer.
  interpretation: z.string().min(1),
  evidence: z.array(EvidenceItemSchema).default([]),
  // Things reasonIQ explicitly could not resolve — distinct from evidence,
  // never silently dropped or guessed past.
  uncertainties: z.array(z.string().min(1)).default([]),
  // Plain-language descriptions of conflicting evidence. reasonIQ must
  // represent a conflict, never silently resolve it by picking a side.
  contradictions: z.array(z.string().min(1)).default([]),
  missingInformation: z.array(z.string().min(1)).default([]),
  conclusions: z.array(ConclusionSchema).default([]),
  hypotheses: z.array(HypothesisEntrySchema).default([]),
  capabilityImplication: CapabilityImplicationSchema,
  recommendedNextSteps: z.array(z.string().min(1)).default([]),
  reasoningProfile: ReasoningProfileEnum.nullable(),
  clarificationRecommended: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

/**
 * A schema-valid, honest "reasoning did not happen" result. Used whenever
 * reasonIQ cannot produce a trustworthy result — provider failure,
 * malformed JSON, or a schema violation — so a broken reasoning pass never
 * masquerades as a confident one, and never breaks the surrounding
 * conversation (architecture.md §10 — failure is invisible/graceful).
 * Preserves uncertainty rather than inventing certainty (per this
 * implementation's failure-behavior requirement and soul.md — "she never
 * pretends certainty").
 * @returns {import('zod').infer<typeof ReasoningResultSchema>}
 */
export function fallbackReasoningResult() {
  return {
    interpretation: 'Reasoning could not be completed for this turn.',
    evidence: [],
    uncertainties: ['Reasoning was unavailable for this turn.'],
    contradictions: [],
    missingInformation: [],
    conclusions: [],
    hypotheses: [],
    capabilityImplication: { suggested: 'none', reason: null },
    recommendedNextSteps: [],
    reasoningProfile: null,
    clarificationRecommended: false,
    clarificationQuestion: null,
    confidence: 0,
  };
}

/**
 * Validates a raw (parsed-JSON) object against the ReasoningResult contract.
 * @param {unknown} raw
 * @returns {{ ok: true, result: import('zod').infer<typeof ReasoningResultSchema> } | { ok: false, issues: string[] }}
 */
export function validateReasoningResult(raw) {
  const result = ReasoningResultSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, issues: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  return { ok: true, result: result.data };
}
