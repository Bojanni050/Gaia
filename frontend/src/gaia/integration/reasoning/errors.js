/**
 * Typed reasoning errors. The desktop maps these to Gaia-language phrases;
 * raw error text from a provider never reaches the user.
 */

export class ReasoningUnavailableError extends Error {
  constructor(detail) {
    super(detail || 'reasoning provider unavailable');
    this.name = 'ReasoningUnavailableError';
  }
}

export class ReasoningAbortedError extends Error {
  constructor() {
    super('reasoning aborted');
    this.name = 'ReasoningAbortedError';
  }
}
