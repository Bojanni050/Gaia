'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHistoryRouter } = require('../src/historyRoutes');
const { createConversationStore } = require('../src/conversationStore');
const { parseTokens, createAuthMiddleware } = require('../src/auth');

function startTestServer() {
  const historyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-routes-'));
  const store = createConversationStore({ historyDir });
  const auth = createAuthMiddleware(parseTokens('test-token'));

  const app = express();
  app.use(express.json());
  app.use('/conversations', createHistoryRouter({ store, auth }));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return { baseUrl, store, close: () => new Promise((resolve) => server.close(resolve)) };
}

function authHeaders(token = 'test-token') {
  return { Authorization: `Bearer ${token}` };
}

test('GET /conversations requires auth', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/conversations`);
    assert.equal(res.status, 401);
  } finally {
    await ctx.close();
  }
});

test('GET /conversations lists saved conversations', async () => {
  const ctx = startTestServer();
  try {
    ctx.store.saveConversation('conv-1', [{ role: 'user', content: 'hello there' }]);
    const res = await fetch(`${ctx.baseUrl}/conversations`, { headers: authHeaders() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.conversations.length, 1);
    assert.equal(body.conversations[0].id, 'conv-1');
  } finally {
    await ctx.close();
  }
});

test('GET /conversations returns [] when nothing has been saved', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/conversations`, { headers: authHeaders() });
    const body = await res.json();
    assert.deepEqual(body.conversations, []);
  } finally {
    await ctx.close();
  }
});

test('GET /conversations/:id returns the full transcript', async () => {
  const ctx = startTestServer();
  try {
    ctx.store.saveConversation('conv-1', [
      { role: 'user', content: 'why is my website crashing?' },
      { role: 'assistant', content: 'let\'s check the logs' },
    ]);
    const res = await fetch(`${ctx.baseUrl}/conversations/conv-1`, { headers: authHeaders() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.id, 'conv-1');
    assert.equal(body.messages.length, 2);
  } finally {
    await ctx.close();
  }
});

test('GET /conversations/:id requires auth', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/conversations/conv-1`);
    assert.equal(res.status, 401);
  } finally {
    await ctx.close();
  }
});

test('GET /conversations/:id returns 404 for an unknown id', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/conversations/does-not-exist`, { headers: authHeaders() });
    assert.equal(res.status, 404);
  } finally {
    await ctx.close();
  }
});

test('GET /conversations/:id returns 404 (not 500) for a path-traversal id', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/conversations/${encodeURIComponent('../../etc/passwd')}`, { headers: authHeaders() });
    assert.equal(res.status, 404);
  } finally {
    await ctx.close();
  }
});

test('DELETE /conversations/:id removes the conversation, and it is gone from a subsequent list', async () => {
  const ctx = startTestServer();
  try {
    ctx.store.saveConversation('conv-1', [{ role: 'user', content: 'gone soon' }]);
    const delRes = await fetch(`${ctx.baseUrl}/conversations/conv-1`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(delRes.status, 204);

    const listRes = await fetch(`${ctx.baseUrl}/conversations`, { headers: authHeaders() });
    const { conversations } = await listRes.json();
    assert.equal(conversations.length, 0);
  } finally {
    await ctx.close();
  }
});

test('DELETE /conversations/:id requires auth and returns 404 for an unknown id', async () => {
  const ctx = startTestServer();
  try {
    const unauth = await fetch(`${ctx.baseUrl}/conversations/anything`, { method: 'DELETE' });
    assert.equal(unauth.status, 401);

    const res = await fetch(`${ctx.baseUrl}/conversations/does-not-exist`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(res.status, 404);
  } finally {
    await ctx.close();
  }
});
