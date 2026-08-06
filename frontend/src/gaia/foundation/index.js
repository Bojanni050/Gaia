import artifact from './artifact.json';
import { FoundationSelector } from './selector';

/**
 * Foundation Engine (Frontend API)
 * 
 * Provides access to the dynamically generated foundation artifact.
 */
export class FoundationEngine {
  /**
   * Retrieves the full system prompt built from the dynamically selected foundation documents.
   */
  static getPrompt(context) {
    const selectedFiles = FoundationSelector.select(context);
    const availableFiles = Object.keys(artifact.documents || {});
    
    const skippedFiles = availableFiles.filter(f => !selectedFiles.includes(f));
    
    console.log(
      'Foundation Selector\n\n' +
      'Conversation Type:\n' +
      `${context.type}\n\n` +
      'Selected:\n' +
      selectedFiles.map(f => `✓ ${f}`).join('\n') + '\n\n' +
      'Skipped:\n' +
      (skippedFiles.length > 0 ? skippedFiles.join('\n') : '(none)')
    );

    return selectedFiles
      .map(filename => artifact.documents[filename])
      .filter(content => content !== undefined)
      .join('\n\n---\n\n');
  }
}
