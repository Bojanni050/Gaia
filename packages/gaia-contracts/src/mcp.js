/**
 * MCP contract — actions / capabilities layer.
 *
 * Actions always require explicit intent + permission. Operational complexity
 * (tool chains, orchestration) is hidden from the user; only intent is surfaced.
 * In this pass, actions surface to the UI as tool cards streamed by Hermes.
 *
 * @typedef {Object} ToolInvocation
 * @property {string} id
 * @property {string} name
 * @property {Object} args
 * @property {'running'|'done'|'error'} status
 * @property {*} [result]
 *
 * @typedef {Object} ActionIntent
 * @property {string} name
 * @property {string} description   // plain-language intent shown to the user
 * @property {boolean} requires_permission
 *
 * Capabilities (contract):
 *   describeIntent(name) -> ActionIntent
 *   requestPermission(intent) -> boolean
 *   invoke(name, args) -> ToolInvocation
 */
export const MCP_CAPABILITIES = Object.freeze(['describeIntent', 'requestPermission', 'invoke']);
