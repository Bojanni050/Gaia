import { rules } from './rules';

export class FoundationSelector {
  /**
   * Evaluates the configured rules against the given context and 
   * returns the required foundation documents.
   */
  static select(context) {
    for (const rule of rules) {
      if (rule.condition(context)) {
        return rule.documents;
      }
    }
    
    // Fallback to normal conversation
    return ['soul.md', 'principles.md', 'lexicon.md'];
  }
}
