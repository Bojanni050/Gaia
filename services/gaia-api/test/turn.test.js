'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMessages, assembleMessages, performTurn, performStreamingTurn } = require('../src/turn');

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

const DOCUMENTS = { 'soul.md': 'SOUL', 'principles.md': 'PRINCIPLES', 'lexicon.md': 'LEXICON' };
const SILENT_HINDSIGHT = { recall: async () => [], reflect: async () => {} };

test('validateMessages accepts a plain user/assistant history', () => {
  assert.equal(
    validateMessages([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]),
    null
  );
});

test('validateMessages rejects empty, non-array, bad role and empty content', () => {
  assert.match(validateMessages([]), /non-empty/);
  assert.match(validateMessages('nope'), /non-empty/);
  assert.match(validateMessages([{ role: 'wizard', content: 'hi' }]), /role/);
  assert.match(validateMessages([{ role: 'user', content: '   ' }]), /non-empty/);
});

test('assembleMessages prepends SOUL exactly once and strips extra fields', () => {
  const messages = assembleMessages('YOU ARE GAIA', [
    { id: 'local-1', role: 'user', content: 'hello', failed: false },
  ]);
  assert.deepEqual(messages, [
    { role: 'system', content: 'YOU ARE GAIA' },
    { role: 'user', content: 'hello' },
  ]);
});

test('performTurn returns the reply on a happy path', async () => {
  const hermes = {
    async chat(messages) {
      assert.deepEqual(messages, [
        { role: 'system', content: 'SOUL' },
        { role: 'user', content: 'hello' },
      ]);
      return 'hi there';
    },
  };
  const result = await performTurn({
    messages: [{ role: 'user', content: 'hello' }],
    systemPrompt: 'SOUL',
    hermes,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.reply, 'hi there');
});

test('performTurn maps validation problems to 400', async () => {
  const result = await performTurn({ messages: [], systemPrompt: 'SOUL', hermes: { chat: async () => 'x' } });
  assert.equal(result.status, 400);
  assert.ok(result.body.error);
});

test('performTurn maps a failing Hermes to a calm 502 without provider details', async () => {
  const hermes = {
    async chat() {
      throw new Error('hermes responded with status 401 at http://internal:8642');
    },
  };
  const result = await performTurn({
    messages: [{ role: 'user', content: 'hello' }],
    systemPrompt: 'SOUL',
    hermes,
  });
  assert.equal(result.status, 502);
  assert.equal(result.body.error, 'gaia could not answer right now');
  assert.ok(!JSON.stringify(result.body).includes('hermes'));
  assert.ok(!JSON.stringify(result.body).includes('8642'));
});

test('performTurn rejects an empty Hermes reply', async () => {
  const result = await performTurn({
    messages: [{ role: 'user', content: 'hello' }],
    systemPrompt: 'SOUL',
    hermes: { chat: async () => '' },
  });
  assert.equal(result.status, 502);
});

// --- performStreamingTurn (docs/web-migration-plan.md Phase B) -------------

test('performStreamingTurn validates before ever touching the response stream', async () => {
  const res = fakeRes();
  await performStreamingTurn({
    messages: [],
    documents: DOCUMENTS,
    hermes: { stream: async () => { throw new Error('must not be called'); } },
    hindsight: SILENT_HINDSIGHT,
    res,
  });
  assert.equal(res.statusCode, 400);
  assert.ok(res.jsonBody.error);
  assert.equal(res.headers, null); // never switched into SSE mode
});

test('performStreamingTurn streams SSE frames matching the OpenAI delta shape, then [DONE]', async () => {
  const res = fakeRes();
  let seenMessages;
  const hermes = {
    stream: async (messages, { onDelta }) => {
      seenMessages = messages;
      onDelta('Hel', false);
      onDelta('lo', false);
      return 'Hello';
    },
  };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'hi there, how is your day' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res,
  });

  assert.equal(res.headers['Content-Type'], 'text/event-stream');
  assert.equal(res.written[0], `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}\n\n`);
  assert.equal(res.written.at(-1), 'data: [DONE]\n\n');
  assert.equal(res.ended, true);

  // Context-aware system prompt, not always-full-SOUL — the parity point
  // of this migration: a plain conversational turn selects the base three.
  assert.equal(seenMessages[0].content, 'SOUL\n\n---\n\nPRINCIPLES\n\n---\n\nLEXICON');
  assert.equal(seenMessages.at(-1).content, 'hi there, how is your day');
});

test('performStreamingTurn sends a normal JSON error if Hermes fails before any delta', async () => {
  const res = fakeRes();
  await performStreamingTurn({
    messages: [{ role: 'user', content: 'hello there friend' }],
    documents: DOCUMENTS,
    hermes: { stream: async () => { throw new Error('hermes responded 401 at http://internal'); } },
    hindsight: SILENT_HINDSIGHT,
    res,
  });
  assert.equal(res.statusCode, 502);
  assert.equal(res.jsonBody.error, 'gaia could not answer right now');
  assert.equal(res.headers, null);
  assert.ok(!JSON.stringify(res.jsonBody).includes('hermes'));
});

