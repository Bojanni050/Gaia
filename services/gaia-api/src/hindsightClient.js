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
function createHindsightClient({ baseUrl, bankId, budget = 'mid', fetchImpl = fetch, timeoutMs = 4000 }) {
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
   * `budget` defaults to Hindsight's own default (`'mid'`, 300 candidates)
   * rather than an artificially narrowed one — it scales every retrieval
   * strategy Hindsight runs (semantic over-fetch, BM25 limit, graph-
   * traversal depth, reranking pool), so a caller that always asked for
   * `'low'` was quietly capping recall quality on every turn. Overridable
   * per call for anything that genuinely only needs a fast/shallow lookup.
   *
   * The full per-result shape is passed through rather than flattened to
   * just text+confidence — `type`, `entities`, `tags`, and the occurred_*
   * window are exactly what distinguishes a graph- or temporal-matched
   * result from a plain semantic one; flattening them here would throw
   * that signal away before any caller got a chance to use it.
   *
   * @param {string} query
   * @param {{ budget?: 'low'|'mid'|'high' }} [options]
   * @returns {Promise<Array<{
   *   id: string, text: string, type: string|null, context: string|null,
   *   entities: string[]|null, tags: string[], occurredStart: string|null,
   *   occurredEnd: string|null,
   *   scores: { final: number|null, reranker: number|null, semantic: number|null, keyword: number|null },
   * }>>}
   */
  async function recall(query, options = {}) {
    let response;
    try {
      response = await fetchImpl(bankUrl('/memories/recall'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, budget: options.budget || budget }),
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
      id: r.id,
      text: r.text,
      type: r.type || null,
      context: r.context || null,
      entities: r.entities || null,
      tags: r.tags || [],
      occurredStart: r.occurred_start || null,
      occurredEnd: r.occurred_end || null,
      scores: {
        final: typeof r.scores?.final === 'number' ? r.scores.final : null,
        reranker: typeof r.scores?.reranker === 'number' ? r.scores.reranker : null,
        semantic: typeof r.scores?.semantic === 'number' ? r.scores.semantic : null,
        keyword: typeof r.scores?.keyword === 'number' ? r.scores.keyword : null,
      },
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

  /**
   * Fetches one mental model's current content — a standing, periodically
   * refreshed synthesis (Hindsight refreshes it on its own cron/consolidation
   * trigger; this call is a plain read, never an LLM call itself). Returns
   * null rather than throwing on any failure (unreachable, 404, empty
   * content) so a caller can treat "not available yet" and "call failed"
   * the same way.
   * @param {string} mentalModelId
   * @returns {Promise<{ id: string, name: string, content: string, isStale: boolean, lastRefreshedAt: string|null }|null>}
   */
  async function getMentalModel(mentalModelId) {
    let response;
    try {
      response = await fetchImpl(bankUrl(`/mental-models/${mentalModelId}`), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (_) {
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    // A freshly created (or currently refreshing) mental model reports this
    // exact placeholder string as its content before the async generation
    // finishes — treat it the same as "no content yet", not a real summary.
    if (!data.content || data.content === 'Generating content...') return null;
    return {
      id: data.id,
      name: data.name,
      content: data.content,
      isStale: Boolean(data.is_stale),
      lastRefreshedAt: data.last_refreshed_at || null,
    };
  }

  return { recall, reflect, getMentalModel };
}

module.exports = { createHindsightClient };
