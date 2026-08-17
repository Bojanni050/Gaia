'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHermesClient } = require('../src/hermesClient');
const { loadSoul, parseVersion } = require('../src/soul');

test('hermesClient posts to /chat/completions and extracts the reply', async () => {
  let captured;
  const client = createHermesClient({
    baseUrl: 'http://hermes.internal:8642/v1/',
    model: 'some-model',
    authToken: 'secret',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'the reply' } }] }),
      };
    },
  });

  const reply = await client.chat([{ role: 'user', content: 'hi' }]);

  assert.equal(reply, 'the reply');
  assert.equal(captured.url, 'http://hermes.internal:8642/v1/chat/completions');
  assert.equal(captured.init.headers.Authorization, 'Bearer secret');
  const body = JSON.parse(captured.init.body);
  assert.equal(body.model, 'some-model');
  assert.equal(body.stream, false);
  assert.deepEqual(body.messages, [{ role: 'user', content: 'hi' }]);
});

test('hermesClient throws on non-ok and on missing content', async () => {
  const failing = createHermesClient({
    baseUrl: 'http://x/v1',
    model: 'm',
    fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
  });
  await assert.rejects(() => failing.chat([{ role: 'user', content: 'hi' }]));

  const empty = createHermesClient({
    baseUrl: 'http://x/v1',
    model: 'm',
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [] }) }),
  });
  await assert.rejects(() => empty.chat([{ role: 'user', content: 'hi' }]));
});

test('hermesClient refuses to construct without a base URL', () => {
  assert.throws(() => createHermesClient({ baseUrl: '', model: 'm' }));
});

test('soul loader reads SOUL_PATH and refuses to start empty or missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-soul-'));
  const soulPath = path.join(dir, 'soul.md');

  fs.writeFileSync(soulPath, '# SOUL\n\nYou are Gaia.\n');
  const previous = process.env.SOUL_PATH;
  process.env.SOUL_PATH = soulPath;
  try {
    const soul = loadSoul();
    assert.equal(soul.prompt, '# SOUL\n\nYou are Gaia.');
    assert.equal(soul.version, 'unknown');
    fs.writeFileSync(soulPath, '   ');
    assert.throws(() => loadSoul(), /empty/i);
    // A missing SOUL_PATH falls through to the next candidate (the repo's
    // canonical soul.md in dev, /app/soul.md in a container) — resolving
    // is correct; only "no candidate exists at all" is a startup failure.
    process.env.SOUL_PATH = path.join(dir, 'missing.md');
    assert.ok(loadSoul().prompt.length > 0);
  } finally {
    if (previous === undefined) delete process.env.SOUL_PATH;
    else process.env.SOUL_PATH = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('soul version is parsed from the front-matter', () => {
  const content = [
    '---',
    'title: Gaia — SOUL',
    'version: 1.1.0',
    '---',
    '',
    '# Gaia — SOUL',
  ].join('\n');
  assert.equal(parseVersion(content), '1.1.0');
  assert.equal(parseVersion('# no front-matter'), 'unknown');
});
