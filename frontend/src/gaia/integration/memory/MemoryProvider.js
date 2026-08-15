/**
 * MemoryProvider — the seam Gaia depends on for long-term memory.
 *
 * Concrete providers (HindsightProvider today, others tomorrow) implement
 * this contract. The desktop never imports a provider class directly; it
 * asks the memory module for the configured provider. This mirrors
 * ReasoningProvider — Gaia stays storage-abstract the same way she stays
 * model-agnostic (architecture.md §7).
 */
export class MemoryProvider {
  /**
   * @param {{ baseUrl?: string, bankId?: string, apiKey?: string }} [config]
   */
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Quick liveness check. Implementations should be cheap and timeout-fast.
   * @returns {Promise<{ ok: boolean, detail?: string }>}
   */
  // eslint-disable-next-line class-methods-use-this, require-await
  async health() {
    throw new Error('MemoryProvider.health must be implemented');
  }

  /**
   * Store a reflection. Reflection, not logging — callers pass what Gaia
   * came to understand, not the raw transcript (architecture.md §6).
   * @param {import('../../../contracts/hindsight').Reflection} reflection
   * @returns {Promise<{ operationId: string }>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async storeReflection(reflection) {
    throw new Error('MemoryProvider.storeReflection must be implemented');
  }

  /**
   * Retrieve relevant context for a query.
   * @param {string} query
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<import('../../../contracts/hindsight').Reflection[]>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async retrieveRelevantContext(query, options = {}) {
    throw new Error('MemoryProvider.retrieveRelevantContext must be implemented');
  }

  /**
   * List provenance/history for a stored reflection.
   * @param {string} memoryId
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async listProvenance(memoryId) {
    throw new Error('MemoryProvider.listProvenance must be implemented');
  }

  /**
   * Edit a stored reflection.
   * @param {string} memoryId
   * @param {{ summary?: string, reason?: string }} patch
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async editMemory(memoryId, patch) {
    throw new Error('MemoryProvider.editMemory must be implemented');
  }

  /**
   * Forget a stored reflection. Honored fully and immediately from Gaia's
   * perspective — excluded from recall and consolidation from this call on.
   * @param {string} memoryId
   * @param {{ reason?: string }} [options]
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async forget(memoryId, options = {}) {
    throw new Error('MemoryProvider.forget must be implemented');
  }
}
