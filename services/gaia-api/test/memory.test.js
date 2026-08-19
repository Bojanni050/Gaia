'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldRecall, shouldReflect } = require('../src/memoryPolicy');
const { createHindsightClient } = require('../src/hindsightClient');
const { condenseMemoryContext, renderMemoryContext, recallRelevantContext, reflectOnTurn } = require('../src/memory');

// --- memoryPolicy: same case list as gaia-web's memoryPolicy.test.js, so
// this port is checked against the exact behavior already proven correct
// there, not re-derived from scratch. ------------------------------------

test('shouldRecall skips trivial/filler and non-signal-bearing turns', () => {
  assert.equal(shouldRecall(''), false);
  assert.equal(shouldRecall('   '), false);
  assert.equal(shouldRecall('ok'), false);
  assert.equal(shouldRecall('Ok.'), false);
  assert.equal(shouldRecall('THANKS!'), false);
  assert.equal(shouldRecall('why'), false);
  assert.equal(shouldRecall('What theme should I use tonight?'), false);
  assert.equal(shouldRecall('ok, but why does Hermes retry twice?'), false);
  assert.equal(shouldRecall('Can you explain this projection of quarterly numbers?'), false);
  assert.equal(shouldRecall('What happens beforehand in this function?'), false);
});

test('shouldRecall fires on past-reference and durable-context signals, EN and NL', () => {
  assert.equal(shouldRecall('Remind me what I said about the migration plan'), true);
  assert.equal(shouldRecall('Last time we talked about this, what did we decide?'), true);
  assert.equal(shouldRecall('Weet je nog wat ik eerder zei over dit project?'), true);
  assert.equal(shouldRecall('What did we decide about the project database?'), true);
});

test('shouldReflect keeps an exchange unless both sides are trivial', () => {
  assert.equal(shouldReflect('thanks', "you're welcome"), false);
  assert.equal(shouldReflect('why', 'no reason'), false);
  assert.equal(shouldReflect('I always work better after midnight, remember that', 'Noted.'), true);
  assert.equal(shouldReflect('why', 'Because you mentioned last week you prefer async updates.'), true);
});

// --- hindsightClient -------------------------------------------------------

test('hindsightClient.recall posts the query, defaults to budget "mid", and maps the full result shape', async () => {
  let captured;
  const client = createHindsightClient({
    baseUrl: 'http://hindsight.internal:8888',
    bankId: 'gaia',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        json: async () => ({
          results: [{
            id: 'mem-1',
            text: 'Bo prefers async updates',
            type: 'observation',
            context: 'work preferences',
            entities: ['Bo'],
            tags: ['context'],
            occurred_start: '2026-08-01T00:00:00Z',
            occurred_end: null,
            scores: { final: 0.8, reranker: 0.75, semantic: 0.9, keyword: null },
          }],
        }),
      };
    },
  });

  const results = await client.recall('what does Bo prefer');
  assert.equal(captured.url, 'http://hindsight.internal:8888/v1/default/banks/gaia/memories/recall');
  const body = JSON.parse(captured.init.body);
  assert.equal(body.query, 'what does Bo prefer');
  assert.equal(body.budget, 'mid');
  assert.deepEqual(results, [{
    id: 'mem-1',
    text: 'Bo prefers async updates',
    type: 'observation',
    context: 'work preferences',
    entities: ['Bo'],
    tags: ['context'],
    occurredStart: '2026-08-01T00:00:00Z',
    occurredEnd: null,
    scores: { final: 0.8, reranker: 0.75, semantic: 0.9, keyword: null },
  }]);
});

test('hindsightClient.recall lets a caller override the default budget per call', async () => {
  let captured;
  const client = createHindsightClient({
    baseUrl: 'http://hindsight.internal:8888',
    bankId: 'gaia',
    fetchImpl: async (url, init) => { captured = init; return { ok: true, json: async () => ({ results: [] }) }; },
  });

  await client.recall('quick check', { budget: 'low' });
  assert.equal(JSON.parse(captured.body).budget, 'low');
});

