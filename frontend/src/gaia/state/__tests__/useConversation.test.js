import { renderHook, act } from '@testing-library/react';
import { useConversation } from '../useConversation';

const mockHealth = jest.fn(() => Promise.resolve({ ok: true }));
const mockStream = jest.fn((transcript, { onDelta }) => {
  if (onDelta) onDelta('Mocked response');
  return Promise.resolve('Mocked response');
});

jest.mock('../../integration/reasoning', () => ({
  getReasoningProvider: () => ({
    health: mockHealth,
    stream: mockStream,
  })
}));

const mockRetrieveRelevantContext = jest.fn(() => Promise.resolve([]));
const mockStoreReflection = jest.fn(() => Promise.resolve({ operationId: 'op-1' }));

jest.mock('../../integration/memory', () => ({
  getMemoryProvider: () => ({
    retrieveRelevantContext: mockRetrieveRelevantContext,
    storeReflection: mockStoreReflection,
  })
}));

describe('useConversation hook', () => {
  beforeEach(() => {
    mockHealth.mockClear();
    mockStream.mockClear();
    mockRetrieveRelevantContext.mockClear();
    mockStoreReflection.mockClear();

    // Set default implementations in case they were changed
    mockHealth.mockImplementation(() => Promise.resolve({ ok: true }));
    mockStream.mockImplementation((transcript, { onDelta }) => {
      if (onDelta) onDelta('Mocked response');
      return Promise.resolve('Mocked response');
    });
    mockRetrieveRelevantContext.mockImplementation(() => Promise.resolve([]));
    mockStoreReflection.mockImplementation(() => Promise.resolve({ operationId: 'op-1' }));
  });

  test('initializes with empty states', () => {
    const { result } = renderHook(() => useConversation());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeId).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  test('creates and selects a conversation', () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('Hello seed');
    });
    expect(result.current.conversations.length).toBe(1);
    expect(result.current.activeId).not.toBeNull();
    expect(result.current.conversations[0].title).toBe('Hello seed');
  });

  test('sends a user message and runs stream', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });
    
    await act(async () => {
      await result.current.send('My first message');
    });

    expect(mockStream).toHaveBeenCalled();
    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('My first message');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Mocked response');
  });

  test('edits a user message and regenerates response', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('Original message');
    });

    const userMessageId = result.current.messages[0].id;

    await act(async () => {
      await result.current.editMessage(userMessageId, 'Edited message');
    });

    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[0].content).toBe('Edited message');
    expect(result.current.messages[1].content).toBe('Mocked response');
  });

  test('deletes a message', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('Delete me');
    });

    const userMessageId = result.current.messages[0].id;
    act(() => {
      result.current.deleteMessage(userMessageId);
    });

    expect(result.current.messages.map(m => m.content)).not.toContain('Delete me');
  });

  test('regenerates assistant response', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('Hi');
    });

    const assistantMsgId = result.current.messages[1].id;
    mockStream.mockClear();

    await act(async () => {
      await result.current.regenerate(assistantMsgId);
    });

    expect(mockStream).toHaveBeenCalled();
    expect(result.current.messages.length).toBe(2);
  });

  test('recalls relevant context before sending and injects it as a system message', async () => {
    mockRetrieveRelevantContext.mockImplementation(() => Promise.resolve([
      { id: 'r1', domain: 'preferences', summary: 'Bo prefers dark mode', confidence: 0.9 },
    ]));
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('What theme should I use?');
    });

    expect(mockRetrieveRelevantContext).toHaveBeenCalledWith('What theme should I use?', expect.any(Object));
    const transcript = mockStream.mock.calls[0][0];
    const memoryMessage = transcript.find((m) => m.role === 'system' && m.content.includes('Bo prefers dark mode'));
    expect(memoryMessage).toBeDefined();
  });

  test('does not add a memory system message when recall returns nothing', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('Hello');
    });

    const transcript = mockStream.mock.calls[0][0];
    const systemMessages = transcript.filter((m) => m.role === 'system');
    expect(systemMessages.length).toBe(1); // identity prompt only
  });

  test('reflects on the turn after a successful response', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('Remember this');
    });
    // reflectOnTurn is fire-and-forget; flush the microtask queue.
    await act(async () => { await Promise.resolve(); });

    expect(mockStoreReflection).toHaveBeenCalledTimes(1);
    const [reflection] = mockStoreReflection.mock.calls[0];
    expect(reflection.summary).toContain('Remember this');
    expect(reflection.summary).toContain('Mocked response');
  });

  test('does not reflect when the stream fails', async () => {
    mockStream.mockImplementation(() => Promise.reject(new Error('down')));
    const { result } = renderHook(() => useConversation());
    act(() => {
      result.current.newConversation('seed');
    });

    await act(async () => {
      await result.current.send('This will fail');
    });
    await act(async () => { await Promise.resolve(); });

    expect(mockStoreReflection).not.toHaveBeenCalled();
  });
});
