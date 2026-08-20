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
 *
 * performTurn's own contract is extended additively, the same way: an
 * optional `attachments` param (already-resolved library files — see
 * library.js's resolveAttachmentsForPrompt, called by server.js before
 * performTurn is reached) folds into the system prompt only when present.
 * A call that omits it produces byte-identical output to before — nothing
 * about assembleMessages itself changes, and no shape Desktop already
 * depends on is touched.
 *
 * Chat history (conversationStore.js) is saved as a fire-and-forget side
 * effect after a turn succeeds — deliberately NOT inside performTurn
 * itself (that stays the minimal, unchanged reply-producing function;
 * server.js's route handler does the save for the non-streaming path,
 * right after calling performTurn). performStreamingTurn already has this
 * shape for reflectOnTurn, so its own history save lives inline here,
 * alongside it, gated the same optional-param way as hindsight/intentIQ/
 * reasonIQ — omitting `historyStore` skips saving entirely, no behavior
 * change for a caller that doesn't pass one.
 */

const { buildSystemPrompt } = require('./foundation');
const { recallRelevantContext, renderMemoryContext, reflectOnTurn, fetchMentalModelContext, renderMentalModelContext } = require('./memory');
const { classify: classifyIntent } = require('./logos/intentIQ');
const { evaluate: evaluateReasoning } = require('./logos/reasonIQ');

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
 * Renders resolved attachments into a system-message block, in the same
 * calm, "use only what applies" register as memory.js's
 * renderMemoryContext — a file being attached is not an instruction to
 * force it into the reply.
 * @param {Array<{ filename: string, content: string|null }>} attachments
 * @returns {string|null}
 */
function renderAttachmentContext(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const blocks = attachments.map(({ filename, content }) =>
    content
      ? `--- ${filename} ---\n${content}`
      : `--- ${filename} ---\n(this file's content could not be read as text and is not included here)`
  );
  return [
    "The user has attached the following file(s) from their library as context for this turn.",
    'Use them only where genuinely relevant; do not force them in, and do not announce that you are reading an attachment.',
    '',
    ...blocks,
  ].join('\n');
}

/**
 * Performs one conversational turn.
 *
 * @param {{
 *   messages: Array<{role: string, content: string}>,
 *   systemPrompt: string,
 *   hermes: { chat: (messages: Array) => Promise<string> },
 *   attachments?: Array<{ filename: string, content: string|null }>,
 * }} input
 * @returns {Promise<{status: number, body: object}>} an HTTP-shaped result
 */
async function performTurn({ messages, systemPrompt, hermes, attachments }) {
  const problem = validateMessages(messages);
  if (problem) {
    return { status: 400, body: { error: problem } };
  }

  const attachmentBlock = renderAttachmentContext(attachments);
  const fullSystemPrompt = attachmentBlock ? `${systemPrompt}\n\n---\n\n${attachmentBlock}` : systemPrompt;

  let reply;
  try {
    reply = await hermes.chat(assembleMessages(fullSystemPrompt, messages));
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
 *   hindsight: { recall: Function, reflect: Function, getMentalModel: Function },
 *   res: import('express').Response,
 *   conversationId?: string,
 *   intentIQ?: (messages: Array, options: object) => object,
 *   reasonIQ?: (input: object, options: object) => Promise<object>,
 *   historyStore?: { saveConversation: (id: string, messages: Array) => void },
 *   decisionStore?: { append: (record: object) => boolean },
 * }} input
 */
async function performStreamingTurn({ messages, documents, hermes, hindsight, res, conversationId, intentIQ = classifyIntent, reasonIQ = evaluateReasoning, historyStore, decisionStore }) {
  const problem = validateMessages(messages);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }

  const userText = latestUserText(messages);

  // Both console.log (unchanged, for live `docker logs` tailing) and, when
  // a decisionStore is given, a durable JSONL line (decisionStore.js) —
  // console output alone doesn't survive past Docker's own log retention,
  // and "why did Gaia classify this the way it did" is exactly the kind of
  // question that gets asked well after the fact. Store-write failures are
  // swallowed the same way logIntentDecision/logReasoningResult already
  // swallow nothing being wrong with logging itself — append() never
  // throws, but wrapped anyway since this must never affect the turn.
  const decisionLogger = decisionStore
    ? (line) => {
        console.log(line);
        try {
          decisionStore.append(JSON.parse(line));
        } catch (_) {
          // Never let observability persistence affect a real turn.
        }
      }
    : undefined;

  // Logos: IntentIQ observes the turn and produces an IntentDecision.
  // Dev-logged for inspection only (see logos/intentLog.js) — it does not
  // yet drive document selection, recall, or capability routing, matching
  // the same "seam only, no behavior change" posture Logos's earlier
  // client-side intentIQ/reasonIQ were introduced with (evolution.md,
  // Milestone 7b). Never allowed to throw into the turn path.
  let intentDecision = null;
  try {
    intentDecision = intentIQ(messages, { contextId: conversationId, logger: decisionLogger });
  } catch (_) {
    // Observability must never take down a real conversational turn.
  }

  // Logos: ReasonIQ consumes that same IntentDecision — the handoff this
  // seam exists to prove (see logos/index.js's runLogos(), which tests
  // this composition directly). Fire-and-forget, not awaited: unlike
  // IntentIQ's free heuristic, ReasonIQ may call a real, paid reasoning
  // model once one is configured (see the admin surface), and awaiting it
  // here would add real latency to every turn for a result nothing reads
  // yet — the opposite of "no behavior change." Its own reasoningDepth
  // gate (reasonIQ.js) already keeps this cheap when no evidence is
  // supplied, which is always true here — Gaia doesn't hand ReasonIQ any
  // evidence yet, so today's calls mostly resolve shallow or degrade
  // instantly when no reasoning model is configured.
  Promise.resolve()
    .then(() => reasonIQ({ text: userText, intentDecision, conversationContext: messages, evidence: [], contextId: conversationId }, { logger: decisionLogger }))
    .catch(() => {});

  const systemPrompt = buildSystemPrompt(documents, messages);
  const [reflections, mentalModels] = await Promise.all([
    recallRelevantContext(hindsight, userText),
    fetchMentalModelContext(hindsight).catch(() => []),
  ]);
  const memoryBlock = renderMemoryContext(reflections);
  const mentalModelBlock = renderMentalModelContext(mentalModels);

  const systemMessages = [{ role: 'system', content: systemPrompt }];
  if (mentalModelBlock) systemMessages.push({ role: 'system', content: mentalModelBlock });
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

  // Chat history — the raw transcript, never Hindsight's job (see this
  // file's module comment). Never allowed to affect the already-sent
  // response; a missing/invalid conversationId or a storage failure is
  // silently skipped, exactly like reflectOnTurn's own failure mode.
  if (historyStore && conversationId) {
    try {
      historyStore.saveConversation(conversationId, [...messages, { role: 'assistant', content: fullText }]);
    } catch (_) {
      // Never break a turn that already completed successfully.
    }
  }
}

module.exports = { validateMessages, assembleMessages, performTurn, performStreamingTurn, renderAttachmentContext };
