'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatReply, createStreamEmitter, toCalmError, CALM_FALLBACK } = require('../src/responseEngine');

function fakeRes() {
  return {
    statusCode: null,
    headers: null,
    written: [],
    ended: false,
    jsonBody: null,
    writeHead(code, headers) { this.statusCode = code; this.headers = headers; },
    write(chunk) { this.written.push(chunk); },
    end() { this.ended = true; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.jsonBody = body; },
  };
}

// --- formatReply (non-streaming boundary) ---------------------------------

test('formatReply turns a capability-produced string into the reply shape', () => {
  const result = formatReply('hello from Gaia');
  assert.deepEqual(result, { status: 200, body: { reply: 'hello from Gaia' } });
});

test('formatReply maps a missing/empty capability result to a calm 502, never the raw failure', () => {
  assert.deepEqual(formatReply(null), { status: 502, body: { error: CALM_FALLBACK } });
  assert.deepEqual(formatReply(undefined), { status: 502, body: { error: CALM_FALLBACK } });
  assert.deepEqual(formatReply(''), { status: 502, body: { error: CALM_FALLBACK } });
});

test('toCalmError never echoes the underlying error, no matter what it contains', () => {
  const leaky = new Error('hermes responded 401 at http://internal:8642 (model gpt-mystery)');
  const message = toCalmError(leaky);
  assert.equal(message, CALM_FALLBACK);
  assert.ok(!message.includes('hermes'));
  assert.ok(!message.includes('8642'));
  assert.ok(!message.includes('gpt-mystery'));
});

// --- createStreamEmitter (streaming boundary) -----------------------------

test('a capability-agnostic emitter: any source calling delta() produces the identical wire frame', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  // Simulates two different "capabilities" both just calling delta() —
  // the emitter has no idea which one it is, and the frame is identical.
  emitter.delta('from capability A', {});
  emitter.delta('from capability B', { reasoning: false });
  assert.equal(res.written[0], `data: ${JSON.stringify({ choices: [{ delta: { content: 'from capability A' } }] })}\n\n`);
  assert.equal(res.written[1], `data: ${JSON.stringify({ choices: [{ delta: { content: 'from capability B' } }] })}\n\n`);
});

test('reasoning deltas use a distinct frame shape but the same wire contract', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  emitter.delta('thinking...', { reasoning: true });
  assert.equal(res.written[0], `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'thinking...' } }] })}\n\n`);
});

test('headers are sent lazily, only on the first delta', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  assert.equal(res.headers, null);
  emitter.delta('hi', {});
  assert.equal(res.headers['Content-Type'], 'text/event-stream');
});

test('finish() writes [DONE] and ends the response', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  emitter.delta('hi', {});
  emitter.finish();
  assert.equal(res.written.at(-1), 'data: [DONE]\n\n');
  assert.equal(res.ended, true);
});

test('fail() before any delta returns a clean calm JSON error, not a half-open stream', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  emitter.fail(new Error('provider exploded, token xyz'));
  assert.equal(res.statusCode, 502);
  assert.equal(res.jsonBody.error, CALM_FALLBACK);
  assert.equal(res.headers, null); // never switched into SSE mode
});

test('fail() after a delta ends the stream calmly, without a fabricated error frame', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  emitter.delta('partial', {});
  emitter.fail(new Error('connection dropped'));
  assert.equal(res.ended, true);
  assert.ok(!res.written.includes('data: [DONE]\n\n')); // never claims a clean completion
});

test('an empty delta is a no-op and never opens the stream prematurely', () => {
  const res = fakeRes();
  const emitter = createStreamEmitter(res);
  emitter.delta('', {});
  emitter.delta(null, {});
  assert.equal(res.headers, null);
  assert.equal(res.written.length, 0);
});
