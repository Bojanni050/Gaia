'use strict';

/**
 * Turn handling — the server side of the desktop's `conversation/turn`
 * contract (desktop/src/state/contract.js).
 *
 * The client sends plain messages; this service owns everything cognitive
 * the client must not: identity (SOUL as the system prompt) and reasoning
 * orchestration (Hermes). The reply returned is plain text — no model
 * names, no provider details, no chain-of-thought ever cross this seam.
 *
 * performTurn (below) is Desktop's exact, unchanged contract — non-
 * streaming, always the full SOUL, no memory. performStreamingTurn is
 * additive, built for docs/web-migration-plan.md's Phase B (a faithful
 * parity port of Web's client-side turn lifecycle: context-aware document
 * selection, policy-gated recall/reflection, streaming) — it does not
 * modify performTurn/assembleMessages or anything Desktop depends on.
 */

const { buildSystemPrompt } = require('./foundation');
const { recallRelevantContext, renderMemoryContext, reflectOnTurn } = require('./memory');
const { classify: classifyIntent } = require('./logos/intentIQ');

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

function latestUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content || '';
  }
  return '';
}

/**
 * Writes one OpenAI-compatible SSE delta frame — the exact shape
 * gaia-web's HermesProvider._readSse already parses, so a future client
 * cutover changes only the URL it streams from, not the parser.
 */
function writeSseDelta(res, delta) {
  res.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);
}

/**
 * Performs one conversational turn, streamed — the Phase B parity path.
 * Recall happens first (best-effort, policy-gated, never throws); the
 * system prompt is context-aware (foundation.js's buildSystemPrompt,
 * ported from Web's deriveIntent+FoundationSelector) rather than always
 * the full SOUL. SSE headers are sent lazily, on the first delta only —
 * if Hermes fails before producing any content, the caller still gets a
 * normal JSON error response instead of a half-open stream.
 *
 * @param {{
 *   messages: Array<{role: string, content: string}>,
 *   documents: Record<string, string>,
 *   hermes: { stream: Function },
 *   hindsight: { recall: Function, reflect: Function },
 *   res: import('express').Response,
 *   conversationId?: string,
 *   intentIQ?: (messages: Array, options: object) => object,
 * }} input
 */
async function performStreamingTurn({ messages, documents, hermes, hindsight, res, conversationId, intentIQ = classifyIntent }) {
  const problem = validateMessages(messages);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }

  // Logos: IntentIQ observes the turn and produces an IntentDecision.
  // Dev-logged for inspection only (see logos/intentLog.js) — it does not
  // yet drive document selection, recall, or capability routing, matching
  // the same "seam only, no behavior change" posture Logos's earlier
  // client-side intentIQ/reasonIQ were introduced with (evolution.md,
  // Milestone 7b). Never allowed to throw into the turn path.
  try {
    intentIQ(messages, { contextId: conversationId });
  } catch (_) {
    // Observability must never take down a real conversational turn.
  }

  const systemPrompt = buildSystemPrompt(documents, messages);
  const userText = latestUserText(messages);
  const reflections = await recallRelevantContext(hindsight, userText);
  const memoryBlock = renderMemoryContext(reflections);

  const systemMessages = [{ role: 'system', content: systemPrompt }];
  if (memoryBlock) systemMessages.push({ role: 'system', content: memoryBlock });
  const assembled = [...systemMessages, ...messages.map(({ role, content }) => ({ role, content }))];

  let headersSent = false;

  const onDelta = (chunk, isReasoning) => {
    if (!headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      headersSent = true;
    }
    writeSseDelta(res, isReasoning ? { reasoning_content: chunk } : { content: chunk });
  };

  let fullText;
  try {
    fullText = await hermes.stream(assembled, { onDelta });
  } catch (_) {
    // Calm and generic, same discipline as performTurn — but by this
    // point headers may already be on the wire, so "calm" means "end the
    // stream" rather than "return a clean error body" once that's true.
    if (!headersSent) {
      res.status(502).json({ error: 'gaia could not answer right now' });
    } else {
      res.end();
    }
    return;
  }

  res.write('data: [DONE]\n\n');
  res.end();

  reflectOnTurn(hindsight, { conversationId, userText, assistantText: fullText });
}

module.exports = { validateMessages, assembleMessages, performTurn, performStreamingTurn };
