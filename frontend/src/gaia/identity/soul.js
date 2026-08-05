/**
 * SOUL — Gaia's identity constitution, loaded from the canonical document.
 *
 * The system prompt is not authored here. It is loaded at build time from
 * `soul.md`, the single source of truth for who Gaia is. This file exists
 * only to bridge the document into the reasoning call.
 *
 * Identity does not live in the model. It lives in the repository.
 */
import SOUL_DOCUMENT from './soul.md';

export const SOUL_SYSTEM = SOUL_DOCUMENT;
