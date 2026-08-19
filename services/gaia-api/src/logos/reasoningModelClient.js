'use strict';

/**
 * ReasonIQ's reasoning model client — deliberately separate from
 * hermesClient.js. Hermes is a capability Gaia may task explicitly, once
 * she has decided a turn needs it; ReasonIQ's reasoning model is part of
 * Logos's own cognitive implementation, invoked by ReasonIQ itself, on
 * its own schedule, never selected or routed to by Gaia (§2, §3, §21 of
 * this phase's brief). The two clients happen to share an OpenAI-
 * compatible HTTP shape because that shape is common infrastructure, not
 * because ReasonIQ depends on Hermes — this file has no reference to
 * hermesClient.js and reads its own, independent environment variables.
 *
 * Configuration (independent of HERMES_*):
 *   REASONIQ_MODEL_BASE_URL   - OpenAI-compatible base URL. Unset = "no
 *                                reasoning model configured"; ReasonIQ
 *                                degrades to shallow-only reasoning
 *                                rather than failing the turn (see
 *                                reasonIQ.js).
 *   REASONIQ_MODEL_NAME       - model identifier sent to that endpoint.
 *   REASONIQ_MODEL_API_KEY    - optional bearer token.
 *   REASONIQ_MODEL_PROVIDER   - free-text label for observability only
 *                                (e.g. "openai-compatible"); never sent
 *                                upstream, never returned to any client.
 */

const DEFAULT_TIMEOUT_MS = 60000;

/** @param {NodeJS.ProcessEnv} env */
function readReasoningModelConfig(env = process.env) {
  return {
    provider: env.REASONIQ_MODEL_PROVIDER || 'openai-compatible',
    baseUrl: env.REASONIQ_MODEL_BASE_URL || '',
    model: env.REASONIQ_MODEL_NAME || '',
    apiKey: env.REASONIQ_MODEL_API_KEY || '',
  };
}

function isConfigured(config) {
  return Boolean(config.baseUrl && config.model);
}

/**
 * Creates ReasonIQ's reasoning model client. `chat()` requests a single,
 * non-streaming, structured-JSON completion — ReasonIQ is a cognitive
 * step inside one turn, not a chat surface, so there is no streaming
 * concern here the way there is in hermesClient.js.
 *
 * @param {{ baseUrl?: string, model?: string, apiKey?: string, provider?: string, fetchImpl?: Function, timeoutMs?: number }} [options]
 */
function createReasoningModelClient(options = {}) {
  const config = {
    provider: options.provider || 'openai-compatible',
    baseUrl: String(options.baseUrl || '').replace(/\/+$/, ''),
    model: options.model || '',
    apiKey: options.apiKey || '',
  };
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  /**
   * @param {Array<{role: string, content: string}>} messages
   * @returns {Promise<string>} the raw text content of the completion — ReasonIQ parses/validates it as JSON, this client does not.
   */
  async function chat(messages) {
    if (!isConfigured(config)) {
      throw new Error('reasoning model not configured (REASONIQ_MODEL_BASE_URL / REASONIQ_MODEL_NAME unset)');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    let response;
    try {
      response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          stream: false,
          messages,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      console.error(`[reasonIQ:model] unreachable at ${config.baseUrl}: ${error.message}`);
      throw new Error('reasoning model unreachable');
    }

    if (!response.ok) {
      console.error(`[reasonIQ:model] responded ${response.status} at ${config.baseUrl}`);
      throw new Error('reasoning model responded with an error');
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      console.error(`[reasonIQ:model] unreadable response at ${config.baseUrl}`);
      throw new Error('reasoning model returned an unreadable response');
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : undefined;
    if (typeof content !== 'string' || content.length === 0) {
      console.error(`[reasonIQ:model] no content in response at ${config.baseUrl}`);
      throw new Error('reasoning model returned no content');
    }
    return content;
  }

  return { chat, config, isConfigured: () => isConfigured(config) };
}

module.exports = { createReasoningModelClient, readReasoningModelConfig, isConfigured };
