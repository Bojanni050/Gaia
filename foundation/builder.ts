import { cache } from './cache';

/**
 * Orchestrates the loading and concatenation of foundation documents.
 */
export class FoundationBuilder {
  private static readonly DOCUMENTS = [
    'soul.md',
    'principles.md',
    'lexicon.md'
  ];

  /**
   * Retrieves and concatenates the foundation documents into a single prompt string.
   */
  public static buildPrompt(): string {
    return this.DOCUMENTS
      .map(filename => cache.get(filename))
      .join('\n\n---\n\n');
  }

  /**
   * Pre-loads the cache with all required documents.
   */
  public static preload(): void {
    this.DOCUMENTS.forEach(filename => cache.reload(filename));
  }
}
