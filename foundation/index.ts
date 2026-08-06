import fs from 'fs';
import path from 'path';
import { FoundationBuilder } from './builder';

const ARTIFACT_PATH = path.join(process.cwd(), 'frontend', 'src', 'gaia', 'foundation', 'artifact.json');
const DOCS_DIR = path.join(process.cwd(), 'docs');

function buildArtifact() {
  console.log('Foundation Engine: Building foundation artifact...');
  try {
    FoundationBuilder.preload();
    const documents = FoundationBuilder.buildDictionary();
    
    // Ensure the output directory exists
    const dir = path.dirname(ARTIFACT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the JSON artifact
    fs.writeFileSync(ARTIFACT_PATH, JSON.stringify({ documents }, null, 2), 'utf-8');
    console.log(`Foundation Engine: Successfully wrote artifact to ${ARTIFACT_PATH}`);
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
  console.log(`Foundation Engine: Watching for changes in ${DOCS_DIR}...`);
  
  let debounceTimeout: NodeJS.Timeout | null = null;
  
  fs.watch(DOCS_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        console.log(`Foundation Engine: Detected change in ${filename}, rebuilding...`);
        buildArtifact();
      }, 100);
    }
  });
}
