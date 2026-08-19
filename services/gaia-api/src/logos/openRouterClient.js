'use strict';

/**
 * Minimal OpenRouter client — used only by the admin surface (adminRoutes.js)
 * to list available models for the picker. This is administrative
 * tooling, not part of ReasonIQ's cognitive path: ReasonIQ itself never
 * calls OpenRouter directly to discover models, it only ever uses the one
 * model id already chosen and persisted (reasoningModelStore.js), through
 * the existing generic reasoningModelClient.js (OpenRouter's
 * /chat/completions endpoint is OpenAI-compatible, so no separate chat
 * client was needed for that part).
 */

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * @param {{ apiKey: string, baseUrl?: string, fetchImpl?: Function, timeoutMs?: number }} options
 */
function createOpenRouterClient(options = {}) {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  /**
   * @returns {Promise<Array<{ id: string, name: string, contextLength: number|null, pricing: { prompt: string|null, completion: string|null } }>>}
   */
  async function listModels() {
    const headers = {};
    if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;

    let response;
    try {
      response = await fetchImpl(`${baseUrl}/models`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      console.error(`[openRouter] unreachable at ${baseUrl}: ${error.message}`);
      throw new Error('openrouter unreachable');
    }
    if (!response.ok) {
      console.error(`[openRouter] responded ${response.status} at ${baseUrl}`);
      throw new Error(response.status === 401 ? 'openrouter rejected the api key' : 'openrouter responded with an error');
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error('openrouter returned an unreadable response');
    }

    const models = Array.isArray(data?.data) ? data.data : [];
    return models
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: typeof m.context_length === 'number' ? m.context_length : null,
        pricing: {
          prompt: m.pricing?.prompt ?? null,
          completion: m.pricing?.completion ?? null,
        },
      }))
      .filter((m) => Boolean(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return { listModels };
}

module.exports = { createOpenRouterClient, DEFAULT_BASE_URL };
