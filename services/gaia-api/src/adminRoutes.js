'use strict';

/**
 * Admin surface for configuring ReasonIQ's reasoning model at runtime —
 * fill in an OpenRouter API key, fetch the models it makes available,
 * and choose one. Deliberately separate from Gaia Desktop's Settings
 * panel (which states plainly that "nothing cognitive ever appears
 * here") and from anything a normal Gaia client touches: this is
 * operator/admin tooling for Gaia Cloud itself, gated behind the same
 * bearer token as every other authenticated route on this API.
 *
 * The API key never round-trips back to any client once saved — see
 * reasoningModelStore.js's getMaskedConfig().
 *
 * Routes (all mounted under /admin, all except the static page require
 * the standard Bearer auth):
 *   GET  /admin                       -> the static admin page (public shell, no secrets embedded)
 *   GET  /admin/api/reasoniq/config   -> masked current config
 *   PUT  /admin/api/reasoniq/config   -> { provider?, baseUrl?, model?, apiKey? } -> masked config
 *   GET  /admin/api/reasoniq/models   -> fetches the model list from OpenRouter using the stored key
 */
const express = require('express');
const path = require('path');
const { createOpenRouterClient } = require('./logos/openRouterClient');

/**
 * @param {{
 *   store: ReturnType<import('./logos/reasoningModelStore').createReasoningModelStore>,
 *   auth: import('express').RequestHandler,
 *   createOpenRouterClientFn?: typeof createOpenRouterClient,
 * }} deps
 */
function createAdminRouter({ store, auth, createOpenRouterClientFn = createOpenRouterClient }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
  });

  router.get('/api/reasoniq/config', auth, (req, res) => {
    res.json(store.getMaskedConfig());
  });

  router.put('/api/reasoniq/config', auth, (req, res) => {
    const body = req.body || {};
    const allowed = {};
    if (typeof body.provider === 'string') allowed.provider = body.provider.trim();
    if (typeof body.baseUrl === 'string') allowed.baseUrl = body.baseUrl.trim();
    if (typeof body.model === 'string') allowed.model = body.model.trim();
    if (typeof body.apiKey === 'string' && body.apiKey.trim() !== '') allowed.apiKey = body.apiKey.trim();

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: 'no valid fields supplied' });
    }

    store.saveConfig(allowed);
    res.json(store.getMaskedConfig());
  });

  router.get('/api/reasoniq/models', auth, async (req, res) => {
    const config = store.getConfig();
    if (!config || !config.apiKey) {
      return res.status(400).json({ error: 'save an OpenRouter API key first' });
    }

    const client = createOpenRouterClientFn({ apiKey: config.apiKey, baseUrl: config.baseUrl });
    try {
      const models = await client.listModels();
      res.json({ models });
    } catch (err) {
      // Calm and generic to the client, same discipline as hermesClient.js —
      // the OpenRouter-specific detail is already logged server-side by
      // openRouterClient.js itself.
      res.status(502).json({ error: 'could not fetch models from openrouter right now' });
    }
  });

  return router;
}

module.exports = { createAdminRouter };
