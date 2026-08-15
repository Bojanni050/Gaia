/**
 * Hindsight contract — long-term memory. Storage-abstract by design.
 *
 * Gaia depends on capabilities and contracts, NEVER on persistence internals.
 * Memory is reflection and pattern formation, not raw logging.
 *
 * HindsightProvider (gaia/integration/memory/HindsightProvider.js) implements
 * storeReflection, retrieveRelevantContext, listProvenance, editMemory, and
 * forget against a real Hindsight instance. formPattern and queryPatterns
 * are not yet wired — Hindsight's pattern-equivalent (mental models) is a
 * later milestone.
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
 * Capabilities:
 *   storeReflection(Reflection)
 *   retrieveRelevantContext(query) -> Reflection[]
 *   formPattern(signals) -> Reflection
 *   queryPatterns(domain) -> Reflection[]
 *   listProvenance(reflectionId) -> Provenance
 *   editMemory(id, patch)
 *   forget(id)                          // honored fully and immediately
 */
export const MEMORY_DOMAINS = Object.freeze(['preferences', 'patterns', 'context', 'relationships']);
export const HINDSIGHT_CAPABILITIES = Object.freeze([
  'storeReflection', 'retrieveRelevantContext', 'formPattern',
  'queryPatterns', 'listProvenance', 'editMemory', 'forget',
]);
