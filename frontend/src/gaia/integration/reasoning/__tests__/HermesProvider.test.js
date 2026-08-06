/**
 * Tests for HermesProvider.
 *
 * We mock global fetch to drive the provider through realistic SSE shapes
 * without depending on a running server. The provider is the seam between
 * Gaia and whatever OpenAI-shaped server answers; these tests pin its
 * external behavior.
 *
 * @jest-environment node
 */
import { ReadableStream } from 'node:stream/web';
import { HermesProvider } from '../HermesProvider';
import {
  ReasoningUnavailableError,
  ReasoningAbortedError,
} from '../errors';

function makeSseResponse(chunks) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return { ok: true, status: 200, body };
}

function makeErrorResponse(status) {
  return { ok: false, status, body: null };
}

function jsonResponse(obj) {
  return {
    ok: true,
    status: 200,
    json: async () => obj,
  };
}

describe('HermesProvider', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('configuration', () => {
    test('uses sensible defaults when no config is provided', () => {
      const p = new HermesProvider();
      expect(p.baseUrl).toBe('http://localhost:11434/v1');
      expect(p.model).toBe('llama3');
      expect(p.apiKey).toBe('');
    });

    test('honors explicit configuration', () => {
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1/', model: 'qwen', apiKey: 'sk-x' });
      expect(p.baseUrl).toBe('http://h:9000/v1');
      expect(p.model).toBe('qwen');
      expect(p.apiKey).toBe('sk-x');
    });

    test('emits Authorization header when apiKey is set', async () => {
      let captured;
      global.fetch = jest.fn(async (url, init) => {
        captured = { url, init };
        return makeErrorResponse(500);
      });
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'qwen', apiKey: 'sk-x' });
      try { await p.stream([{ role: 'user', content: 'hi' }]); } catch (_) { /* expected */ }
      expect(captured.init.headers.Authorization).toBe('Bearer sk-x');
    });
  });

  describe('health()', () => {
    test('returns ok when /models answers 200', async () => {
      global.fetch = jest.fn(async () => ({ ok: true, status: 200 }));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });
      const result = await p.health();
      expect(result).toEqual({ ok: true });
    });

    test('returns not-ok when /models returns a non-2xx', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });
      const result = await p.health();
      expect(result.ok).toBe(false);
    });

    test('returns not-ok when fetch throws (provider unreachable)', async () => {
      global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED'); });
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });
      const result = await p.health();
      expect(result.ok).toBe(false);
    });
  });

  describe('stream()', () => {
    test('assembles text from SSE deltas and returns the full text', async () => {
      const sse = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":", world"}}]}\n\n',
        'data: [DONE]\n\n',
      ].join('');
      global.fetch = jest.fn(async () => makeSseResponse([sse]));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });

      const onDelta = jest.fn();
      const full = await p.stream([{ role: 'user', content: 'hi' }], { onDelta });

      expect(full).toBe('Hello, world');
      expect(onDelta).toHaveBeenCalledTimes(2);
      expect(onDelta).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onDelta).toHaveBeenNthCalledWith(2, ', world');
    });

    test('assembles text from SSE deltas using carriage return CRLF line endings', async () => {
      const sse = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\r\n\r\n',
        'data: {"choices":[{"delta":{"content":", world"}}]}\r\n\r\n',
        'data: [DONE]\r\n\r\n',
      ].join('');
      global.fetch = jest.fn(async () => makeSseResponse([sse]));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });

      const onDelta = jest.fn();
      const full = await p.stream([{ role: 'user', content: 'hi' }], { onDelta });

      expect(full).toBe('Hello, world');
      expect(onDelta).toHaveBeenCalledTimes(2);
      expect(onDelta).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onDelta).toHaveBeenNthCalledWith(2, ', world');
    });

    test('assembles reasoning content from SSE deltas and passes to onDelta with isReasoning = true', async () => {
      const sse = [
        'data: {"choices":[{"delta":{"reasoning_content":"Thinking"}}]}\n\n',
        'data: {"choices":[{"delta":{"reasoning_content":" about math"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Result is 4"}}]}\n\n',
        'data: [DONE]\n\n',
      ].join('');
      global.fetch = jest.fn(async () => makeSseResponse([sse]));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });

      const onDelta = jest.fn();
      const full = await p.stream([{ role: 'user', content: 'hi' }], { onDelta });

      expect(full).toBe('Result is 4');
      expect(onDelta).toHaveBeenCalledTimes(3);
      expect(onDelta).toHaveBeenNthCalledWith(1, 'Thinking', true);
      expect(onDelta).toHaveBeenNthCalledWith(2, ' about math', true);
      expect(onDelta).toHaveBeenNthCalledWith(3, 'Result is 4');
    });

    test('ignores malformed SSE frames without throwing', async () => {
      const sse = [
        'data: {"choices":[{"delta":{"content":"A"}}]}\n\n',
        'data: not-json\n\n',
        'data: {"choices":[{"delta":{"content":"B"}}]}\n\n',
        'data: [DONE]\n\n',
      ].join('');
      global.fetch = jest.fn(async () => makeSseResponse([sse]));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });

      const full = await p.stream([{ role: 'user', content: 'hi' }]);
      expect(full).toBe('AB');
    });

    test('throws ReasoningUnavailableError when fetch rejects', async () => {
      global.fetch = jest.fn(async () => { throw new Error('network down'); });
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });

      await expect(p.stream([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(ReasoningUnavailableError);
    });

    test('throws ReasoningUnavailableError when server returns non-2xx', async () => {
      global.fetch = jest.fn(async () => makeErrorResponse(500));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });

      await expect(p.stream([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(ReasoningUnavailableError);
    });

    test('throws ReasoningAbortedError when the signal aborts mid-stream', async () => {
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"A"}}]}\n\n'));
        },
        pull(controller) {
          // Never give another chunk — the reader will block here until abort.
          return new Promise(() => {});
        },
      });
      global.fetch = jest.fn(async () => ({ ok: true, status: 200, body }));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30);

      await expect(p.stream([{ role: 'user', content: 'hi' }], { signal: controller.signal })).rejects.toBeInstanceOf(ReasoningAbortedError);
    });

    test('returns the assembled text when there is no [DONE] sentinel', async () => {
      const sse = 'data: {"choices":[{"delta":{"content":"only"}}]}\n\n';
      global.fetch = jest.fn(async () => makeSseResponse([sse]));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });
      const full = await p.stream([{ role: 'user', content: 'hi' }]);
      expect(full).toBe('only');
    });
  });

  describe('chat()', () => {
    test('returns the message content from a non-streaming response', async () => {
      global.fetch = jest.fn(async () => jsonResponse({
        choices: [{ message: { content: 'hi back' } }],
      }));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1', model: 'm' });
      const text = await p.chat([{ role: 'user', content: 'hi' }]);
      expect(text).toBe('hi back');
    });

    test('returns empty string when the response has no content', async () => {
      global.fetch = jest.fn(async () => jsonResponse({ choices: [{}] }));
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });
      const text = await p.chat([{ role: 'user', content: 'hi' }]);
      expect(text).toBe('');
    });

    test('throws ReasoningUnavailableError on network failure', async () => {
      global.fetch = jest.fn(async () => { throw new Error('down'); });
      const p = new HermesProvider({ baseUrl: 'http://h:9000/v1' });
      await expect(p.chat([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(ReasoningUnavailableError);
    });
  });
});