test('performStreamingTurn just ends the stream if Hermes fails mid-flight, after headers are sent', async () => {
  const res = fakeRes();
  await performStreamingTurn({
    messages: [{ role: 'user', content: 'hello there friend' }],
    documents: DOCUMENTS,
    hermes: {
      stream: async (messages, { onDelta }) => {
        onDelta('partial', false);
        throw new Error('connection dropped');
      },
    },
    hindsight: SILENT_HINDSIGHT,
    res,
  });
  assert.equal(res.headers['Content-Type'], 'text/event-stream'); // headers were already sent
  assert.equal(res.ended, true);
  assert.ok(!res.written.includes('data: [DONE]\n\n')); // never claims a clean completion
});

test('performStreamingTurn recalls only when the policy fires, and reflects only on a substantive exchange', async () => {
  const recallCalls = [];
  const reflectCalls = [];
  const hindsight = {
    recall: async (query) => { recallCalls.push(query); return [{ text: 'Bo prefers async updates', scores: { final: 0.9 } }]; },
    reflect: async (item) => { reflectCalls.push(item); },
  };
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A real reply here.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'what did we decide about the project database?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight,
    res: fakeRes(),
  });

  assert.equal(recallCalls.length, 1); // durable-context signal present
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reflectCalls.length, 1); // substantive exchange
  assert.match(reflectCalls[0].summary, /A real reply here\./);
});

// --- Logos.IntentIQ integration (interpretation-only seam) -----------------

test('performStreamingTurn invokes IntentIQ but never lets its output change the assembled turn', async () => {
  const intentIQCalls = [];
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A reply.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'Why is my website crashing?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res: fakeRes(),
    intentIQ: (messages, options) => {
      intentIQCalls.push({ messages, options });
      return { schemaVersion: 'intentiq.v1', intent: 'inform.explain', status: 'accepted' };
    },
  });

  assert.equal(intentIQCalls.length, 1);
  assert.equal(intentIQCalls[0].messages[0].content, 'Why is my website crashing?');
});

test('performStreamingTurn completes normally even if IntentIQ throws', async () => {
  const res = fakeRes();
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A reply.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'Why is my website crashing?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res,
    intentIQ: () => { throw new Error('boom'); },
  });

  assert.equal(res.headers['Content-Type'], 'text/event-stream');
  assert.equal(res.written.at(-1), 'data: [DONE]\n\n');
});

test('performStreamingTurn produces an identical assembled prompt with the real IntentIQ wired in (default) as without it', async () => {
  let seenWithDefault;
  const hermes = {
    stream: async (messages, { onDelta }) => { seenWithDefault = messages; onDelta('ok', false); return 'A reply.'; },
  };
  await performStreamingTurn({
    messages: [{ role: 'user', content: 'hi there, how is your day' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res: fakeRes(),
    // intentIQ omitted -> uses the real classifier, per the default param.
  });
  assert.equal(seenWithDefault[0].content, 'SOUL\n\n---\n\nPRINCIPLES\n\n---\n\nLEXICON');
});

// --- Logos.ReasonIQ integration (the IntentIQ -> ReasonIQ handoff seam) ---
//
// Fire-and-forget by design (see turn.js's comment) — these tests flush a
// microtask/macrotask turn (matching how reflectOnTurn's own fire-and-
// forget write is tested above) rather than awaiting performStreamingTurn
// itself, since the call is deliberately not on the response's critical
// path.

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('performStreamingTurn hands IntentIQ\'s real decision to ReasonIQ, fire-and-forget', async () => {
  const reasonIQCalls = [];
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A reply.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'Why is my website crashing?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res: fakeRes(),
    intentIQ: () => ({ schemaVersion: 'intentiq.v1', intent: 'inform.explain', status: 'accepted' }),
    reasonIQ: async (input) => { reasonIQCalls.push(input); return {}; },
  });
  await flush();

  assert.equal(reasonIQCalls.length, 1);
  assert.equal(reasonIQCalls[0].text, 'Why is my website crashing?');
  assert.equal(reasonIQCalls[0].intentDecision.intent, 'inform.explain');
  assert.deepEqual(reasonIQCalls[0].evidence, []);
});

test('performStreamingTurn does not await ReasonIQ — a slow call never delays the response', async () => {
  let resolveReasonIQ;
  const slowReasonIQ = () => new Promise((resolve) => { resolveReasonIQ = resolve; });
  const res = fakeRes();
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A reply.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'Why is my website crashing?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res,
    reasonIQ: slowReasonIQ,
  });

  // The turn already completed while ReasonIQ is still pending.
  assert.equal(res.written.at(-1), 'data: [DONE]\n\n');
  resolveReasonIQ({});
  await flush();
});

test('performStreamingTurn completes normally even if ReasonIQ rejects', async () => {
  const res = fakeRes();
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A reply.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'Why is my website crashing?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res,
    reasonIQ: async () => { throw new Error('boom'); },
  });
  await flush(); // the rejection must be swallowed, not surface as an unhandled rejection

  assert.equal(res.headers['Content-Type'], 'text/event-stream');
  assert.equal(res.written.at(-1), 'data: [DONE]\n\n');
});

test('performStreamingTurn wires the real ReasonIQ by default and never throws', async () => {
  const res = fakeRes();
  const hermes = { stream: async (messages, { onDelta }) => { onDelta('ok', false); return 'A reply.'; } };

  await performStreamingTurn({
    messages: [{ role: 'user', content: 'Why is my website crashing?' }],
    documents: DOCUMENTS,
    hermes,
    hindsight: SILENT_HINDSIGHT,
    res,
    // reasonIQ omitted -> uses the real evaluate(), per the default param.
  });
  await flush();

  assert.equal(res.written.at(-1), 'data: [DONE]\n\n');
});
