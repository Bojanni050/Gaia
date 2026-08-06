import fs from 'fs';
import path from 'path';

/**
 * Reads a markdown document from disk and validates its existence.
 */
export function loadDocument(filename: string, rootDir: string = process.cwd()): string {
  const filePath = path.join(rootDir, 'docs', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Foundation Loader: Could not find document at `);
  }
  
  return fs.readFileSync(filePath, 'utf-8');
}
