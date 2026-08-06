import artifact from './artifact.json';

/**
 * Foundation Engine (Frontend API)
 * 
 * Provides access to the dynamically generated foundation artifact.
 */
export class FoundationEngine {
  /**
   * Retrieves the full system prompt built from the foundation documents.
   */
  public static getPrompt(): string {
    return artifact.prompt;
  }
}
