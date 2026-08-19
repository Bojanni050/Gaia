'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createLibraryRouter } = require('../src/libraryRoutes');
const { createLibraryStore } = require('../src/library');
const { parseTokens, createAuthMiddleware } = require('../src/auth');

function startTestServer(options = {}) {
  const libraryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-routes-'));
  const store = createLibraryStore({ libraryDir });
  const auth = createAuthMiddleware(parseTokens('test-token'));

  const app = express();
  app.use(express.json());
  app.use('/library', createLibraryRouter({ store, auth, ...options }));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return { baseUrl, store, close: () => new Promise((resolve) => server.close(resolve)) };
}

function authHeaders(token = 'test-token') {
  return { Authorization: `Bearer ${token}` };
}

function fileForm(content, filename, type) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), filename);
  return form;
}

test('POST /library/files requires auth', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/library/files`, { method: 'POST', body: fileForm('x', 'x.txt', 'text/plain') });
    assert.equal(res.status, 401);
  } finally {
    await ctx.close();
  }
});

test('POST /library/files uploads a file and returns its metadata', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/library/files`, {
      method: 'POST',
      headers: authHeaders(),
      body: fileForm('hello world', 'notes.txt', 'text/plain'),
    });
    assert.equal(res.status, 201);
    const meta = await res.json();
    assert.ok(meta.id);
    assert.equal(meta.filename, 'notes.txt');
    assert.equal(meta.mimeType, 'text/plain');
    assert.equal(meta.size, 11);
  } finally {
    await ctx.close();
  }
});

test('POST /library/files rejects a request with no file field', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/library/files`, { method: 'POST', headers: authHeaders(), body: new FormData() });
    assert.equal(res.status, 400);
  } finally {
    await ctx.close();
  }
});

test('POST /library/files rejects a file over the configured size limit with 413', async () => {
  const ctx = startTestServer({ maxFileSizeMb: 0.000001 }); // ~1 byte
  try {
    const res = await fetch(`${ctx.baseUrl}/library/files`, {
      method: 'POST',
      headers: authHeaders(),
      body: fileForm('this is definitely more than one byte', 'big.txt', 'text/plain'),
    });
    assert.equal(res.status, 413);
  } finally {
    await ctx.close();
  }
});

test('GET /library/files requires auth and lists uploaded files', async () => {
  const ctx = startTestServer();
  try {
    const unauth = await fetch(`${ctx.baseUrl}/library/files`);
    assert.equal(unauth.status, 401);

    await fetch(`${ctx.baseUrl}/library/files`, { method: 'POST', headers: authHeaders(), body: fileForm('a', 'a.txt', 'text/plain') });
    await fetch(`${ctx.baseUrl}/library/files`, { method: 'POST', headers: authHeaders(), body: fileForm('b', 'b.txt', 'text/plain') });

    const res = await fetch(`${ctx.baseUrl}/library/files`, { headers: authHeaders() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.files.length, 2);
  } finally {
    await ctx.close();
  }
});

test('GET /library/files/:id downloads the exact bytes with the stored content type', async () => {
  const ctx = startTestServer();
  try {
    const uploadRes = await fetch(`${ctx.baseUrl}/library/files`, {
      method: 'POST',
      headers: authHeaders(),
      body: fileForm('the quick brown fox', 'fox.txt', 'text/plain'),
    });
    const { id } = await uploadRes.json();

    const res = await fetch(`${ctx.baseUrl}/library/files/${id}`, { headers: authHeaders() });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/plain');
    assert.match(res.headers.get('content-disposition'), /fox\.txt/);
    const text = await res.text();
    assert.equal(text, 'the quick brown fox');
  } finally {
    await ctx.close();
  }
});

test('GET /library/files/:id returns 404 for an unknown id', async () => {
  const ctx = startTestServer();
  try {
    const res = await fetch(`${ctx.baseUrl}/library/files/does-not-exist`, { headers: authHeaders() });
    assert.equal(res.status, 404);
  } finally {
    await ctx.close();
  }
});

test('DELETE /library/files/:id removes the file, and it is gone from a subsequent list', async () => {
  const ctx = startTestServer();
  try {
    const uploadRes = await fetch(`${ctx.baseUrl}/library/files`, {
      method: 'POST',
      headers: authHeaders(),
      body: fileForm('gone soon', 'x.txt', 'text/plain'),
    });
    const { id } = await uploadRes.json();

    const delRes = await fetch(`${ctx.baseUrl}/library/files/${id}`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(delRes.status, 204);

    const listRes = await fetch(`${ctx.baseUrl}/library/files`, { headers: authHeaders() });
    const { files } = await listRes.json();
    assert.equal(files.length, 0);
  } finally {
    await ctx.close();
  }
});

test('DELETE /library/files/:id returns 404 for an unknown id, and requires auth', async () => {
  const ctx = startTestServer();
  try {
    const unauth = await fetch(`${ctx.baseUrl}/library/files/anything`, { method: 'DELETE' });
    assert.equal(unauth.status, 401);

    const res = await fetch(`${ctx.baseUrl}/library/files/does-not-exist`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(res.status, 404);
  } finally {
    await ctx.close();
  }
});
