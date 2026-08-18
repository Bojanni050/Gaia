import fs from 'fs';
import path from 'path';
import { FoundationConfig } from './config';

// soul.md's canonical source is the identity layer, not docs/ (docs/soul.md is
// an architectural overview of SOUL, not the constitution itself). The
// constitution is owned by Gaia Cloud (services/gaia-api/identity) — see
// FoundationConfig.soulPath.

/**
 * Reads a foundation markdown document from disk and validates its existence.
 */
export function loadDocument(filename: string, config: FoundationConfig): string {
  const filePath = filename === 'soul.md' ? config.soulPath : path.join(config.docsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Foundation Loader: Could not find document at ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}
