'use strict';

/**
 * Chat history — the full transcript of each conversation, persisted
 * server-side in Gaia Cloud (architecture.md: no client holds canonical
 * state; roadmap.md V1 "Must Have": "reopening Gaia feels like resuming,
 * not restarting" — a promise Milestone 2 explicitly deferred when
 * conversations went in-memory-only on Desktop).
 *
 * This is deliberately NOT Hindsight. Architecture.md is explicit:
 * "Reflection, not logging. Hindsight does not store the raw transcript
 * as memory." This store is the raw transcript, on purpose — it's the
 * literal chat log a person re-opens to keep reading, not a reflective
 * memory Logos reasons over. Two different jobs, two different stores.
 *
 * Same layout discipline as library.js: one directory per conversation
 * (`<historyDir>/<id>/meta.json` + `.../messages.json`), no shared index
 * to corrupt under concurrent writes. `id` is chosen by the client (the
 * conversation's own local thread id) and used directly as a directory
 * name, so it's validated here — never trust a path component from a
 * request body.
 */

const fs = require('fs');
const path = require('path');

function resolveHistoryDir(env = process.env) {
  if (env.HISTORY_PATH) return env.HISTORY_PATH;
  const devPath = path.resolve(__dirname, '../data/history');
  const containerPath = '/app/data/history';
  return fs.existsSync('/app') ? containerPath : devPath;
}

// Directory names only — no path separators, no traversal, nothing that
// isn't a plain identifier. A client-supplied conversationId that fails
// this is rejected rather than silently sanitized.
const VALID_ID = /^[A-Za-z0-9_-]{1,128}$/;

function isValidId(id) {
  return typeof id === 'string' && VALID_ID.test(id);
}

class InvalidConversationIdError extends Error {
  constructor(id) {
    super(`invalid conversation id: ${JSON.stringify(id)}`);
    this.name = 'InvalidConversationIdError';
  }
}

class ConversationNotFoundError extends Error {
  constructor(id) {
    super(`conversation not found: ${id}`);
    this.name = 'ConversationNotFoundError';
  }
}

const MAX_TITLE_CHARS = 60;

function deriveTitle(messages) {
  const firstUser = (messages || []).find((m) => m && m.role === 'user' && m.content);
  if (!firstUser) return 'Untitled';
  const text = firstUser.content.trim().replace(/\s+/g, ' ');
  return text.length > MAX_TITLE_CHARS ? `${text.slice(0, MAX_TITLE_CHARS)}…` : text || 'Untitled';
}

/**
 * @param {{ historyDir?: string }} [options]
 */
function createConversationStore(options = {}) {
  const historyDir = options.historyDir || resolveHistoryDir();

  function convDir(id) {
    return path.join(historyDir, id);
  }
  function metaPath(id) {
    return path.join(convDir(id), 'meta.json');
  }
  function messagesPath(id) {
    return path.join(convDir(id), 'messages.json');
  }

  /**
   * Persists the full transcript so far for `id` — overwrites, doesn't
   * append, since the caller (turn.js/server.js) already has the
   * complete history in memory each turn. Title is derived once, from
   * the first save, and kept stable across later turns.
   * @param {string} id
   * @param {Array<{role: string, content: string}>} messages
   * @throws {InvalidConversationIdError}
   */
  function saveConversation(id, messages) {
    if (!isValidId(id)) throw new InvalidConversationIdError(id);
    if (!Array.isArray(messages) || messages.length === 0) return;

    fs.mkdirSync(convDir(id), { recursive: true });

    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath(id), 'utf-8'));
    } catch (_) {
      meta = { id, title: deriveTitle(messages), createdAt: new Date().toISOString() };
    }
    meta.updatedAt = new Date().toISOString();
    meta.messageCount = messages.length;

    const plain = messages.map(({ role, content }) => ({ role, content }));
    fs.writeFileSync(messagesPath(id), JSON.stringify(plain, null, 2), 'utf-8');
    fs.writeFileSync(metaPath(id), JSON.stringify(meta, null, 2), 'utf-8');
  }

  /** @returns {Array<{id, title, createdAt, updatedAt, messageCount}>} newest first */
  function listConversations() {
    if (!fs.existsSync(historyDir)) return [];
    const entries = fs.readdirSync(historyDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    const conversations = [];
    for (const entry of entries) {
      try {
        conversations.push(JSON.parse(fs.readFileSync(metaPath(entry.name), 'utf-8')));
      } catch (_) {
        // A directory without a readable meta.json isn't a valid entry
        // (e.g. an interrupted write) — skip it, don't fail the listing.
      }
    }
    conversations.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return conversations;
  }

  /**
   * @param {string} id
   * @returns {{ meta: object, messages: Array<{role: string, content: string}> }}
   * @throws {InvalidConversationIdError | ConversationNotFoundError}
   */
  function getConversation(id) {
    if (!isValidId(id)) throw new InvalidConversationIdError(id);
    if (!fs.existsSync(metaPath(id))) throw new ConversationNotFoundError(id);
    const meta = JSON.parse(fs.readFileSync(metaPath(id), 'utf-8'));
    const messages = JSON.parse(fs.readFileSync(messagesPath(id), 'utf-8'));
    return { meta, messages };
  }

  /** @throws {InvalidConversationIdError | ConversationNotFoundError} */
  function deleteConversation(id) {
    if (!isValidId(id)) throw new InvalidConversationIdError(id);
    if (!fs.existsSync(convDir(id))) throw new ConversationNotFoundError(id);
    fs.rmSync(convDir(id), { recursive: true, force: true });
  }

  return { saveConversation, listConversations, getConversation, deleteConversation, historyDir };
}

module.exports = {
  createConversationStore,
  resolveHistoryDir,
  isValidId,
  deriveTitle,
  InvalidConversationIdError,
  ConversationNotFoundError,
};
