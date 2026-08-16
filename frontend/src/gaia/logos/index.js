/**
 * Logos — Gaia's cognitive reasoning layer (architecture.md §4.2).
 *
 * Public entry point. Callers outside this directory reach intentIQ only
 * through this module, never through its internal files directly.
 *
 * reasonIQ (what does this mean, and what follows?) is not implemented yet
 * — this milestone establishes the intentIQ seam only. Do not add a
 * reasonIQ stub here; a real second faculty belongs in its own change.
 */
export { interpretIntent } from './intentIQ/intentIQ';
export { INTENT_REGISTRY, INTENT_IDS, INTENT_FAMILIES } from './intentIQ/registry';
export { IntentDecisionSchema, fallbackDecision, validateIntentDecision } from './intentIQ/schema';
