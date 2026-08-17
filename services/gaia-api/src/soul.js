'use strict';

/**
 * SOUL loading — server-side identity.
 *
 * Since Milestone 8 the desktop client carries no identity; this service is
 * where the constitution is read. One canonical source (the repo's
 * `soul.md`), resolved from a list of candidate paths so dev (repo layout)
 * and container (baked-in copy) both work. Missing SOUL is a hard startup
 * failure: a Gaia without her constitution must not speak.
 */
const fs = require('fs');
const path = require('path');

const CANDIDATES = [
  () => process.env.SOUL_PATH,
  // Dev: services/gaia-api/src → repo root → the canonical constitution.
  () => path.resolve(__dirname, '../../../frontend/src/gaia/identity/soul.md'),
  // Container: baked in next to the app by the Dockerfile.
  () => '/app/soul.md',
];

function resolveSoulPath() {
  for (const candidate of CANDIDATES) {
    const value = candidate();
    if (value && fs.existsSync(value)) return value;
  }
  return null;
}

function loadSoulPrompt() {
  const resolved = resolveSoulPath();
  if (!resolved) {
    throw new Error(
      'SOUL not found — set SOUL_PATH or run from the repository layout. Refusing to start without identity.'
    );
  }
  const prompt = fs.readFileSync(resolved, 'utf-8').trim();
  if (!prompt) {
    throw new Error(`SOUL is empty (${resolved}). Refusing to start without identity.`);
  }
  return prompt;
}

module.exports = { loadSoulPrompt, resolveSoulPath };
