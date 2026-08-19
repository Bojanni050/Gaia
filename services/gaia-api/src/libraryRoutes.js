'use strict';

/**
 * File library API — upload, list, download, delete. Reached by any Gaia
 * client through the same bearer auth as `/conversation/turn` (Desktop
 * reaches it through a dedicated Rust command, not the generic
 * `server_request` seam, since file bytes need multipart/binary
 * transport — see gaia-desktop's `src-tauri/src/library/mod.rs`).
 *
 * Routes (mounted under /library, all Bearer-auth required):
 *   POST   /library/files       multipart, field "file" -> { id, filename, mimeType, size, uploadedAt }
 *   GET    /library/files       -> { files: [...] }
 *   GET    /library/files/:id   -> raw file bytes, Content-Type/Content-Disposition set from stored metadata
 *   DELETE /library/files/:id   -> 204
 */
const express = require('express');
const multer = require('multer');
const { LibraryFileNotFoundError } = require('./library');

const DEFAULT_MAX_FILE_SIZE_MB = 25;

/**
 * @param {{
 *   store: ReturnType<import('./library').createLibraryStore>,
 *   auth: import('express').RequestHandler,
 *   maxFileSizeMb?: number,
 * }} deps
 */
function createLibraryRouter({ store, auth, maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Math.round(maxFileSizeMb * 1024 * 1024), files: 1 },
  });

  router.post('/files', auth, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `file exceeds the ${maxFileSizeMb}MB limit` });
        }
        return res.status(400).json({ error: 'upload failed' });
      }
      if (err) {
        return res.status(400).json({ error: 'upload failed' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'no file was supplied (expected multipart field "file")' });
      }

      const meta = store.saveFile(req.file.buffer, {
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      res.status(201).json(meta);
    });
  });

  router.get('/files', auth, (req, res) => {
    res.json({ files: store.listFiles() });
  });

  router.get('/files/:id', auth, (req, res) => {
    try {
      const { meta, buffer } = store.getFile(req.params.id);
      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(meta.filename)}"`);
      res.send(buffer);
    } catch (err) {
      if (err instanceof LibraryFileNotFoundError) {
        return res.status(404).json({ error: 'file not found' });
      }
      res.status(500).json({ error: 'could not read file' });
    }
  });

  router.delete('/files/:id', auth, (req, res) => {
    try {
      store.deleteFile(req.params.id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof LibraryFileNotFoundError) {
        return res.status(404).json({ error: 'file not found' });
      }
      res.status(500).json({ error: 'could not delete file' });
    }
  });

  return router;
}

module.exports = { createLibraryRouter, DEFAULT_MAX_FILE_SIZE_MB };
