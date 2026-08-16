const mockRetrieveRelevantContext = jest.fn();
const mockStoreReflection = jest.fn();

jest.mock('../../integration/memory', () => ({
  getMemoryProvider: () => ({
    retrieveRelevantContext: mockRetrieveRelevantContext,
    storeReflection: mockStoreReflection,
  }),
}));

// eslint-disable-next-line import/first
import { recallRelevantContext, renderMemoryContext, reflectOnTurn } from '../memoryContext';

describe('recallRelevantContext', () => {
  beforeEach(() => {
    mockRetrieveRelevantContext.mockReset();
  });

  test('returns [] for an empty query without calling the provider', async () => {
    const result = await recallRelevantContext('   ');
    expect(result).toEqual([]);
    expect(mockRetrieveRelevantContext).not.toHaveBeenCalled();
  });

  test('returns the provider result on success', async () => {
    mockRetrieveRelevantContext.mockResolvedValue([{ id: 'r1', summary: 'x' }]);
    const result = await recallRelevantContext('what does Bo prefer for a theme');
    expect(result).toEqual([{ id: 'r1', summary: 'x' }]);
  });

  test('returns [] when the provider throws (never breaks the conversation)', async () => {
    mockRetrieveRelevantContext.mockRejectedValue(new Error('unreachable'));
    const result = await recallRelevantContext('anything relevant to tonight');
    expect(result).toEqual([]);
  });

  test('skips the provider call for a trivial (filler) query', async () => {
    const result = await recallRelevantContext('thanks');
    expect(result).toEqual([]);
    expect(mockRetrieveRelevantContext).not.toHaveBeenCalled();
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
