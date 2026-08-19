'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createReasoningModelStore, maskKey } = require('../src/logos/reasoningModelStore');

function tempStore() {
  const storePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reasoniq-store-')), 'config.json');
  return createReasoningModelStore({ storePath });
}

test('maskKey: short keys are fully masked, longer keys show first/last 4', () => {
  assert.equal(maskKey(''), null);
  assert.equal(maskKey(null), null);
  assert.equal(maskKey('short'), '••••');
  assert.equal(maskKey('sk-or-abcdefghij1234'), 'sk-o…1234');
});

test('getConfig returns null before anything is saved', () => {
  const store = tempStore();
  assert.equal(store.getConfig(), null);
});

test('saveConfig persists and getConfig reads it back, including the raw apiKey', () => {
  const store = tempStore();
  store.saveConfig({ provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'x/y', apiKey: 'sk-or-secret' });
  const config = store.getConfig();
  assert.equal(config.provider, 'openrouter');
  assert.equal(config.model, 'x/y');
  assert.equal(config.apiKey, 'sk-or-secret');
  assert.ok(config.updatedAt);
});

test('saveConfig with a partial update keeps the previously stored apiKey', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'sk-or-secret', provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' });
  store.saveConfig({ model: 'new/model' }); // no apiKey field at all
  const config = store.getConfig();
  assert.equal(config.apiKey, 'sk-or-secret');
  assert.equal(config.model, 'new/model');
});

test('getMaskedConfig never returns the raw apiKey', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'sk-or-secret-value', model: 'x/y' });
  const masked = store.getMaskedConfig();
  assert.equal(masked.hasApiKey, true);
  assert.notEqual(masked.maskedApiKey, 'sk-or-secret-value');
  assert.ok(!JSON.stringify(masked).includes('sk-or-secret-value'));
});

test('getMaskedConfig before any save reports hasApiKey: false', () => {
  const store = tempStore();
  const masked = store.getMaskedConfig();
  assert.equal(masked.hasApiKey, false);
  assert.equal(masked.maskedApiKey, null);
});

test('saveConfig creates the parent directory if it does not exist yet', () => {
  const nested = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reasoniq-store-')), 'nested', 'dir', 'config.json');
  const store = createReasoningModelStore({ storePath: nested });
  store.saveConfig({ apiKey: 'x' });
  assert.ok(fs.existsSync(nested));
});

test('clear removes the stored config', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'x' });
  store.clear();
  assert.equal(store.getConfig(), null);
});

// --- visionModel (OCR-specific model, separate from ReasonIQ's own) -----

test('saveConfig persists visionModel independently of model', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'sk-or-x', model: 'anthropic/claude-3.5-sonnet', visionModel: 'openai/gpt-4o-mini' });
  const config = store.getConfig();
  assert.equal(config.model, 'anthropic/claude-3.5-sonnet');
  assert.equal(config.visionModel, 'openai/gpt-4o-mini');
});

test('saveConfig defaults visionModel to empty when never set', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'x', model: 'm' });
  assert.equal(store.getConfig().visionModel, '');
});

test('saveConfig can clear visionModel back to empty (reuse ReasonIQ\'s model)', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'x', visionModel: 'openai/gpt-4o-mini' });
  store.saveConfig({ visionModel: '' });
  assert.equal(store.getConfig().visionModel, '');
});

test('saveConfig with only a model update does not clear a previously saved visionModel', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'x', visionModel: 'openai/gpt-4o-mini' });
  store.saveConfig({ model: 'new/model' });
  assert.equal(store.getConfig().visionModel, 'openai/gpt-4o-mini');
});

test('getMaskedConfig includes visionModel (not a secret, safe to return as-is)', () => {
  const store = tempStore();
  store.saveConfig({ apiKey: 'x', visionModel: 'openai/gpt-4o-mini' });
  assert.equal(store.getMaskedConfig().visionModel, 'openai/gpt-4o-mini');
});

test('getMaskedConfig reports visionModel: null before anything is saved', () => {
  const store = tempStore();
  assert.equal(store.getMaskedConfig().visionModel, null);
});
