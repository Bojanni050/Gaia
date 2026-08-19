'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveImageText, isImageMime, VISION_DISCLAIMER } = require('../src/ocrResolver');

function fakeModel(chatImpl, configured = true) {
  return { chat: chatImpl, isConfigured: () => configured };
}

test('isImageMime recognizes image/* only', () => {
  assert.equal(isImageMime('image/png'), true);
  assert.equal(isImageMime('image/jpeg'), true);
  assert.equal(isImageMime('IMAGE/WEBP'), true);
  assert.equal(isImageMime('text/plain'), false);
  assert.equal(isImageMime('application/pdf'), false);
  assert.equal(isImageMime(''), false);
});

test('resolveImageText returns null when no model is configured, without calling chat', async () => {
  let called = false;
  const model = fakeModel(async () => { called = true; return 'x'; }, false);
  const result = await resolveImageText(Buffer.from('fake png bytes'), 'image/png', { model });
  assert.equal(result, null);
  assert.equal(called, false);
});

test('resolveImageText sends the image as a base64 data URL with responseFormat: null', async () => {
  let seenMessages;
  let seenOptions;
  const model = fakeModel(async (messages, options) => {
    seenMessages = messages;
    seenOptions = options;
    return 'a red bicycle leaning against a brick wall';
  });
  await resolveImageText(Buffer.from('fake png bytes'), 'image/png', { model });

  assert.equal(seenOptions.responseFormat, null);
  const userMessage = seenMessages.find((m) => m.role === 'user');
  const imageBlock = userMessage.content.find((b) => b.type === 'image_url');
  assert.match(imageBlock.image_url.url, /^data:image\/png;base64,/);
});

test('resolveImageText prefixes the result with the vision disclaimer', async () => {
  const model = fakeModel(async () => 'a red bicycle leaning against a brick wall');
  const result = await resolveImageText(Buffer.from('x'), 'image/png', { model });
  assert.ok(result.startsWith(VISION_DISCLAIMER));
  assert.match(result, /red bicycle/);
});

test('resolveImageText degrades to null on a model failure, never throws', async () => {
  const model = fakeModel(async () => { throw new Error('reasoning model unreachable'); });
  const result = await resolveImageText(Buffer.from('x'), 'image/png', { model });
  assert.equal(result, null);
});

test('resolveImageText degrades to null on an empty/whitespace-only response', async () => {
  const model = fakeModel(async () => '   ');
  const result = await resolveImageText(Buffer.from('x'), 'image/png', { model });
  assert.equal(result, null);
});
