'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createAdminRouter } = require('../src/adminRoutes');
const { createReasoningModelStore } = require('../src/logos/reasoningModelStore');
const { parseTokens, createAuthMiddleware } = require('../src/auth');

function startTestServer() {
  const storePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'admin-routes-')), 'config.json');
  const store = createReasoningModelStore({ storePath });
  const auth = createAuthMiddleware(parseTokens('test-token'));

  let fakeOpenRouterModels = null;
  let fakeOpenRouterError = null;
  const createOpenRouterClientFn = () => ({
    listModels: async () => {
      if (fakeOpenRouterError) throw fakeOpenRouterError;
      return fakeOpenRouterModels || [];
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/admin', createAdminRouter({ store, auth, createOpenRouterClientFn }));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    store,
    setModels: (models) => { fakeOpenRouterModels = models; },
    setError: (err) => { fakeOpenRouterError = err; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function authHeaders(token = 'test-token') {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test('GET /admin serves the static admin page without auth', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/admin`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /ReasonIQ/);
  } finally {
    await ctx.close();
  }
});

test('GET /admin/api/reasoniq/config requires auth', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`);
    assert.equal(res.status, 401);
  } finally {
    await ctx.close();
  }
});

test('GET /admin/api/reasoniq/config returns an empty masked config before anything is saved', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, { headers: authHeaders() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.hasApiKey, false);
  } finally {
    await ctx.close();
  }
});

test('PUT /admin/api/reasoniq/config saves an api key, and the response never contains the raw key', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ provider: 'openrouter', apiKey: 'sk-or-super-secret-value' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.hasApiKey, true);
    assert.ok(!JSON.stringify(body).includes('sk-or-super-secret-value'));

    // But it really was persisted:
    assert.equal(ctx.store.getConfig().apiKey, 'sk-or-super-secret-value');
  } finally {
    await ctx.close();
  }
});

test('PUT /admin/api/reasoniq/config with only a model does not clear the previously saved key', async () => {
  const ctx = startTestServer();
  try {
    await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ apiKey: 'sk-or-secret' }),
    });
    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet' }),
    });
    const body = await res.json();
    assert.equal(body.model, 'anthropic/claude-3.5-sonnet');
    assert.equal(body.hasApiKey, true);
    assert.equal(ctx.store.getConfig().apiKey, 'sk-or-secret');
  } finally {
    await ctx.close();
  }
});

test('PUT /admin/api/reasoniq/config rejects an empty body', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  } finally {
    await ctx.close();
  }
});

test('GET /admin/api/reasoniq/models requires a saved key first', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/models`, { headers: authHeaders() });
    assert.equal(res.status, 400);
  } finally {
    await ctx.close();
  }
});

test('GET /admin/api/reasoniq/models returns the fetched model list once a key is saved', async () => {
  const ctx = startTestServer();
  try {
    await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ apiKey: 'sk-or-x' }),
    });
    ctx.setModels([{ id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', contextLength: 128000, pricing: { prompt: '0.15', completion: '0.6' } }]);

    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/models`, { headers: authHeaders() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.models.length, 1);
    assert.equal(body.models[0].id, 'openai/gpt-4o-mini');
  } finally {
    await ctx.close();
  }
});

test('GET /admin/api/reasoniq/models maps an OpenRouter failure to a calm 502', async () => {
  const ctx = startTestServer();
  try {
    await fetch(`${ctx.baseUrl}/admin/api/reasoniq/config`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ apiKey: 'sk-or-x' }),
    });
    ctx.setError(new Error('openrouter rejected the api key'));

    const res = await fetch(`${ctx.baseUrl}/admin/api/reasoniq/models`, { headers: authHeaders() });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.ok(!JSON.stringify(body).includes('sk-or-x'));
  } finally {
    await ctx.close();
  }
});
