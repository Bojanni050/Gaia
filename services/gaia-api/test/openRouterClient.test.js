'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenRouterClient } = require('../src/logos/openRouterClient');

const FAKE_RESPONSE = {
  data: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', context_length: 128000, pricing: { prompt: '0.15', completion: '0.6' } },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context_length: 200000, pricing: { prompt: '3', completion: '15' } },
    { id: '', name: 'should be dropped' },
  ],
};

test('listModels: sends the api key and parses/normalizes/sorts the model list', async () => {
  let seenHeaders;
  const fetchImpl = async (url, opts) => {
    assert.match(url, /\/models$/);
    seenHeaders = opts.headers;
    return { ok: true, json: async () => FAKE_RESPONSE };
  };
  const client = createOpenRouterClient({ apiKey: 'sk-or-x', fetchImpl });
  const models = await client.listModels();

  assert.equal(seenHeaders.Authorization, 'Bearer sk-or-x');
  assert.equal(models.length, 2); // the id-less entry is dropped
  assert.equal(models[0].name, 'Claude 3.5 Sonnet'); // alphabetically before GPT-4o mini
  assert.equal(models[1].id, 'openai/gpt-4o-mini');
  assert.equal(models[1].contextLength, 128000);
  assert.equal(models[1].pricing.prompt, '0.15');
});

test('listModels: a 401 is reported as a rejected key, not a generic error', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401 });
  const client = createOpenRouterClient({ apiKey: 'bad', fetchImpl });
  await assert.rejects(() => client.listModels(), /rejected the api key/);
});

test('listModels: an unreachable endpoint throws a generic error', async () => {
  const fetchImpl = async () => { throw new Error('getaddrinfo ENOTFOUND openrouter.ai'); };
  const client = createOpenRouterClient({ apiKey: 'x', fetchImpl });
  await assert.rejects(() => client.listModels(), /unreachable/);
});

test('listModels: handles a missing/empty data array gracefully', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({}) });
  const client = createOpenRouterClient({ apiKey: 'x', fetchImpl });
  const models = await client.listModels();
  assert.deepEqual(models, []);
});
