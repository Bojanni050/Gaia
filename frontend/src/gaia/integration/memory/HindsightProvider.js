import { MemoryProvider } from './MemoryProvider';
import { MemoryUnavailableError, MemoryNotFoundError } from './errors';

/**
 * HindsightProvider — Gaia's own connection to her Hindsight instance.
 *
 * Talks to a real Hindsight deployment (github.com/vectorize-io/hindsight)
 * over its HTTP API, scoped to Gaia's own memory bank — not shared with any
 * other assistant or tenant on the same Hindsight deployment.
 *
 * Hindsight runs in Gaia Cloud (architecture.md §4.4): this provider is the
 * one seam Gaia Desktop crosses to reach it. Reflections are written
 * asynchronously — retain triggers LLM-based fact extraction server-side,
 * which is too slow to block a conversational turn on, matching the
 * asynchronous REFLECT step in the streaming lifecycle (architecture.md §10).
 *
 * Default URL targets Hindsight over Tailscale, not the public internet —
 * this deployment is intentionally not exposed publicly. Override with
 * REACT_APP_HINDSIGHT_URL. Override the bank with REACT_APP_HINDSIGHT_BANK_ID.
 */
export class HindsightProvider extends MemoryProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = (config.baseUrl || process.env.REACT_APP_HINDSIGHT_URL || 'http://100.64.144.93:8888')
      .replace(/\/+$/, '');
    this.bankId = config.bankId || process.env.REACT_APP_HINDSIGHT_BANK_ID || 'gaia';
    this.apiKey = config.apiKey || process.env.REACT_APP_HINDSIGHT_API_KEY || '';
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  _bankUrl(path = '') {
    return `${this.baseUrl}/v1/default/banks/${this.bankId}${path}`;
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: this._headers(),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return { ok: false, detail: `health endpoint ${res.status}` };
      return { ok: true };
    } catch (_) {
      return { ok: false, detail: 'cannot reach Hindsight' };
    }
  }

  /**
   * @param {{ domain?: string, summary: string, provenance?: { source_message_id?: string, conversation_id?: string, observed_at?: string } }} reflection
   */
  async storeReflection(reflection) {
    const { domain, summary, provenance = {} } = reflection;
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

    let res;
    try {
      res = await fetch(this._bankUrl('/memories'), {
        method: 'POST',
        headers: this._headers(),
        // Async: retain runs LLM extraction server-side and can take
        // 10-20s+. Gaia's turn should never block on it (architecture §10).
        body: JSON.stringify({ async: true, items: [item] }),
      });
    } catch (_) {
      throw new MemoryUnavailableError();
    }

    if (!res.ok) {
      throw new MemoryUnavailableError(`retain ${res.status}`);
    }

    const data = await res.json();
    return { operationId: data.operation_id };
  }

  /**
   * @param {string} query
   * @param {{ signal?: AbortSignal, budget?: 'low'|'mid'|'high' }} [options]
   * @returns {Promise<import('../../../contracts/hindsight').Reflection[]>}
   */
  async retrieveRelevantContext(query, { signal, budget = 'mid' } = {}) {
    let res;
    try {
      res = await fetch(this._bankUrl('/memories/recall'), {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({ query, budget }),
        signal,
      });
    } catch (_) {
      throw new MemoryUnavailableError();
    }

    if (!res.ok) {
      throw new MemoryUnavailableError(`recall ${res.status}`);
    }

    const data = await res.json();
    return (data.results || []).map((r) => ({
      id: r.id,
      domain: r.context || null,
      summary: r.text,
      provenance: {
        source_message_id: r.metadata?.source_message_id || null,
        conversation_id: r.document_id || null,
        observed_at: r.occurred_start || null,
      },
      confidence: typeof r.scores?.final === 'number' ? r.scores.final : null,
      created_at: r.mentioned_at || null,
    }));
  }

  /**
   * Returns Hindsight's raw observation history for a memory unit. The
   * desktop's memory view (architecture §8) reads this for "why did Gaia
   * come to understand this" — shape is Hindsight's own, not re-mapped,
   * since it is inherently a change history rather than a single record.
   */
  async listProvenance(memoryId) {
    let res;
    try {
      res = await fetch(this._bankUrl(`/memories/${memoryId}/history`), {
        headers: this._headers(),
      });
    } catch (_) {
      throw new MemoryUnavailableError();
    }

    if (res.status === 404) throw new MemoryNotFoundError(memoryId);
    if (!res.ok) throw new MemoryUnavailableError(`history ${res.status}`);
    return res.json();
  }

  /**
   * @param {string} memoryId
   * @param {{ summary?: string, reason?: string }} patch
   */
  async editMemory(memoryId, patch = {}) {
    const body = {};
    if (patch.summary !== undefined) body.text = patch.summary;
    if (patch.reason !== undefined) body.reason = patch.reason;

    let res;
    try {
      res = await fetch(this._bankUrl(`/memories/${memoryId}`), {
        method: 'PATCH',
        headers: this._headers(),
        body: JSON.stringify(body),
      });
    } catch (_) {
      throw new MemoryUnavailableError();
    }

    if (res.status === 404) throw new MemoryNotFoundError(memoryId);
    if (!res.ok) throw new MemoryUnavailableError(`curate ${res.status}`);
  }

  /**
   * Soft-retires the memory: excluded from recall and consolidation
   * immediately, moved to Hindsight's archive. This is the closest honest
   * mapping to the "forget" contract — Hindsight exposes per-item
   * invalidate (reversible) plus a bulk hard-delete for the whole bank, but
   * no per-item hard delete. From the user's perspective (architecture §8),
   * "forgotten" means gone from what Gaia draws on, which invalidate
   * satisfies; it does not yet purge the row.
   */
  async forget(memoryId, { reason } = {}) {
    let res;
    try {
      res = await fetch(this._bankUrl(`/memories/${memoryId}`), {
        method: 'PATCH',
        headers: this._headers(),
        body: JSON.stringify({ state: 'invalidated', reason: reason || 'forgotten' }),
      });
    } catch (_) {
      throw new MemoryUnavailableError();
    }

    if (res.status === 404) throw new MemoryNotFoundError(memoryId);
    if (!res.ok) throw new MemoryUnavailableError(`forget ${res.status}`);
  }
}
