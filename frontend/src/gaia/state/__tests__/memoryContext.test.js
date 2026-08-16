const mockRetrieveRelevantContext = jest.fn();
const mockStoreReflection = jest.fn();

jest.mock('../../integration/memory', () => ({
  getMemoryProvider: () => ({
    retrieveRelevantContext: mockRetrieveRelevantContext,
    storeReflection: mockStoreReflection,
  }),
}));

// eslint-disable-next-line import/first
import { recallRelevantContext, renderMemoryContext, condenseMemoryContext, reflectOnTurn } from '../memoryContext';

describe('recallRelevantContext', () => {
  beforeEach(() => {
    mockRetrieveRelevantContext.mockReset();
  });

  test('returns [] for an empty query without calling the provider', async () => {
    const result = await recallRelevantContext('   ');
    expect(result).toEqual([]);
    expect(mockRetrieveRelevantContext).not.toHaveBeenCalled();
  });

  test('returns the provider result when the query carries a memory signal', async () => {
    mockRetrieveRelevantContext.mockResolvedValue([{ id: 'r1', summary: 'x' }]);
    const result = await recallRelevantContext('What did we decide about the project database last time?');
    expect(result).toEqual([{ id: 'r1', summary: 'x' }]);
    expect(mockRetrieveRelevantContext).toHaveBeenCalled();
  });

  test('returns [] when the provider throws (never breaks the conversation)', async () => {
    mockRetrieveRelevantContext.mockRejectedValue(new Error('unreachable'));
    const result = await recallRelevantContext('Remind me what I decided about the deployment');
    expect(result).toEqual([]);
  });

  test('returns [] when the provider times out (never breaks the conversation)', async () => {
    mockRetrieveRelevantContext.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    const result = await recallRelevantContext('Remind me what I decided about the deployment');
    expect(result).toEqual([]);
  });

  test('skips the provider call for a trivial (filler) query', async () => {
    const result = await recallRelevantContext('thanks');
    expect(result).toEqual([]);
    expect(mockRetrieveRelevantContext).not.toHaveBeenCalled();
  });

  test('skips the provider call for a substantive query with no memory signal — memory is not automatic', async () => {
    const result = await recallRelevantContext('What theme should I use tonight?');
    expect(result).toEqual([]);
    expect(mockRetrieveRelevantContext).not.toHaveBeenCalled();
  });
});

