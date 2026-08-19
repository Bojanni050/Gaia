'use strict';

/**
 * File library — server-side storage for files uploaded from any Gaia
 * client. Lives in Gaia Cloud, not on any client (architecture.md: no
 * client holds canonical state) — same posture as the ReasonIQ admin
 * config store (reasoningModelStore.js), but for file blobs instead of a
 * single JSON record.
 *
 * v1 scope: storage and browsing only. Nothing here reads file content,
 * extracts text, or feeds anything to ReasonIQ/Hermes/Hindsight — that's
 * a deliberate later decision, not an oversight (see principles.md's
 * "Source First": an uploaded document only becomes a source of truth
 * when the user or Gaia explicitly reaches for it, not automatically).
 *
 * One directory per file: `<libraryDir>/<id>/meta.json` + `.../blob`.
 * Deliberately not a single shared index — every operation touches only
 * its own file's directory, so there's no shared-index file to corrupt
 * under concurrent writes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function resolveLibraryDir(env = process.env) {
  if (env.LIBRARY_PATH) return env.LIBRARY_PATH;
  const devPath = path.resolve(__dirname, '../data/library');
  const containerPath = '/app/data/library';
  return fs.existsSync('/app') ? containerPath : devPath;
}

class LibraryFileNotFoundError extends Error {
  constructor(id) {
    super(`library file not found: ${id}`);
    this.name = 'LibraryFileNotFoundError';
  }
}

/**
 * @param {{ libraryDir?: string }} [options]
 */
function createLibraryStore(options = {}) {
  const libraryDir = options.libraryDir || resolveLibraryDir();

  function fileDir(id) {
    return path.join(libraryDir, id);
  }
  function metaPath(id) {
    return path.join(fileDir(id), 'meta.json');
  }
  function blobPath(id) {
    return path.join(fileDir(id), 'blob');
  }

  /**
   * @param {Buffer} buffer
   * @param {{ filename: string, mimeType: string }} info
   * @returns {{ id: string, filename: string, mimeType: string, size: number, uploadedAt: string }}
   */
  function saveFile(buffer, { filename, mimeType }) {
    const id = crypto.randomUUID();
    fs.mkdirSync(fileDir(id), { recursive: true });
    fs.writeFileSync(blobPath(id), buffer);
    const meta = {
      id,
      filename: filename || 'upload',
      mimeType: mimeType || 'application/octet-stream',
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath(id), JSON.stringify(meta, null, 2), 'utf-8');
    return meta;
  }

  /** @returns {Array<{id, filename, mimeType, size, uploadedAt}>} newest first */
  function listFiles() {
    if (!fs.existsSync(libraryDir)) return [];
    const entries = fs.readdirSync(libraryDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    const files = [];
    for (const entry of entries) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath(entry.name), 'utf-8'));
        files.push(meta);
      } catch (_) {
        // A directory without a readable meta.json is not a valid library
        // entry (e.g. an interrupted write) — skip it rather than fail the
        // whole listing.
      }
    }
    files.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
    return files;
  }

  /** @returns {{ meta: object, buffer: Buffer }} @throws {LibraryFileNotFoundError} */
  function getFile(id) {
    if (!fs.existsSync(metaPath(id))) throw new LibraryFileNotFoundError(id);
    const meta = JSON.parse(fs.readFileSync(metaPath(id), 'utf-8'));
    const buffer = fs.readFileSync(blobPath(id));
    return { meta, buffer };
  }

  /** @throws {LibraryFileNotFoundError} */
  function deleteFile(id) {
    if (!fs.existsSync(fileDir(id))) throw new LibraryFileNotFoundError(id);
    fs.rmSync(fileDir(id), { recursive: true, force: true });
  }

  return { saveFile, listFiles, getFile, deleteFile, libraryDir };
}

// mime types resolved as UTF-8 text and inlined as conversational context.
// Anything else (images, PDFs, binaries) is stored and referenced but not
// read — there is no OCR/extraction capability in Gaia yet, and pretending
// otherwise would mean silently sending garbled bytes to Hermes as if they
// were prose.
const TEXT_MIME_PREFIXES = ['text/'];
const TEXT_MIME_EXACT = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-yaml',
  'application/yaml',
]);
const MAX_ATTACHMENT_CHARS = 8000;

function isTextMime(mimeType) {
  const mt = String(mimeType || '').toLowerCase();
  return TEXT_MIME_PREFIXES.some((prefix) => mt.startsWith(prefix)) || TEXT_MIME_EXACT.has(mt);
}

/**
 * Resolves a turn's attached file ids into `{ filename, content }` pairs
 * ready to be rendered into a prompt (see turn.js's renderAttachmentContext).
 * `content` is `null` when the file isn't text-decodable — the caller
 * still learns the file was attached, just not what's in it. Never
 * throws: a missing or unreadable file is skipped, never breaks the turn
 * (same discipline as memory.js's recall/reflect).
 * @param {ReturnType<createLibraryStore>} store
 * @param {string[]} ids
 * @returns {Array<{ filename: string, content: string|null }>}
 */
function resolveAttachmentsForPrompt(store, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const results = [];
  for (const id of ids) {
    try {
      const { meta, buffer } = store.getFile(id);
      if (isTextMime(meta.mimeType)) {
        let content = buffer.toString('utf-8');
        if (content.length > MAX_ATTACHMENT_CHARS) {
          content = `${content.slice(0, MAX_ATTACHMENT_CHARS)}\n[truncated — file is longer than ${MAX_ATTACHMENT_CHARS} characters]`;
        }
        results.push({ filename: meta.filename, content });
      } else {
        results.push({ filename: meta.filename, content: null });
      }
    } catch (_) {
      // Missing/unreadable attachment — skip silently, never break the turn.
    }
  }
  return results;
}

module.exports = {
  createLibraryStore,
  resolveLibraryDir,
  resolveAttachmentsForPrompt,
  isTextMime,
  LibraryFileNotFoundError,
};
