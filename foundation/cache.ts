import { loadDocument } from './loader';

interface CacheEntry {
  content: string;
  timestamp: number;
}

class FoundationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  /**
   * Gets a document from the cache, loading it if necessary.
   */
  public get(filename: string): string {
    if (!this.cache.has(filename)) {
      this.reload(filename);
    }
    return this.cache.get(filename)!.content;
  }

  /**
   * Forces a reload of a specific document into the cache.
   */
  public reload(filename: string): void {
    const content = loadDocument(filename, this.rootDir);
    this.cache.set(filename, {
      content,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidates the entire cache.
   */
  public invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Retrieves all cached documents as a map.
   */
  public getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [filename, entry] of this.cache.entries()) {
      result[filename] = entry.content;
    }
    return result;
  }
}

// Export a singleton instance
export const cache = new FoundationCache();
