/**
 * Logos — Gaia's cognitive reasoning layer (architecture.md §4.2).
 *
 * Public entry point. Callers outside this directory reach intentIQ and
 * reasonIQ only through this module, never through their internal files
 * directly.
 *
 * Both faculties currently run inside Gaia Desktop, not a separate Gaia
 * Cloud service — this repository has no Gaia Cloud backend to host them
 * in yet (see docs/evolution.md). This is a known, explicitly-flagged
 * interim placement, not a claim that the desktop has become a second
 * Gaia: both modules depend on nothing desktop-specific (no DOM, no React,
 * no client-only state) and speak only through this module's exports, so
 * moving them behind the Gaia API later is a relocation, not a rewrite.
 */
export { interpretIntent } from './intentIQ/intentIQ';
export { INTENT_REGISTRY, INTENT_IDS, INTENT_FAMILIES } from './intentIQ/registry';
export { IntentDecisionSchema, fallbackDecision, validateIntentDecision } from './intentIQ/schema';

export { reasonAboutTurn } from './reasonIQ/reasonIQ';
export { ReasoningResultSchema, fallbackReasoningResult, validateReasoningResult } from './reasonIQ/schema';
