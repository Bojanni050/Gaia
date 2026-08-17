import fs from 'fs';
import path from 'path';

// soul.md's canonical source is the identity layer, not docs/ (docs/soul.md is
// an architectural overview of SOUL, not the constitution itself). The
// constitution is owned by Gaia Cloud (services/gaia-api/identity); every
// other foundation document lives in docs/.
const IDENTITY_OVERRIDES: Record<string, string> = {
  'soul.md': path.join('services', 'gaia-api', 'identity', 'soul.md'),
};

/**
 * Reads a markdown document from disk and validates its existence.
 */
export function loadDocument(filename: string, rootDir: string = process.cwd()): string {
  const relativePath = IDENTITY_OVERRIDES[filename] ?? path.join('docs', filename);
  const filePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Foundation Loader: Could not find document at ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}
