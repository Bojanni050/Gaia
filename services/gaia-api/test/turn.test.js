'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMessages, assembleMessages, performTurn } = require('../src/turn');

test('validateMessages accepts a plain user/assistant history', () => {
  assert.equal(
    validateMessages([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]),
    null
  );
});

test('validateMessages rejects empty, non-array, bad role and empty content', () => {
  assert.match(validateMessages([]), /non-empty/);
  assert.match(validateMessages('nope'), /non-empty/);
  assert.match(validateMessages([{ role: 'wizard', content: 'hi' }]), /role/);
  assert.match(validateMessages([{ role: 'user', content: '   ' }]), /non-empty/);
});

test('assembleMessages prepends SOUL exactly once and strips extra fields', () => {
  const messages = assembleMessages('YOU ARE GAIA', [
    { id: 'local-1', role: 'user', content: 'hello', failed: false },
  ]);
  assert.deepEqual(messages, [
    { role: 'system', content: 'YOU ARE GAIA' },
    { role: 'user', content: 'hello' },
  ]);
});

test('performTurn returns the reply on a happy path', async () => {
  const hermes = {
    async chat(messages) {
      assert.deepEqual(messages, [
        { role: 'system', content: 'SOUL' },
        { role: 'user', content: 'hello' },
      ]);
      return 'hi there';
    },
  };
  const result = await performTurn({
    messages: [{ role: 'user', content: 'hello' }],
    systemPrompt: 'SOUL',
    hermes,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.reply, 'hi there');
});

test('performTurn maps validation problems to 400', async () => {
  const result = await performTurn({ messages: [], systemPrompt: 'SOUL', hermes: { chat: async () => 'x' } });
  assert.equal(result.status, 400);
  assert.ok(result.body.error);
});

test('performTurn maps a failing Hermes to a calm 502 without provider details', async () => {
  const hermes = {
    async chat() {
      throw new Error('hermes responded with status 401 at http://internal:8642');
    },
  };
  const result = await performTurn({
    messages: [{ role: 'user', content: 'hello' }],
    systemPrompt: 'SOUL',
    hermes,
  });
  assert.equal(result.status, 502);
  assert.equal(result.body.error, 'gaia could not answer right now');
  assert.ok(!JSON.stringify(result.body).includes('hermes'));
  assert.ok(!JSON.stringify(result.body).includes('8642'));
});

test('performTurn rejects an empty Hermes reply', async () => {
  const result = await performTurn({
    messages: [{ role: 'user', content: 'hello' }],
    systemPrompt: 'SOUL',
    hermes: { chat: async () => '' },
  });
  assert.equal(result.status, 502);
});
