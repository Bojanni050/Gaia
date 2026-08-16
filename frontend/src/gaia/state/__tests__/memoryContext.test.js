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
    const result = await recallRelevantContext('what does Bo prefer');
    expect(result).toEqual([{ id: 'r1', summary: 'x' }]);
  });

  test('returns [] when the provider throws (never breaks the conversation)', async () => {
    mockRetrieveRelevantContext.mockRejectedValue(new Error('unreachable'));
    const result = await recallRelevantContext('anything');
    expect(result).toEqual([]);
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
      conversationId: 'c1', userText: 'What theme?', assistantText: 'Dark mode.', assistantMessageId: 'm1',
    });

    expect(mockStoreReflection).toHaveBeenCalledTimes(1);
    const [reflection] = mockStoreReflection.mock.calls[0];
    expect(reflection.domain).toBe('context');
    expect(reflection.summary).toContain('What theme?');
    expect(reflection.summary).toContain('Dark mode.');
    expect(reflection.provenance).toMatchObject({ conversation_id: 'c1', source_message_id: 'm1' });
  });

  test('does not throw when the provider rejects (fire-and-forget)', async () => {
    mockStoreReflection.mockRejectedValue(new Error('unreachable'));
    expect(() => reflectOnTurn({
      conversationId: 'c1', userText: 'x', assistantText: 'y', assistantMessageId: 'm1',
    })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});
