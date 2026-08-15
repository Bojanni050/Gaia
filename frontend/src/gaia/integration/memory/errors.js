/**
 * Typed memory errors. The desktop maps these to Gaia-language phrases;
 * raw error text from a provider never reaches the user.
 */

export class MemoryUnavailableError extends Error {
  constructor(detail) {
    super(detail || 'memory provider unavailable');
    this.name = 'MemoryUnavailableError';
  }
}

export class MemoryNotFoundError extends Error {
  constructor(memoryId) {
    super(`memory not found: ${memoryId}`);
    this.name = 'MemoryNotFoundError';
  }
}

export class HypothesisTransitionError extends Error {
  constructor(detail) {
    super(detail || 'invalid hypothesis status transition');
    this.name = 'HypothesisTransitionError';
  }
}
