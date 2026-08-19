'use strict';

/**
 * The Gaia API — where first-class clients reach Gaia.
 *
 * Contract (kept in lockstep with the desktop's `conversation/turn` seam):
 *   GET  /health             → { ok: true, soulVersion: string }
 *   GET  /soul               → { version: string }   (identity version only)
 *   POST /conversation/turn  → { reply: string }     (auth required, Desktop's exact contract)
 *   POST /conversation/turn  → SSE stream            (auth required; { ..., stream: true } — Phase B, docs/web-migration-plan.md)
 *   /admin/*                 → operator-only ReasonIQ model configuration (adminRoutes.js) — never part of any client's contract
 *
 * Everything cognitive lives here or behind Hermes; clients send plain
 * turns and render plain replies. Model-agnostic by construction: the
 * reply shape carries no provider information whatsoever.
 */
const express = require('express');
const { parseTokens, createAuthMiddleware } = require('./auth');
const { createHermesClient } = require('./hermesClient');
const { createHindsightClient } = require('./hindsightClient');
const { performTurn, performStreamingTurn } = require('./turn');
const { loadSoul } = require('./soul');
const { loadFoundationDocuments } = require('./foundation');
const { createAdminRouter } = require('./adminRoutes');
const { createReasoningModelStore } = require('./logos/reasoningModelStore');

const PORT = Number(process.env.PORT || 8891);

function createApp(env = process.env) {
  const soul = loadSoulWithEnv(env);
  const systemPrompt = soul.prompt;
  const documents = loadFoundationDocumentsWithEnv(env);
  const hermes = createHermesClient({
    baseUrl: env.HERMES_BASE_URL,
    model: env.HERMES_MODEL || 'hermes-agent',
    authToken: env.HERMES_AUTH_TOKEN,
  });
  const hindsight = createHindsightClient({
    baseUrl: env.HINDSIGHT_URL || 'http://100.64.144.93:8888',
    bankId: env.HINDSIGHT_BANK_ID || 'gaia',
  });
  const auth = createAuthMiddleware(parseTokens(env.GAIA_API_TOKEN));

  const app = express();
  app.use(express.json());

  // Request log — server-side only, so failures are diagnosable without
  // leaking anything to clients.
  app.use((req, res, next) => {
    res.on('finish', () => {
      console.log(`${req.method} ${req.path} -> ${res.statusCode}`);
    });
    next();
  });

  const health = (req, res) => res.json({ ok: true, soulVersion: soul.version });
  app.get('/health', health);
  app.get('/', health);

  // Identity version only — clients observe which SOUL they're talking to;
  // the constitution itself stays server-side.
  app.get('/soul', (req, res) => res.json({ version: soul.version }));

  const reasoningModelStore = createReasoningModelStore(
    env.REASONIQ_CONFIG_PATH !== undefined ? { storePath: env.REASONIQ_CONFIG_PATH } : {}
  );
  app.use('/admin', createAdminRouter({ store: reasoningModelStore, auth }));

  app.post('/conversation/turn', auth, async (req, res) => {
    const messages = req.body && req.body.messages;

    if (req.body && req.body.stream) {
      await performStreamingTurn({
        messages,
        documents,
        hermes,
        hindsight,
        res,
        conversationId: req.body.conversationId,
      });
      return;
    }

    const result = await performTurn({ messages, systemPrompt, hermes });
    res.status(result.status).json(result.body);
  });

  // Calm JSON error surface — no stack traces, no provider names.
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'request body must be valid JSON' });
    }
    return res.status(500).json({ error: 'something went wrong' });
  });

  return app;
}

// Split so tests can inject env without touching process.env.
function loadSoulWithEnv(env) {
  if (env.SOUL_PATH !== undefined && env !== process.env) {
    const previous = process.env.SOUL_PATH;
    if (env.SOUL_PATH) process.env.SOUL_PATH = env.SOUL_PATH;
    try {
      return loadSoul();
    } finally {
      if (previous === undefined) delete process.env.SOUL_PATH;
      else process.env.SOUL_PATH = previous;
    }
  }
  return loadSoul();
}

// Same pattern as loadSoulWithEnv, for foundation-artifact.json.
function loadFoundationDocumentsWithEnv(env) {
  if (env.FOUNDATION_ARTIFACT_PATH !== undefined && env !== process.env) {
    const previous = process.env.FOUNDATION_ARTIFACT_PATH;
    if (env.FOUNDATION_ARTIFACT_PATH) process.env.FOUNDATION_ARTIFACT_PATH = env.FOUNDATION_ARTIFACT_PATH;
    try {
      return loadFoundationDocuments();
    } finally {
      if (previous === undefined) delete process.env.FOUNDATION_ARTIFACT_PATH;
      else process.env.FOUNDATION_ARTIFACT_PATH = previous;
    }
  }
  return loadFoundationDocuments();
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Gaia API listening on :${PORT}`);
  });
}

module.exports = { createApp, PORT };
