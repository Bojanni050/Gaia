'use strict';

/**
 * Gaia's Response Engine — the single seam between a capability result (or
 * a direct Gaia decision) and what actually reaches the client.
 *
 * architecture.md's cognitive loop puts GAIA INTEGRATION and RESPONSE
 * ENGINE between a capability's RESULT and the user. This module is that
 * seam, made explicit in code: capabilities (Hermes today; Melodiq,
 * SongCompanion, MCP results tomorrow) never write to the HTTP response
 * themselves. They hand this module plain text deltas or a final string;
 * this module owns the wire format, the completion/failure lifecycle, and
 * the one rule that must never be violated anywhere in this codebase — no
 * provider name, model name, transport detail, or stack trace ever
 * reaches a client. `toCalmError` is the only place that mapping happens,
 * so turn.js's orchestration code never has to remember it.
 *
 * This module does not reason. It does not decide whether a capability
 * was needed, and it does not touch capability internals (Hermes's own
 * stream framing, retries, provider routing). It only expresses: given a
 * result, produce the response — a direct Gaia answer and a
 * capability-produced answer converge here into the same shape.
 */

const CALM_FALLBACK = 'gaia could not answer right now';

/**
 * Maps any capability failure to Gaia's own calm, generic language. Never
 * forwards the underlying error message, stack, or capability name —
 * that's exactly how transport/provider details would leak to a client.
 */
function toCalmError() {
  return CALM_FALLBACK;
}

/**
 * Turns a capability's final text into the non-streaming HTTP-shaped
 * result. `text` is expected to be a plain string on success; anything
 * else (missing, empty, or the caller already caught a capability error)
 * becomes a calm 502 — the same outcome whether the capability threw or
 * simply returned nothing usable.
 * @param {string|null|undefined} text
 * @returns {{status: number, body: object}}
 */
function formatReply(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { status: 502, body: { error: toCalmError() } };
  }
  return { status: 200, body: { reply: text } };
}

/**
 * Creates a streaming emitter bound to one HTTP response. A capability
 * (or Gaia orchestrating one) calls delta()/finish()/fail() — never
 * res.write()/res.end() directly — so the SSE wire shape and the
 * completion/failure lifecycle live in exactly one place.
 *
 * Headers are sent lazily, on the first delta: if the capability fails
 * before producing any content, the caller still gets a clean JSON error
 * instead of a half-open stream.
 * @param {import('express').Response} res
 */
function createStreamEmitter(res) {
  let headersSent = false;

  function ensureHeaders() {
    if (headersSent) return;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    headersSent = true;
  }

  /**
   * Emits one piece of Gaia's reply. `reasoning: true` marks a
   * reasoning-trace delta rather than user-facing content — still routed
   * through this one wire shape, never a capability-specific one.
   * @param {string} content
   * @param {{ reasoning?: boolean }} [options]
   */
  function delta(content, { reasoning = false } = {}) {
    if (!content) return;
    ensureHeaders();
    const frame = reasoning ? { reasoning_content: content } : { content };
    res.write(`data: ${JSON.stringify({ choices: [{ delta: frame }] })}\n\n`);
  }

  /** Finalizes a successful stream. */
  function finish() {
    ensureHeaders();
    res.write('data: [DONE]\n\n');
    res.end();
  }

  /**
   * Finalizes a failed stream, calmly. Before any content shipped, this is
   * a normal JSON error response. After content is already on the wire,
   * there is no calm way to inject an "error" frame a client would need
   * capability-specific logic to render — so the stream simply ends.
   */
  function fail() {
    if (!headersSent) {
      res.status(502).json({ error: toCalmError() });
    } else {
      res.end();
    }
  }

  return { delta, finish, fail };
}

module.exports = { formatReply, createStreamEmitter, toCalmError, CALM_FALLBACK };
