import { API } from './api';

/**
 * Live implementation of the Hermes contract (see /contracts/hermes.js).
 * Gaia Desktop's only reasoning surface. Streams SSE events.
 */
export const hermes = {
  async createConversation() {
    const res = await fetch(`${API}/hermes/conversations`, { method: 'POST' });
    return res.json();
  },
  async listConversations() {
    const res = await fetch(`${API}/hermes/conversations`);
    return res.json();
  },
  async getConversation(id) {
    const res = await fetch(`${API}/hermes/conversations/${id}`);
    if (!res.ok) throw new Error('conversation not found');
    return res.json();
  },
  async deleteConversation(id) {
    await fetch(`${API}/hermes/conversations/${id}`, { method: 'DELETE' });
  },
  /**
   * @param {string} conversationId
   * @param {import('../../contracts/hermes').HermesStreamRequest} body
   * @param {(e: import('../../contracts/hermes').HermesStreamEvent) => void} onEvent
   * @param {AbortSignal} [signal]
   */
  async stream(conversationId, body, onEvent, signal) {
    const res = await fetch(`${API}/hermes/conversations/${conversationId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) throw new Error('hermes unreachable');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (dataLine) {
          try { onEvent(JSON.parse(dataLine.slice(6))); } catch (_) { /* ignore */ }
        }
      }
    }
  },
};
