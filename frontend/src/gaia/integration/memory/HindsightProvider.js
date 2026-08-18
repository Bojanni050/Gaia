import { MemoryProvider } from './MemoryProvider';
import { MemoryUnavailableError, MemoryNotFoundError, HypothesisTransitionError } from './errors';

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
 * Default URLs are relative (/api/hindsight, /api/cognition), proxied
 * same-origin — same pattern as Hermes's default /api/hermes. Hindsight and
 * the cognition service send no CORS headers at all (confirmed against
 * Hindsight's own OpenAPI-described behavior: an OPTIONS preflight 405s),
 * so a browser calling them cross-origin is always blocked; same-origin
 * proxying isn't a style choice here, it's the only way this works in a
 * browser. In dev, craco.config.js proxies these paths to the real
 * Tailscale addresses; in production, nginx.conf does. Override with
 * REACT_APP_HINDSIGHT_URL / REACT_APP_COGNITION_URL for a direct
 * (non-browser, e.g. Node/testing) connection. Override the bank with
 * REACT_APP_HINDSIGHT_BANK_ID.
 */
export class HindsightProvider extends MemoryProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = (config.baseUrl || process.env.REACT_APP_HINDSIGHT_URL || '/api/hindsight')
      .replace(/\/+$/, '');
    this.bankId = config.bankId || process.env.REACT_APP_HINDSIGHT_BANK_ID || 'gaia';
    this.apiKey = config.apiKey || process.env.REACT_APP_HINDSIGHT_API_KEY || '';
    // Patterns and hypotheses (architecture.md §6.1) have nowhere to live in
    // Hindsight's own API — this is Gaia's own cognition service (see
    // services/cognition), Hindsight-adjacent, not Hindsight itself.
    this.cognitionUrl = (config.cognitionUrl || process.env.REACT_APP_COGNITION_URL || '/api/cognition')
      .replace(/\/+$/, '');
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  _bankUrl(path = '') {
    return `${this.baseUrl}/v1/default/banks/${this.bankId}${path}`;
  }

  _cognitionUrl(path = '') {
    return `${this.cognitionUrl}/v1/banks/${this.bankId}${path}`;
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
   * @returns {Promise<import('@gaia/contracts').Reflection[]>}
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

  // --- Patterns & hypotheses (services/cognition) -------------------------

  async _cognitionRequest(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch(this._cognitionUrl(path), {
        method,
        headers: this._headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      throw new MemoryUnavailableError();
    }

    if (res.status === 404) throw new MemoryNotFoundError(path);
    if (res.status === 409) {
      const detail = await res.json().catch(() => ({}));
      throw new HypothesisTransitionError(detail.error);
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new MemoryUnavailableError(detail.error || `cognition ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /** @param {{ content: string, confidence?: number, coherenceScore?: number, sourceMemoryIds?: string[] }} pattern */
  async formPattern(pattern) {
    return this._cognitionRequest('/patterns', {
      method: 'POST',
      body: {
        content: pattern.content,
        confidence: pattern.confidence,
        coherence_score: pattern.coherenceScore,
        source_memory_ids: pattern.sourceMemoryIds,
      },
    });
  }

  async queryPatterns() {
    const data = await this._cognitionRequest('/patterns');
    return data.patterns;
  }

  /** @param {{ statement: string, confidence?: number, verificationPlan?: string, evidenceMemoryIds?: string[] }} hypothesis */
  async proposeHypothesis(hypothesis) {
    return this._cognitionRequest('/hypotheses', {
      method: 'POST',
      body: {
        statement: hypothesis.statement,
        confidence: hypothesis.confidence,
        verification_plan: hypothesis.verificationPlan,
        evidence_memory_ids: hypothesis.evidenceMemoryIds,
      },
    });
  }

  async listHypotheses(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await this._cognitionRequest(`/hypotheses${query}`);
    return data.hypotheses;
  }

  async updateHypothesis(hypothesisId, patch = {}) {
    return this._cognitionRequest(`/hypotheses/${hypothesisId}`, {
      method: 'PATCH',
      body: {
        statement: patch.statement,
        confidence: patch.confidence,
        verification_plan: patch.verificationPlan,
        evidence_memory_ids: patch.evidenceMemoryIds,
      },
    });
  }

  async testHypothesis(hypothesisId) {
    return this._cognitionRequest(`/hypotheses/${hypothesisId}/test`, { method: 'POST' });
  }

  async confirmHypothesis(hypothesisId) {
    return this._cognitionRequest(`/hypotheses/${hypothesisId}/confirm`, { method: 'POST' });
  }

  async rejectHypothesis(hypothesisId, reason) {
    return this._cognitionRequest(`/hypotheses/${hypothesisId}/reject`, { method: 'POST', body: { reason } });
  }
}
