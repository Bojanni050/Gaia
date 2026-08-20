'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDecisionStore } = require('../src/logos/decisionStore');

function tempStore(now) {
  const decisionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-decisions-'));
  return createDecisionStore({ decisionsDir, now });
}

test('append writes a JSONL line that list() reads back', () => {
  const store = tempStore();
  store.append({ kind: 'intentiq.decision', intent: 'inform.explain' });
  const results = store.list();
  assert.equal(results.length, 1);
  assert.equal(results[0].intent, 'inform.explain');
});

test('list() returns newest-first within a day', () => {
  const store = tempStore();
  store.append({ kind: 'intentiq.decision', intent: 'first' });
  store.append({ kind: 'intentiq.decision', intent: 'second' });
  store.append({ kind: 'intentiq.decision', intent: 'third' });
  const results = store.list();
  assert.deepEqual(results.map((r) => r.intent), ['third', 'second', 'first']);
});

test('list() respects limit', () => {
  const store = tempStore();
  for (let i = 0; i < 5; i += 1) store.append({ kind: 'intentiq.decision', intent: `n${i}` });
  assert.equal(store.list({ limit: 2 }).length, 2);
});

test('list() filters by kind', () => {
  const store = tempStore();
  store.append({ kind: 'intentiq.decision', intent: 'x' });
  store.append({ kind: 'reasoniq.result', reasoningDepth: 'shallow' });
  const intents = store.list({ kind: 'intentiq.decision' });
  assert.equal(intents.length, 1);
  assert.equal(intents[0].kind, 'intentiq.decision');
});

test('list() spans multiple day-files, newest day first', () => {
  let clock = new Date('2026-08-18T12:00:00Z');
  const store = tempStore(() => clock);
  store.append({ kind: 'intentiq.decision', intent: 'yesterday' });
  clock = new Date('2026-08-19T12:00:00Z');
  store.append({ kind: 'intentiq.decision', intent: 'today' });
  const results = store.list();
  assert.deepEqual(results.map((r) => r.intent), ['today', 'yesterday']);
});

test('list() returns [] when the directory has never been written to', () => {
  const decisionsDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-decisions-')), 'never-created');
  const store = createDecisionStore({ decisionsDir });
  assert.deepEqual(store.list(), []);
});

test('list() skips a malformed line instead of failing the whole read', () => {
  const decisionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-decisions-'));
  const store = createDecisionStore({ decisionsDir, now: () => new Date('2026-08-19T00:00:00Z') });
  store.append({ kind: 'intentiq.decision', intent: 'valid' });
  fs.appendFileSync(path.join(decisionsDir, '2026-08-19.jsonl'), 'not json at all\n', 'utf-8');
  const results = store.list();
  assert.equal(results.length, 1);
  assert.equal(results[0].intent, 'valid');
});

test('append never throws even when the directory cannot be created', () => {
  // A file (not a directory) at the target path makes mkdirSync fail.
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-decisions-'));
  const blocked = path.join(parent, 'blocked');
  fs.writeFileSync(blocked, 'not a directory', 'utf-8');
  const store = createDecisionStore({ decisionsDir: blocked });
  assert.doesNotThrow(() => {
    const ok = store.append({ kind: 'intentiq.decision' });
    assert.equal(ok, false);
  });
});
