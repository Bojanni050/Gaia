'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTokens, createAuthMiddleware } = require('../src/auth');

function fakeReq(token) {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} };
}

test('parseTokens splits, trims and drops empties', () => {
  const tokens = parseTokens(' a , b , ,  ');
  assert.deepEqual([...tokens], ['a', 'b']);
  assert.equal(parseTokens(undefined).size, 0);
});

test('auth fails closed when no tokens are configured', () => {
  const auth = createAuthMiddleware(parseTokens(''));
  const res = { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(b) { this.body = b; } };
  auth(fakeReq('anything'), res, () => assert.fail('must not pass'));
  assert.equal(res.statusCode, 503);
});

test('auth rejects missing, malformed and wrong tokens with 401', () => {
  const auth = createAuthMiddleware(parseTokens('right'));
  for (const req of [fakeReq(null), fakeReq('wrong'), { headers: { authorization: 'Basic x' } }]) {
    const res = { statusCode: 0, status(code) { this.statusCode = code; return this; }, json() {} };
    auth(req, res, () => assert.fail('must not pass'));
    assert.equal(res.statusCode, 401);
  }
});

test('auth accepts a configured token', () => {
  const auth = createAuthMiddleware(parseTokens('a, b'));
  let passed = false;
  auth(fakeReq('b'), { status() { return this; }, json() { assert.fail('must not respond'); } }, () => {
    passed = true;
  });
  assert.ok(passed);
});
