/**
 * Reasoning contract — the abstraction Gaia depends on for thought.
 *
 * Gaia Desktop never talks to a provider or a model directly. It depends on
 * a ReasoningProvider, which can be backed by Hermes today and by something
 * else tomorrow, without Gaia changing.
 *
 * The provider speaks in plain reasoning terms: a list of messages goes in,
 * a stream of text deltas comes out. Presence, persona and error phrasing
 * are Gaia's concerns and are applied at the desktop, not the provider.
 *
 * @typedef {'system'|'user'|'assistant'} ReasoningRole
 *
 * @typedef {Object} ReasoningMessage
 * @property {ReasoningRole} role
 * @property {string}        content
 *
 * @typedef {Object} ReasoningHealth
 * @property {boolean} ok
 * @property {string}  [detail]   // Gaia-language phrasing; never technical
 *
 * @typedef {Object} ReasoningDelta
 * @property {'delta'} type
 * @property {string}  content
 *
 * Capabilities a ReasoningProvider must offer:
 *   health()                                    -> ReasoningHealth
 *   stream(messages, { signal, onDelta })       -> Promise<string>   // full text
 *   chat(messages, { signal })                  -> Promise<string>   // non-streaming
 */
export const REASONING_CAPABILITIES = Object.freeze(['health', 'stream', 'chat']);
