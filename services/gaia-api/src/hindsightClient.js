'use strict';

/**
 * Hindsight client — recall and reflection, server-side.
 *
 * Simpler than gaia-web's HindsightProvider (frontend/src/gaia/integration/
 * memory/HindsightProvider.js): that one has to reach Hindsight through a
 * same-origin nginx proxy because a browser can't call it directly (no
 * CORS support on Hindsight's side). gaia-api is already Tailscale-bound,
 * so it calls Hindsight directly — no proxy trick needed. Hindsight
 * currently has no auth of its own (Tailscale membership is the only
 * access control, same posture as services/cognition).
 */
function createHindsightClient({ baseUrl, bankId, fetchImpl = fetch, timeoutMs = 4000 }) {
  const root = String(baseUrl || '').replace(/\/+$/, '');
  if (!root) {
    throw new Error('HINDSIGHT_URL is required');
  }
  if (!bankId) {
    throw new Error('HINDSIGHT_BANK_ID is required');
  }

  const headers = { 'Content-Type': 'application/json' };
  const bankUrl = (path = '') => `${root}/v1/default/banks/${bankId}${path}`;

  /**
   * @param {string} query
   * @returns {Promise<Array<{ summary: string, confidence: number|null }>>}
   */
  async function recall(query) {
    let response;
    try {
      response = await fetchImpl(bankUrl('/memories/recall'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, budget: 'low' }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new Error(`hindsight recall unreachable: ${error.message}`);
    }
    if (!response.ok) {
      throw new Error(`hindsight recall responded ${response.status}`);
    }
    const data = await response.json();
    return (data.results || []).map((r) => ({
      summary: r.text,
      confidence: typeof r.scores?.final === 'number' ? r.scores.final : null,
    }));
  }

  /**
   * Async by design — retain runs LLM-based fact extraction server-side on
   * Hindsight's own end and can take 10-20s+; the caller must never block
   * a turn on it (matches gaia-web's HindsightProvider.storeReflection).
   * @param {{ summary: string, domain?: string, provenance?: object }} reflection
   */
  async function reflect({ summary, domain, provenance = {} }) {
    const item = {
      content: summary,
      context: domain || null,
      timestamp: provenance.observed_at || null,
      document_id: provenance.conversation_id || undefined,
      metadata: provenance.source_message_id
        ? { source_message_id: provenance.source_message_id }
        : undefined,
      tags: domain ? [domain] : undefined,
    };

    let response;
    try {
      response = await fetchImpl(bankUrl('/memories'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ async: true, items: [item] }),
      });
    } catch (error) {
      throw new Error(`hindsight retain unreachable: ${error.message}`);
    }
    if (!response.ok) {
      throw new Error(`hindsight retain responded ${response.status}`);
    }
  }

  return { recall, reflect };
}

module.exports = { createHindsightClient };
