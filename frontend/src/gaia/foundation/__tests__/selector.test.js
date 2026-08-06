import { FoundationSelector } from '../selector';

describe('FoundationSelector', () => {
  it('selects normal conversation documents by default', () => {
    const context = { type: 'conversation' };
    const docs = FoundationSelector.select(context);
    expect(docs).toEqual(['soul.md', 'principles.md', 'lexicon.md']);
  });

  it('selects architecture document for technical conversations', () => {
    const context = { type: 'technical' };
    const docs = FoundationSelector.select(context);
    expect(docs).toEqual(['soul.md', 'principles.md', 'lexicon.md', 'architecture.md']);
  });

  it('selects evolution document for gaia conversations', () => {
    const context = { type: 'gaia' };
    const docs = FoundationSelector.select(context);
    expect(docs).toEqual(['soul.md', 'principles.md', 'lexicon.md', 'evolution.md']);
  });
});
