'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveReasoningModelConfig, resolveVisionModelConfig } = require('../src/logos/reasoningModelConfigResolver');

function fakeStore(config) {
  return { getConfig: () => config };
}

test('resolver: falls back to env vars when no store is given', () => {
  const config = resolveReasoningModelConfig({ env: { REASONIQ_MODEL_BASE_URL: 'http://x', REASONIQ_MODEL_NAME: 'm' } });
  assert.equal(config.baseUrl, 'http://x');
  assert.equal(config.model, 'm');
});

test('resolver: falls back to env vars when the store has no saved apiKey', () => {
  const store = fakeStore(null);
  const config = resolveReasoningModelConfig({ store, env: { REASONIQ_MODEL_BASE_URL: 'http://env', REASONIQ_MODEL_NAME: 'env-model' } });
  assert.equal(config.baseUrl, 'http://env');
});

test('resolver: the stored config wins over env vars once an apiKey is saved', () => {
  const store = fakeStore({ provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet', apiKey: 'sk-or-x' });
  const config = resolveReasoningModelConfig({ store, env: { REASONIQ_MODEL_BASE_URL: 'http://env-should-be-ignored', REASONIQ_MODEL_NAME: 'ignored' } });
  assert.equal(config.provider, 'openrouter');
  assert.equal(config.model, 'anthropic/claude-3.5-sonnet');
  assert.equal(config.apiKey, 'sk-or-x');
});

test('resolver: a stored config missing baseUrl/provider gets OpenRouter defaults', () => {
  const store = fakeStore({ model: 'x/y', apiKey: 'sk-or-x' });
  const config = resolveReasoningModelConfig({ store, env: {} });
  assert.equal(config.provider, 'openrouter');
  assert.equal(config.baseUrl, 'https://openrouter.ai/api/v1');
});

// --- resolveVisionModelConfig (OCR-specific, falls back to ReasonIQ's own) --

test('resolveVisionModelConfig uses visionModel when set, same provider/baseUrl/apiKey as ReasonIQ', () => {
  const store = fakeStore({
    provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet', visionModel: 'openai/gpt-4o-mini', apiKey: 'sk-or-x',
  });
  const config = resolveVisionModelConfig({ store, env: {} });
  assert.equal(config.model, 'openai/gpt-4o-mini');
  assert.equal(config.apiKey, 'sk-or-x');
  assert.equal(config.baseUrl, 'https://openrouter.ai/api/v1');
});

test('resolveVisionModelConfig falls back to the main model when visionModel is unset', () => {
  const store = fakeStore({ model: 'anthropic/claude-3.5-sonnet', visionModel: '', apiKey: 'sk-or-x' });
  const config = resolveVisionModelConfig({ store, env: {} });
  assert.equal(config.model, 'anthropic/claude-3.5-sonnet');
});

test('resolveVisionModelConfig falls back to the main model when visionModel is missing entirely', () => {
  const store = fakeStore({ model: 'anthropic/claude-3.5-sonnet', apiKey: 'sk-or-x' });
  const config = resolveVisionModelConfig({ store, env: {} });
  assert.equal(config.model, 'anthropic/claude-3.5-sonnet');
});

test('resolveVisionModelConfig falls back to env vars when no store/apiKey is available, same as ReasonIQ', () => {
  const config = resolveVisionModelConfig({ env: { REASONIQ_MODEL_BASE_URL: 'http://x', REASONIQ_MODEL_NAME: 'm' } });
  assert.equal(config.baseUrl, 'http://x');
  assert.equal(config.model, 'm');
});
