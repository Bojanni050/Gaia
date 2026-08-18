import { FoundationCache } from './cache';

/**
 * Orchestrates the loading of foundation documents for the frontend.
 */
export class FoundationBuilder {
  private static readonly DOCUMENTS = [
    'soul.md',
    'principles.md',
    'lexicon.md',
    'architecture.md',
    'evolution.md'
  ];

  /**
   * Retrieves all foundation documents as a dictionary.
   */
  public static buildDictionary(cache: FoundationCache): Record<string, string> {
    const dict: Record<string, string> = {};
    this.DOCUMENTS.forEach(filename => {
      dict[filename] = cache.get(filename);
    });
    return dict;
  }

  /**
   * Pre-loads the cache with all required documents.
   */
  public static preload(cache: FoundationCache): void {
    this.DOCUMENTS.forEach(filename => cache.reload(filename));
  }
}
