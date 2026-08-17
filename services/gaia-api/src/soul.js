'use strict';

/**
 * SOUL — Gaia's constitution, owned here (Gaia Cloud) and versioned.
 *
 * The desktop carries no identity; this service is where the constitution
 * is read. The canonical document lives in `identity/soul.md` next to this
 * service, is baked into the image, and carries a `version` field that the
 * API surfaces so clients can observe which identity they are talking to.
 * Missing or empty SOUL is a hard startup failure: a Gaia without her
 * constitution must not speak.
 */
const fs = require('fs');
const path = require('path');

const CANDIDATES = [
  () => process.env.SOUL_PATH,
  // Dev: services/gaia-api/src → services/gaia-api/identity/soul.md
  () => path.resolve(__dirname, '../identity/soul.md'),
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

function parseVersion(content) {
  const match = /^version:\s*(\S+)\s*$/m.exec(content);
  return match ? match[1] : 'unknown';
}

/**
 * Loads the constitution and its version.
 * @returns {{ prompt: string, version: string }}
 */
function loadSoul() {
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
  return { prompt, version: parseVersion(prompt) };
}

module.exports = { loadSoul, parseVersion, resolveSoulPath };
