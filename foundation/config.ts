import path from 'path';

/**
 * Resolved paths the Foundation Engine reads from and writes to.
 *
 * Every path defaults to today's monorepo layout (relative to `root`,
 * which itself defaults to `process.cwd()`), so running `foundation/`
 * exactly as before produces exactly the same output. Each can be
 * overridden independently — by CLI flag or environment variable — so
 * the engine can run from a different working directory, or against a
 * `docs/`/identity layout that no longer lives in this repository (the
 * situation Phase 1 of docs/split-plan.md creates once Gaia-Cloud is its
 * own repo and this engine still needs to reach its docs and its SOUL).
 */
export interface FoundationConfig {
  /** Base directory other defaults resolve against. */
  root: string;
  /** Directory holding the foundation markdown documents (excluding soul.md). */
  docsDir: string;
  /** Path to the canonical soul.md (identity lives in Gaia Cloud, not docs/). */
  soulPath: string;
  /** Where the built artifact.json is written. */
  artifactPath: string;
}

type Flags = Record<string, string | boolean>;

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split(/=(.*)/s);
    flags[key] = value === undefined ? true : value;
  }
  return flags;
}

/**
 * Resolves configuration from CLI flags, then environment variables, then
 * the monorepo defaults. CLI takes precedence over env so a one-off local
 * run can override a Docker/CI environment without editing it.
 *
 *   --root, --docs, --soul, --output   (flags)
 *   FOUNDATION_ROOT, FOUNDATION_DOCS_DIR, FOUNDATION_SOUL_PATH, FOUNDATION_ARTIFACT_PATH  (env)
 */
export function resolveConfig(argv: string[] = process.argv.slice(2)): FoundationConfig {
  const flags = parseFlags(argv);

  const pick = (flag: string, envVar: string): string | undefined => {
    const flagValue = flags[flag];
    if (typeof flagValue === 'string') return flagValue;
    return process.env[envVar];
  };

  const root = path.resolve(pick('root', 'FOUNDATION_ROOT') ?? process.cwd());
  const resolveAgainstRoot = (value: string | undefined, fallback: string) =>
    value ? (path.isAbsolute(value) ? value : path.resolve(root, value)) : path.join(root, fallback);

  return {
    root,
    docsDir: resolveAgainstRoot(pick('docs', 'FOUNDATION_DOCS_DIR'), 'docs'),
    soulPath: resolveAgainstRoot(
      pick('soul', 'FOUNDATION_SOUL_PATH'),
      path.join('services', 'gaia-api', 'identity', 'soul.md')
    ),
    artifactPath: resolveAgainstRoot(
      pick('output', 'FOUNDATION_ARTIFACT_PATH'),
      path.join('frontend', 'src', 'gaia', 'foundation', 'artifact.json')
    ),
  };
}
