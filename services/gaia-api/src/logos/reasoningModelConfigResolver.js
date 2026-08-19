'use strict';

/**
 * Combines the persisted admin config (reasoningModelStore.js) with the
 * REASONIQ_MODEL_* env vars into the single config
 * reasoningModelClient.js needs. The stored config — set through the
 * admin surface — wins whenever it has an API key; env vars remain the
 * ops-level fallback/override for deployments that would rather manage
 * this the same way HERMES_* is managed (.env only, no admin surface).
 */

const { readReasoningModelConfig } = require('./reasoningModelClient');

/**
 * @param {{ store?: ReturnType<import('./reasoningModelStore').createReasoningModelStore>, env?: NodeJS.ProcessEnv }} [options]
 */
function resolveReasoningModelConfig(options = {}) {
  const env = options.env || process.env;
  const envConfig = readReasoningModelConfig(env);

  const stored = options.store ? options.store.getConfig() : null;
  if (stored && stored.apiKey) {
    return {
      provider: stored.provider || 'openrouter',
      baseUrl: stored.baseUrl || 'https://openrouter.ai/api/v1',
      model: stored.model || '',
      apiKey: stored.apiKey,
    };
  }

  return envConfig;
}

module.exports = { resolveReasoningModelConfig };