describe('condenseMemoryContext', () => {
  test('returns [] for no reflections', () => {
    expect(condenseMemoryContext([])).toEqual([]);
    expect(condenseMemoryContext(undefined)).toEqual([]);
  });

  test('formats each reflection as a compact bullet', () => {
    const lines = condenseMemoryContext([
      { id: 'r1', summary: 'PostgreSQL is used for the project database.' },
      { id: 'r2', summary: 'Docker is used for local deployment.' },
    ]);
    expect(lines).toEqual([
      '- PostgreSQL is used for the project database.',
      '- Docker is used for local deployment.',
    ]);
  });

  test('never surfaces raw provider fields — only the summary text crosses the boundary', () => {
    const lines = condenseMemoryContext([
      {
        id: 'r1',
        summary: 'The database container is named db-local.',
        domain: 'context',
        confidence: 0.9,
        created_at: '2026-08-12T00:00:00Z',
        provenance: { source_message_id: 'm42', conversation_id: 'c1', observed_at: '2026-08-12T00:00:00Z' },
      },
    ]);
    const serialized = lines.join('\n');
    expect(serialized).not.toMatch(/r1|m42|c1|context|2026-08-12|\{|\}/);
    expect(serialized).toContain('The database container is named db-local.');
  });

  test('collapses whitespace and trims each summary', () => {
    const lines = condenseMemoryContext([{ id: 'r1', summary: '  has   \n  extra   whitespace  ' }]);
    expect(lines).toEqual(['- has extra whitespace']);
  });

  test('drops reflections with no summary', () => {
    expect(condenseMemoryContext([{ id: 'r1' }, { id: 'r2', summary: '' }])).toEqual([]);
  });

  test('tags a low-confidence reflection as uncertain instead of stating it as fact', () => {
    const lines = condenseMemoryContext([{ id: 'r1', summary: 'Bo prefers async updates.', confidence: 0.3 }]);
    expect(lines).toEqual(['- Bo prefers async updates. (uncertain)']);
  });

  test('does not tag a high-confidence reflection as uncertain', () => {
    const lines = condenseMemoryContext([{ id: 'r1', summary: 'Bo prefers async updates.', confidence: 0.95 }]);
    expect(lines).toEqual(['- Bo prefers async updates.']);
  });

  test('leaves confidence-less reflections untagged (no confidence is not the same as low confidence)', () => {
    const lines = condenseMemoryContext([{ id: 'r1', summary: 'Bo prefers async updates.' }]);
    expect(lines).toEqual(['- Bo prefers async updates.']);
  });

  test('keeps conflicting memories distinguishable rather than merging them', () => {
    const lines = condenseMemoryContext([
      { id: 'r1', summary: 'The project uses PostgreSQL.', confidence: 0.9 },
      { id: 'r2', summary: 'The project uses MySQL.', confidence: 0.4 },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines).toContain('- The project uses PostgreSQL.');
    expect(lines).toContain('- The project uses MySQL. (uncertain)');
  });

  test('deduplicates exact-duplicate lines', () => {
    const lines = condenseMemoryContext([
      { id: 'r1', summary: 'Bo prefers dark mode.' },
      { id: 'r2', summary: 'Bo prefers dark mode.' },
    ]);
    expect(lines).toEqual(['- Bo prefers dark mode.']);
  });

  test('caps the number of lines to keep the context compact', () => {
    const reflections = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, summary: `Distinct memory number ${i}.` }));
    const lines = condenseMemoryContext(reflections);
    expect(lines.length).toBeLessThan(10);
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('renderMemoryContext', () => {
  test('returns null for no reflections', () => {
    expect(renderMemoryContext([])).toBeNull();
    expect(renderMemoryContext(undefined)).toBeNull();
  });

  test('returns null when reflections have no summary', () => {
    expect(renderMemoryContext([{ id: 'r1' }])).toBeNull();
  });

  test('renders a system-prompt block with each summary as a bullet', () => {
    const block = renderMemoryContext([
      { id: 'r1', summary: 'Bo prefers dark mode' },
      { id: 'r2', summary: 'Bo works late at night' },
    ]);
    expect(block).toContain('- Bo prefers dark mode');
    expect(block).toContain('- Bo works late at night');
    expect(block).toContain('long-term memory');
  });

  test('never injects raw JSON into the rendered block', () => {
    const block = renderMemoryContext([
      { id: 'r1', summary: 'The database container is named db-local.', domain: 'context', confidence: 0.9, provenance: { source_message_id: 'm42' } },
    ]);
    expect(block).not.toMatch(/[{}]/);
    expect(block).not.toContain('m42');
  });
});

describe('reflectOnTurn', () => {
  beforeEach(() => {
    mockStoreReflection.mockReset();
    mockStoreReflection.mockResolvedValue({ operationId: 'op-1' });
  });

  test('does nothing when userText or assistantText is missing', () => {
    reflectOnTurn({ conversationId: 'c1', userText: '', assistantText: 'hi', assistantMessageId: 'm1' });
    reflectOnTurn({ conversationId: 'c1', userText: 'hi', assistantText: '', assistantMessageId: 'm1' });
    expect(mockStoreReflection).not.toHaveBeenCalled();
  });

  test('stores a reflection combining both sides of the turn with provenance', () => {
    reflectOnTurn({
      conversationId: 'c1',
      userText: 'What theme should I use tonight?',
      assistantText: 'Dark mode suits how you described the room.',
      assistantMessageId: 'm1',
    });

    expect(mockStoreReflection).toHaveBeenCalledTimes(1);
    const [reflection] = mockStoreReflection.mock.calls[0];
    expect(reflection.domain).toBe('context');
    expect(reflection.summary).toContain('What theme should I use tonight?');
    expect(reflection.summary).toContain('Dark mode suits how you described the room.');
    expect(reflection.provenance).toMatchObject({ conversation_id: 'c1', source_message_id: 'm1' });
  });

  test('skips storing when the whole exchange is trivial', () => {
    reflectOnTurn({ conversationId: 'c1', userText: 'thanks', assistantText: "you're welcome", assistantMessageId: 'm1' });
    expect(mockStoreReflection).not.toHaveBeenCalled();
  });

  test('does not throw when the provider rejects (fire-and-forget)', async () => {
    mockStoreReflection.mockRejectedValue(new Error('unreachable'));
    expect(() => reflectOnTurn({
      conversationId: 'c1',
      userText: 'I always work better after midnight',
      assistantText: "Good to know, I'll keep that in mind.",
      assistantMessageId: 'm1',
    })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockStoreReflection).toHaveBeenCalledTimes(1);
  });
});
