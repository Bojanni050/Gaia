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

describe('useConversation hook', () => {
  beforeEach(() => {
    mockHealth.mockClear();
    mockStream.mockClear();
    
    // Set default implementations in case they were changed
    mockHealth.mockImplementation(() => Promise.resolve({ ok: true }));
    mockStream.mockImplementation((transcript, { onDelta }) => {
      if (onDelta) onDelta('Mocked response');
      return Promise.resolve('Mocked response');
    });
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
});
