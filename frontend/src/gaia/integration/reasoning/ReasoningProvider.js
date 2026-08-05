/**
 * ReasoningProvider — the seam Gaia depends on for thought.
 *
 * Concrete providers (HermesProvider today, others tomorrow) implement this
 * contract. The desktop never imports a provider class directly; it asks the
 * reasoning module for the configured provider. This is how Gaia stays
 * model-agnostic and provider-invariant.
 */
export class ReasoningProvider {
  /**
   * @param {{ baseUrl?: string, model?: string, apiKey?: string }} [config]
   */
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Quick liveness check. Implementations should be cheap and timeout-fast.
   * @returns {Promise<import('../../contracts/reasoning').ReasoningHealth>}
   */
  // eslint-disable-next-line class-methods-use-this, require-await
  async health() {
    throw new Error('ReasoningProvider.health must be implemented');
  }

  /**
   * Stream a chat completion. Implementations MUST invoke onDelta for every
   * piece of text the model produces, in order. They MUST resolve with the
   * full assembled text after the stream ends.
   *
   * Implementations MUST reject with a typed error (see errors.js) so the
   * desktop can phrase a calm Gaia-language message.
   *
   * @param {import('../../contracts/reasoning').ReasoningMessage[]} messages
   * @param {{ signal?: AbortSignal, onDelta?: (chunk: string) => void }} [options]
   * @returns {Promise<string>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async stream(messages, options = {}) {
    throw new Error('ReasoningProvider.stream must be implemented');
  }

  /**
   * Non-streaming chat completion. Used for short internal calls.
   * @param {import('../../contracts/reasoning').ReasoningMessage[]} messages
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<string>}
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async chat(messages, options = {}) {
    throw new Error('ReasoningProvider.chat must be implemented');
  }
}
