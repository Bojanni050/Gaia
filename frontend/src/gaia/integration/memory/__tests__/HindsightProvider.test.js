/**
 * Tests for HindsightProvider.
 *
 * We mock global fetch to drive the provider through realistic Hindsight
 * API shapes without depending on a running server. The provider is the
 * seam between Gaia and her Hindsight instance; these tests pin its
 * external behavior.
 *
 * @jest-environment node
 */
import { HindsightProvider } from '../HindsightProvider';
import { MemoryUnavailableError, MemoryNotFoundError } from '../errors';

function jsonResponse(obj, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => obj,
  };
}

describe('HindsightProvider', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('configuration', () => {
    test('uses sensible defaults when no config is provided', () => {
      const p = new HindsightProvider();
      expect(p.baseUrl).toBe('http://100.64.144.93:8888');
      expect(p.bankId).toBe('gaia');
      expect(p.apiKey).toBe('');
    });

    test('honors explicit configuration', () => {
      const p = new HindsightProvider({ baseUrl: 'http://h:8888/', bankId: 'test-bank', apiKey: 'sk-x' });
      expect(p.baseUrl).toBe('http://h:8888');
      expect(p.bankId).toBe('test-bank');
      expect(p.apiKey).toBe('sk-x');
    });

    test('emits Authorization header when apiKey is set', async () => {
      let captured;
      global.fetch = jest.fn(async (url, init) => {
        captured = { url, init };
        return jsonResponse({ ok: true });
      });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888', bankId: 'gaia', apiKey: 'sk-x' });
      await p.health();
      expect(captured.init.headers.Authorization).toBe('Bearer sk-x');
    });
  });

  describe('health()', () => {
    test('returns ok when /health answers 200', async () => {
      global.fetch = jest.fn(async () => ({ ok: true, status: 200 }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      expect(await p.health()).toEqual({ ok: true });
    });

    test('returns not-ok on a non-2xx response', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      expect((await p.health()).ok).toBe(false);
    });

    test('returns not-ok when fetch throws (provider unreachable)', async () => {
      global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED'); });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      expect((await p.health()).ok).toBe(false);
    });
  });

  describe('storeReflection()', () => {
    test('retains asynchronously and returns the operation id', async () => {
      let captured;
      global.fetch = jest.fn(async (url, init) => {
        captured = { url, body: JSON.parse(init.body) };
        return jsonResponse({ success: true, operation_id: 'op-1' });
      });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888', bankId: 'gaia' });

      const result = await p.storeReflection({
        domain: 'preferences',
        summary: 'Bo prefers dark mode',
        provenance: { conversation_id: 'c1', source_message_id: 'm1', observed_at: '2026-08-15T00:00:00Z' },
      });

      expect(captured.url).toBe('http://h:8888/v1/default/banks/gaia/memories');
      expect(captured.body.async).toBe(true);
      expect(captured.body.items[0]).toMatchObject({
        content: 'Bo prefers dark mode',
        context: 'preferences',
        document_id: 'c1',
        timestamp: '2026-08-15T00:00:00Z',
        metadata: { source_message_id: 'm1' },
        tags: ['preferences'],
      });
      expect(result).toEqual({ operationId: 'op-1' });
    });

    test('throws MemoryUnavailableError when retain fails', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 500 }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await expect(p.storeReflection({ summary: 'x' })).rejects.toBeInstanceOf(MemoryUnavailableError);
    });

    test('throws MemoryUnavailableError on network failure', async () => {
      global.fetch = jest.fn(async () => { throw new Error('down'); });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await expect(p.storeReflection({ summary: 'x' })).rejects.toBeInstanceOf(MemoryUnavailableError);
    });
  });

  describe('retrieveRelevantContext()', () => {
    test('maps recall results into Reflection shape', async () => {
      global.fetch = jest.fn(async () => jsonResponse({
        results: [{
          id: 'mem-1',
          text: 'Bo prefers dark mode',
          context: 'preferences',
          document_id: 'c1',
          occurred_start: '2026-08-15T00:00:00Z',
          mentioned_at: '2026-08-15T00:00:01Z',
          metadata: { source_message_id: 'm1' },
          scores: { final: 0.87 },
        }],
      }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888', bankId: 'gaia' });

      const reflections = await p.retrieveRelevantContext('dark mode');

      expect(reflections).toEqual([{
        id: 'mem-1',
        domain: 'preferences',
        summary: 'Bo prefers dark mode',
        provenance: {
          source_message_id: 'm1',
          conversation_id: 'c1',
          observed_at: '2026-08-15T00:00:00Z',
        },
        confidence: 0.87,
        created_at: '2026-08-15T00:00:01Z',
      }]);
    });

    test('returns an empty array when there are no results', async () => {
      global.fetch = jest.fn(async () => jsonResponse({ results: [] }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      expect(await p.retrieveRelevantContext('anything')).toEqual([]);
    });

    test('throws MemoryUnavailableError when recall fails', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 500 }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await expect(p.retrieveRelevantContext('x')).rejects.toBeInstanceOf(MemoryUnavailableError);
    });
  });

  describe('listProvenance()', () => {
    test('returns the raw history payload', async () => {
      const history = [{ event: 'created', at: '2026-08-15T00:00:00Z' }];
      global.fetch = jest.fn(async () => jsonResponse(history));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888', bankId: 'gaia' });
      expect(await p.listProvenance('mem-1')).toEqual(history);
    });

    test('throws MemoryNotFoundError on 404', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 404 }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await expect(p.listProvenance('missing')).rejects.toBeInstanceOf(MemoryNotFoundError);
    });
  });

  describe('editMemory()', () => {
    test('sends only the provided fields as a PATCH', async () => {
      let captured;
      global.fetch = jest.fn(async (url, init) => {
        captured = { url, method: init.method, body: JSON.parse(init.body) };
        return jsonResponse({});
      });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888', bankId: 'gaia' });

      await p.editMemory('mem-1', { summary: 'corrected text' });

      expect(captured.url).toBe('http://h:8888/v1/default/banks/gaia/memories/mem-1');
      expect(captured.method).toBe('PATCH');
      expect(captured.body).toEqual({ text: 'corrected text' });
    });

    test('throws MemoryNotFoundError on 404', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 404 }));
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await expect(p.editMemory('missing', { summary: 'x' })).rejects.toBeInstanceOf(MemoryNotFoundError);
    });
  });

  describe('forget()', () => {
    test('invalidates the memory with a reason', async () => {
      let captured;
      global.fetch = jest.fn(async (url, init) => {
        captured = { url, method: init.method, body: JSON.parse(init.body) };
        return jsonResponse({});
      });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888', bankId: 'gaia' });

      await p.forget('mem-1', { reason: 'no longer accurate' });

      expect(captured.body).toEqual({ state: 'invalidated', reason: 'no longer accurate' });
    });

    test('defaults the reason when none is given', async () => {
      let captured;
      global.fetch = jest.fn(async (url, init) => {
        captured = { body: JSON.parse(init.body) };
        return jsonResponse({});
      });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await p.forget('mem-1');
      expect(captured.body.state).toBe('invalidated');
      expect(captured.body.reason).toBe('forgotten');
    });

    test('throws MemoryUnavailableError on network failure', async () => {
      global.fetch = jest.fn(async () => { throw new Error('down'); });
      const p = new HindsightProvider({ baseUrl: 'http://h:8888' });
      await expect(p.forget('mem-1')).rejects.toBeInstanceOf(MemoryUnavailableError);
    });
  });
});
