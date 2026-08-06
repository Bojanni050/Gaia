import { ReasoningProvider } from './ReasoningProvider';
import { ReasoningUnavailableError, ReasoningAbortedError } from './errors';

/**
 * HermesProvider — talks to a local OpenAI-compatible Hermes API.
 *
 * Default URL targets an Ollama-shaped local server (the most common
 * OpenAI-compatible stack). Override with REACT_APP_HERMES_URL.
 *
 * The provider speaks plain reasoning: messages in, text deltas out.
 * Presence, persona, and error phrasing are applied by the desktop.
 */
export class HermesProvider extends ReasoningProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = (config.baseUrl || process.env.REACT_APP_REASON_ENGINE_URL || 'http://localhost:11434/v1')
      .replace(/\/+$/, '');
    this.model = config.model || process.env.REACT_APP_REASON_ENGINE_MODEL || 'llama3';
    this.apiKey = config.apiKey || process.env.REACT_APP_REASON_ENGINE_API_KEY || '';
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this._headers(),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return { ok: false, detail: `models endpoint ${res.status}` };
      return { ok: true };
    } catch (_) {
      return { ok: false, detail: 'cannot reach reason engine' };
    }
  }

  async stream(messages, { signal, onDelta } = {}) {
    let res;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({ model: this.model, messages, stream: true }),
        signal,
      });
    } catch (_) {
      throw new ReasoningUnavailableError();
    }

    if (!res.ok || !res.body) {
      throw new ReasoningUnavailableError(`chat/completions ${res.status}`);
    }

    return this._readSse(res.body, signal, onDelta);
  }

  async chat(messages, { signal } = {}) {
    let res;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({ model: this.model, messages, stream: false }),
        signal,
      });
    } catch (_) {
      throw new ReasoningUnavailableError();
    }

    if (!res.ok) {
      throw new ReasoningUnavailableError(`chat/completions ${res.status}`);
    }

    let data;
    try { data = await res.json(); } catch (_) {
      throw new ReasoningUnavailableError('invalid response body');
    }
    return data?.choices?.[0]?.message?.content ?? '';
  }

  // --- SSE ---------------------------------------------------------------

  async _readSse(body, signal, onDelta) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    const onAbort = () => {
      try { reader.cancel(); } catch (_) { /* noop */ }
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let sep;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const delta = parseSseFrame(frame);
          if (delta) {
            fullText += delta;
            if (onDelta) onDelta(delta);
          }
        }
      }
    } catch (e) {
      if (signal?.aborted) throw new ReasoningAbortedError();
      throw new ReasoningUnavailableError();
    } finally {
      if (signal) signal.removeEventListener('abort', onAbort);
    }

    if (signal?.aborted) throw new ReasoningAbortedError();
    return fullText;
  }
}

function parseSseFrame(frame) {
  const lines = frame.split('\n');
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return null;
    try {
      const obj = JSON.parse(payload);
      const content = obj?.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) return content;
    } catch (_) { /* malformed frame, skip */ }
  }
  return null;
}
