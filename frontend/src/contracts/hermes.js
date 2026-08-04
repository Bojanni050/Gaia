/**
 * Hermes contract — the single reasoning surface Gaia Desktop talks to.
 * Gaia Desktop depends on THIS contract, never on a provider or a model.
 * The provider that answers underneath is invisible here by design.
 *
 * @typedef {Object} HermesStreamEvent
 * @property {'start'|'presence'|'delta'|'tool'|'done'|'error'} type
 * @property {string} [message_id]
 * @property {'resting'|'listening'|'thinking'|'speaking'} [state]
 * @property {string} [content]        // token delta (type='delta')
 * @property {string} [id]             // tool call id (type='tool')
 * @property {string} [name]           // tool name (type='tool')
 * @property {'running'|'done'} [status]
 * @property {Object} [args]
 * @property {*} [result]
 * @property {string} [message]        // error text
 *
 * @typedef {Object} HermesStreamRequest
 * @property {string|null} [content]
 * @property {string[]} [attachment_ids]
 * @property {string|null} [truncate_from_message_id]
 * @property {boolean} [resend_last_user]
 *
 * The client capability Gaia Desktop relies on:
 *   createConversation() -> Conversation
 *   listConversations() -> Conversation[]
 *   getConversation(id) -> { conversation, messages }
 *   deleteConversation(id) -> void
 *   stream(conversationId, HermesStreamRequest, onEvent, signal) -> Promise<void>
 */
export const HERMES_CAPABILITIES = Object.freeze([
  'createConversation',
  'listConversations',
  'getConversation',
  'deleteConversation',
  'stream',
]);
