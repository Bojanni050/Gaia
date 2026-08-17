'use strict';

/**
 * Turn handling — the server side of the desktop's `conversation/turn`
 * contract (desktop/src/state/contract.js).
 *
 * The client sends plain messages; this service owns everything cognitive
 * the client must not: identity (SOUL as the system prompt) and reasoning
 * orchestration (Hermes). The reply returned is plain text — no model
 * names, no provider details, no chain-of-thought ever cross this seam.
 */

const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);

/**
 * Validates the incoming message history. Returns null when valid, or a
 * human-readable problem string (surfaced as a 400 to the client).
 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array';
  }
  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      return 'each message must be an object';
    }
    if (!ALLOWED_ROLES.has(message.role)) {
      return `invalid message role: ${String(message.role)}`;
    }
    if (typeof message.content !== 'string' || message.content.trim() === '') {
      return 'each message must have non-empty string content';
    }
  }
  return null;
}

/**
 * Assembles the message list sent to Hermes: the SOUL system prompt first,
 * then the client's history verbatim (role + content only — any client-side
 * fields are already stripped by the desktop contract and dropped again
 * here, so nothing local ever reaches the reasoning path).
 */
function assembleMessages(systemPrompt, messages) {
  return [
    { role: 'system', content: systemPrompt },
    ...messages.map(({ role, content }) => ({ role, content })),
  ];
}

/**
 * Performs one conversational turn.
 *
 * @param {{ messages: Array<{role: string, content: string}>, systemPrompt: string, hermes: { chat: (messages: Array) => Promise<string> } }} input
 * @returns {Promise<{status: number, body: object}>} an HTTP-shaped result
 */
async function performTurn({ messages, systemPrompt, hermes }) {
  const problem = validateMessages(messages);
  if (problem) {
    return { status: 400, body: { error: problem } };
  }

  let reply;
  try {
    reply = await hermes.chat(assembleMessages(systemPrompt, messages));
  } catch (_) {
    // Calm and generic on purpose: transport details, provider names and
    // status codes never reach the client.
    return { status: 502, body: { error: 'gaia could not answer right now' } };
  }

  if (typeof reply !== 'string' || reply.length === 0) {
    return { status: 502, body: { error: 'gaia could not answer right now' } };
  }
  return { status: 200, body: { reply } };
}

module.exports = { validateMessages, assembleMessages, performTurn };
