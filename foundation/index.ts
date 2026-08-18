import fs from 'fs';
import path from 'path';
import { FoundationBuilder } from './builder';
import { FoundationCache } from './cache';
import { resolveConfig } from './config';

const config = resolveConfig();
const cache = new FoundationCache(config);

function buildArtifact() {
  console.log('Foundation Engine: Building foundation artifact...');
  try {
    FoundationBuilder.preload(cache);
    const documents = FoundationBuilder.buildDictionary(cache);

    // Ensure the output directory exists
    const dir = path.dirname(config.artifactPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the JSON artifact
    fs.writeFileSync(config.artifactPath, JSON.stringify({ documents }, null, 2), 'utf-8');
    console.log(`Foundation Engine: Successfully wrote artifact to ${config.artifactPath}`);
  } catch (err) {
    console.error('Foundation Engine: Failed to build artifact.', err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch');

// Initial build
buildArtifact();

if (isWatchMode) {
  const soulDir = path.dirname(config.soulPath);
  console.log(`Foundation Engine: Watching for changes in ${config.docsDir} and ${soulDir}...`);

  let debounceTimeout: NodeJS.Timeout | null = null;

  const scheduleRebuild = (filename: string) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
      console.log(`Foundation Engine: Detected change in ${filename}, rebuilding...`);
      buildArtifact();
    }, 100);
  };

  fs.watch(config.docsDir, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      scheduleRebuild(filename);
    }
  });

  fs.watch(soulDir, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      scheduleRebuild(filename);
    }
  });
}
