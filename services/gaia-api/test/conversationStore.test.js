'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createConversationStore,
  isValidId,
  deriveTitle,
  InvalidConversationIdError,
  ConversationNotFoundError,
} = require('../src/conversationStore');

function tempStore() {
  const historyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-history-'));
  return createConversationStore({ historyDir });
}

// --- isValidId (path-traversal defense) -----------------------------------

test('isValidId accepts plain alphanumeric/dash/underscore ids', () => {
  assert.equal(isValidId('1755-1'), true);
  assert.equal(isValidId('a_b-C9'), true);
});

test('isValidId rejects anything that could touch the filesystem outside its own directory', () => {
  assert.equal(isValidId('../escape'), false);
  assert.equal(isValidId('a/b'), false);
  assert.equal(isValidId('a\\b'), false);
  assert.equal(isValidId(''), false);
  assert.equal(isValidId(null), false);
  assert.equal(isValidId(42), false);
  assert.equal(isValidId('x'.repeat(200)), false);
});

// --- deriveTitle ------------------------------------------------------------

test('deriveTitle uses the first user message, trimmed and collapsed', () => {
  assert.equal(deriveTitle([{ role: 'user', content: '  hello   there  ' }]), 'hello there');
});

test('deriveTitle truncates long titles', () => {
  const long = 'x'.repeat(100);
  const title = deriveTitle([{ role: 'user', content: long }]);
  assert.ok(title.length < long.length);
  assert.ok(title.endsWith('…'));
});

test('deriveTitle falls back to "Untitled" with no user message', () => {
  assert.equal(deriveTitle([]), 'Untitled');
  assert.equal(deriveTitle([{ role: 'assistant', content: 'hi' }]), 'Untitled');
});

// --- saveConversation / getConversation / listConversations / deleteConversation --

test('saveConversation rejects an invalid id', () => {
  const store = tempStore();
  assert.throws(() => store.saveConversation('../escape', [{ role: 'user', content: 'hi' }]), InvalidConversationIdError);
});

test('saveConversation with an empty message array is a no-op', () => {
  const store = tempStore();
  store.saveConversation('conv-1', []);
  assert.deepEqual(store.listConversations(), []);
});

test('saveConversation then getConversation round-trips the transcript and derives a title', () => {
  const store = tempStore();
  const messages = [
    { role: 'user', content: 'Why is my website crashing?' },
    { role: 'assistant', content: 'Let\'s look at the logs.' },
  ];
  store.saveConversation('conv-1', messages);

  const { meta, messages: read } = store.getConversation('conv-1');
  assert.equal(meta.id, 'conv-1');
  assert.equal(meta.title, 'Why is my website crashing?');
  assert.equal(meta.messageCount, 2);
  assert.ok(meta.createdAt);
  assert.ok(meta.updatedAt);
  assert.deepEqual(read, messages);
});

test('saveConversation strips any extra client-side fields down to role/content', () => {
  const store = tempStore();
  store.saveConversation('conv-1', [{ id: 'local-1', role: 'user', content: 'hi', failed: false }]);
  const { messages } = store.getConversation('conv-1');
  assert.deepEqual(Object.keys(messages[0]), ['role', 'content']);
});

test('saveConversation called again overwrites messages and keeps the original title/createdAt', () => {
  const store = tempStore();
  store.saveConversation('conv-1', [{ role: 'user', content: 'first message here' }]);
  const first = store.getConversation('conv-1').meta;

  store.saveConversation('conv-1', [
    { role: 'user', content: 'first message here' },
    { role: 'assistant', content: 'reply' },
    { role: 'user', content: 'a follow-up' },
  ]);
  const second = store.getConversation('conv-1').meta;

  assert.equal(second.title, first.title);
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.messageCount, 3);
  assert.ok(second.updatedAt >= first.updatedAt);
});

test('getConversation throws ConversationNotFoundError for an unknown id', () => {
  const store = tempStore();
  assert.throws(() => store.getConversation('does-not-exist'), ConversationNotFoundError);
});

test('getConversation throws InvalidConversationIdError for a malformed id, without touching the filesystem', () => {
  const store = tempStore();
  assert.throws(() => store.getConversation('../../etc/passwd'), InvalidConversationIdError);
});

test('listConversations returns all saved conversations, newest first', () => {
  const store = tempStore();
  store.saveConversation('conv-a', [{ role: 'user', content: 'a' }]);
  store.saveConversation('conv-b', [{ role: 'user', content: 'b' }]);
  const list = store.listConversations();
  assert.equal(list.length, 2);
  assert.ok(list.some((c) => c.id === 'conv-a'));
  assert.ok(list.some((c) => c.id === 'conv-b'));
});

test('listConversations returns [] when the history directory does not exist yet', () => {
  const historyDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-history-')), 'not-created');
  const store = createConversationStore({ historyDir });
  assert.deepEqual(store.listConversations(), []);
});

test('listConversations skips a directory with no readable meta.json rather than failing', () => {
  const store = tempStore();
  store.saveConversation('conv-good', [{ role: 'user', content: 'ok' }]);
  fs.mkdirSync(path.join(store.historyDir, 'corrupted'));
  const list = store.listConversations();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'conv-good');
});

test('deleteConversation removes the conversation entirely', () => {
  const store = tempStore();
  store.saveConversation('conv-1', [{ role: 'user', content: 'gone soon' }]);
  store.deleteConversation('conv-1');
  assert.throws(() => store.getConversation('conv-1'), ConversationNotFoundError);
  assert.deepEqual(store.listConversations(), []);
});

test('deleteConversation throws ConversationNotFoundError for an unknown id', () => {
  const store = tempStore();
  assert.throws(() => store.deleteConversation('does-not-exist'), ConversationNotFoundError);
});

test('deleteConversation throws InvalidConversationIdError for a malformed id', () => {
  const store = tempStore();
  assert.throws(() => store.deleteConversation('../escape'), InvalidConversationIdError);
});