test('hindsightClient: the factory-level default budget can be changed too', async () => {
  let captured;
  const client = createHindsightClient({
    baseUrl: 'http://hindsight.internal:8888',
    bankId: 'gaia',
    budget: 'high',
    fetchImpl: async (url, init) => { captured = init; return { ok: true, json: async () => ({ results: [] }) }; },
  });

  await client.recall('deep question');
  assert.equal(JSON.parse(captured.body).budget, 'high');
});

test('hindsightClient.recall tolerates a sparse result (missing optional fields)', async () => {
  const client = createHindsightClient({
    baseUrl: 'http://hindsight.internal:8888',
    bankId: 'gaia',
    fetchImpl: async () => ({ ok: true, json: async () => ({ results: [{ id: 'x', text: 'bare fact' }] }) }),
  });

  const [result] = await client.recall('anything');
  assert.equal(result.text, 'bare fact');
  assert.equal(result.type, null);
  assert.deepEqual(result.tags, []);
  assert.equal(result.scores.final, null);
});

test('hindsightClient.reflect posts an async retain', async () => {
  let captured;
  const client = createHindsightClient({
    baseUrl: 'http://hindsight.internal:8888',
    bankId: 'gaia',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true };
    },
  });

  await client.reflect({ summary: 'Bo: hi\n\nGaia: hello', domain: 'context' });
  const body = JSON.parse(captured.init.body);
  assert.equal(body.async, true);
  assert.equal(body.items[0].content, 'Bo: hi\n\nGaia: hello');
});

test('hindsightClient refuses to construct without a base URL or bank', () => {
  assert.throws(() => createHindsightClient({ baseUrl: '', bankId: 'gaia' }));
  assert.throws(() => createHindsightClient({ baseUrl: 'http://x', bankId: '' }));
});

// --- memory.js orchestration ------------------------------------------------

function reflection(text, final) {
  return { text, scores: { final } };
}

test('condenseMemoryContext tags low-confidence lines uncertain, caps at 6, dedupes', () => {
  const reflections = [
    reflection('A', 0.9),
    reflection('B', 0.4),
    reflection('A', 0.9), // duplicate
    ...Array.from({ length: 6 }, (_, i) => reflection(`extra-${i}`, 0.9)),
  ];
  const lines = condenseMemoryContext(reflections);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], '- A');
  assert.equal(lines[1], '- B (uncertain)');
});

test('renderMemoryContext returns null when there is nothing to show', () => {
  assert.equal(renderMemoryContext([]), null);
  assert.equal(renderMemoryContext(null), null);
});

test('renderMemoryContext renders a block when there is something to show', () => {
  const block = renderMemoryContext([reflection('Bo prefers async updates', 0.9)]);
  assert.match(block, /long-term memory \(Hindsight\)/);
  assert.match(block, /- Bo prefers async updates$/m);
});

test('recallRelevantContext skips the call for a policy-trivial query and never throws on failure', async () => {
  let called = false;
  const hindsight = { recall: async () => { called = true; return []; } };
  assert.deepEqual(await recallRelevantContext(hindsight, 'ok'), []);
  assert.equal(called, false);

  const failing = { recall: async () => { throw new Error('unreachable'); } };
  assert.deepEqual(await recallRelevantContext(failing, 'remember what I said about the project'), []);
});

test('reflectOnTurn skips trivial exchanges and never throws even if Hindsight rejects', async () => {
  let calls = 0;
  const hindsight = { reflect: async () => { calls += 1; throw new Error('unreachable'); } };

  reflectOnTurn(hindsight, { userText: 'thanks', assistantText: 'np', conversationId: 'c1' });
  assert.equal(calls, 0); // both trivial, skipped

  assert.doesNotThrow(() => {
    reflectOnTurn(hindsight, {
      userText: 'I always work better after midnight, remember that',
      assistantText: 'Noted.',
      conversationId: 'c1',
    });
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
});
