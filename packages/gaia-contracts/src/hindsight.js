/**
 * Hindsight contract — long-term memory. Storage-abstract by design.
 *
 * Gaia depends on capabilities and contracts, NEVER on persistence internals.
 * Memory is reflection and pattern formation, not raw logging.
 *
 * HindsightProvider (gaia/integration/memory/HindsightProvider.js) implements
 * storeReflection, retrieveRelevantContext, listProvenance, editMemory, and
 * forget against a real Hindsight instance, plus formPattern/queryPatterns
 * and the hypothesis lifecycle (architecture.md §6.1) against Gaia's own
 * cognition service (services/cognition) — Hindsight itself has no place to
 * put either, so that content lives in a Hindsight-adjacent store instead.
 *
 * @typedef {'preferences'|'patterns'|'context'|'relationships'} MemoryDomain
 *
 * @typedef {Object} Reflection
 * @property {string} id
 * @property {MemoryDomain} domain
 * @property {string} summary          // what Gaia came to understand
 * @property {Provenance} provenance   // where it came from (always retained)
 * @property {number} confidence       // 0..1
 * @property {string} created_at
 *
 * @typedef {Object} Provenance
 * @property {string} source_message_id
 * @property {string} conversation_id
 * @property {string} observed_at
 *
 * @typedef {Object} Pattern
 * @property {string} id
 * @property {string} content            // the recurring pattern Gaia noticed
 * @property {number} confidence         // 0..1
 * @property {number} coherence_score
 * @property {string[]} source_memory_ids // Hindsight memory ids this pattern was formed from
 * @property {string} created_at
 * @property {string} updated_at
 *
 * @typedef {'proposed'|'testing'|'confirmed'|'rejected'} HypothesisStatus
 *
 * @typedef {Object} Hypothesis
 * @property {string} id
 * @property {string} statement
 * @property {number} confidence          // 0..1 — a degree, never treated as settled
 * @property {HypothesisStatus} status
 * @property {string} verification_plan   // what would raise/lower confidence
 * @property {string[]} evidence_memory_ids
 * @property {string|null} confirmed_document_id // set once confirmed; the Hindsight document it was retained as
 * @property {string|null} rejection_reason
 * @property {string} created_at
 * @property {string} updated_at
 *
 * Capabilities:
 *   storeReflection(Reflection)
 *   retrieveRelevantContext(query) -> Reflection[]
 *   listProvenance(reflectionId) -> Provenance
 *   editMemory(id, patch)
 *   forget(id)                            // honored fully and immediately
 *   formPattern(pattern) -> Pattern
 *   queryPatterns() -> Pattern[]
 *   proposeHypothesis(hypothesis) -> Hypothesis          // status starts 'proposed'
 *   listHypotheses(status?) -> Hypothesis[]
 *   updateHypothesis(id, patch) -> Hypothesis            // from 'testing', resets to 'proposed' (refine)
 *   testHypothesis(id) -> Hypothesis                     // 'proposed' -> 'testing'
 *   confirmHypothesis(id) -> Hypothesis                  // -> 'confirmed'; retains into Hindsight
 *   rejectHypothesis(id, reason) -> Hypothesis            // -> 'rejected'
 */
export const MEMORY_DOMAINS = Object.freeze(['preferences', 'patterns', 'context', 'relationships']);
export const HYPOTHESIS_STATUSES = Object.freeze(['proposed', 'testing', 'confirmed', 'rejected']);
export const HINDSIGHT_CAPABILITIES = Object.freeze([
  'storeReflection', 'retrieveRelevantContext', 'listProvenance', 'editMemory', 'forget',
  'formPattern', 'queryPatterns',
  'proposeHypothesis', 'listHypotheses', 'updateHypothesis',
  'testHypothesis', 'confirmHypothesis', 'rejectHypothesis',
]);
