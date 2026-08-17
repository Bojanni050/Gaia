'use strict';

/**
 * Bearer-token authentication for the Gaia API.
 *
 * Tokens come from the environment (comma-separated, so each client/device
 * can have its own). When no token is configured the server fails closed:
 * every request is refused. There is no anonymous access to Gaia.
 */
function parseTokens(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );
}

function createAuthMiddleware(tokens) {
  return function auth(req, res, next) {
    if (tokens.size === 0) {
      return res.status(503).json({ error: 'server not configured' });
    }
    const header = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match || !tokens.has(match[1].trim())) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  };
}

module.exports = { parseTokens, createAuthMiddleware };
