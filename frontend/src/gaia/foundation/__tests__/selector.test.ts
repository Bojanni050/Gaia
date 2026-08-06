import { FoundationSelector } from '../selector';
import { ConversationContext } from '../context';

describe('FoundationSelector', () => {
  it('selects normal conversation documents by default', () => {
    const context: ConversationContext = { type: 'conversation' };
    const docs = FoundationSelector.select(context);
    expect(docs).toEqual(['soul.md', 'principles.md', 'lexicon.md']);
  });

  it('selects architecture document for technical conversations', () => {
    const context: ConversationContext = { type: 'technical' };
    const docs = FoundationSelector.select(context);
    expect(docs).toEqual(['soul.md', 'principles.md', 'lexicon.md', 'architecture.md']);
  });

  it('selects evolution document for gaia conversations', () => {
    const context: ConversationContext = { type: 'gaia' };
    const docs = FoundationSelector.select(context);
    expect(docs).toEqual(['soul.md', 'principles.md', 'lexicon.md', 'evolution.md']);
  });
});
