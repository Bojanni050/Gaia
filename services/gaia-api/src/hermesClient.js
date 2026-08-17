'use strict';

/**
 * Hermes client — the only place the Gaia API touches a reasoning provider.
 *
 * Talks to an OpenAI-compatible `/chat/completions` endpoint. Provider
 * choice, model name and auth stay here; nothing about them is returned to
 * callers. Non-streaming by design in this phase: the streaming variant
 * will grow behind the same client shape.
 */
function createHermesClient({ baseUrl, model, authToken, fetchImpl = fetch, timeoutMs = 120000 }) {
  const root = String(baseUrl || '').replace(/\/+$/, '');
  if (!root) {
    throw new Error('HERMES_BASE_URL is required');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  async function chat(messages) {
    let response;
    try {
      response = await fetchImpl(`${root}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, stream: false, messages }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (_) {
      throw new Error('hermes unreachable');
    }
    if (!response.ok) {
      throw new Error(`hermes responded with an error`);
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error('hermes returned an unreadable response');
    }
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : undefined;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('hermes returned no content');
    }
    return content;
  }

  return { chat };
}

module.exports = { createHermesClient };
