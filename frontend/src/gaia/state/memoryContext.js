import { getMemoryProvider } from '../integration/memory';
import { shouldRecall, shouldReflect } from './memoryPolicy';

const RECALL_TIMEOUT_MS = 4000;

/**
 * Recall relevant reflections for a query, best-effort. Never throws and
 * never blocks the conversation for long — if Hindsight is slow or
 * unreachable, Gaia simply proceeds without recalled context, the same
 * "fails invisibly" contract HermesProvider follows for reasoning
 * (architecture.md §10, "Backpressure & failure"). Skips the call entirely
 * for turns memoryPolicy judges too trivial to be worth a lookup.
 *
 * @param {string} query
 * @returns {Promise<import('../../contracts/hindsight').Reflection[]>}
 */
export async function recallRelevantContext(query) {
  if (!query || !query.trim()) return [];
  if (!shouldRecall(query)) return [];
  try {
    const provider = getMemoryProvider();
    const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(RECALL_TIMEOUT_MS)
      : undefined;
    return await provider.retrieveRelevantContext(query, { signal, budget: 'low' });
  } catch (_) {
    return [];
  }
}

const MAX_MEMORY_LINES = 6;
const UNCERTAIN_CONFIDENCE_THRESHOLD = 0.55;

function normalizeSummary(summary) {
  return (summary || '').replace(/\s+/g, ' ').trim();
}

/**
 * Formats a single reflection into a compact line, preserving — never
 * inventing or upgrading — its epistemic status. A reflection recalled with
 * low confidence is tagged "(uncertain)" rather than stated as settled fact
 * (architecture.md §6.1's "never presented as a fact" rule, applied here to
 * whatever confidence Hindsight returned with the recall, not just to a
 * formal Hypothesis record). Returns null for anything with no summary to
 * show, so callers can filter it out.
 * @param {import('../../contracts/hindsight').Reflection} reflection
 * @returns {string|null}
 */
function formatReflectionLine(reflection) {
  const summary = normalizeSummary(reflection?.summary);
  if (!summary) return null;
  const isUncertain = typeof reflection.confidence === 'number' && reflection.confidence < UNCERTAIN_CONFIDENCE_THRESHOLD;
  return isUncertain ? `- ${summary} (uncertain)` : `- ${summary}`;
}

/**
 * Condenses raw Hindsight recall results into the compact lines Gaia's
 * reasoning is actually given — never the raw provider response. No
 * metadata, IDs, timestamps, or provenance fields cross this boundary; only
 * the summary text and its confidence-derived certainty tag do. This is a
 * formatting operation, not a reasoning one: it never merges, resolves, or
 * picks between differing/conflicting summaries — each stays its own line
 * so Logos still sees the disagreement, and it never invents content that
 * isn't in the recalled summary.
 *
 * @param {import('../../contracts/hindsight').Reflection[]} reflections
 * @returns {string[]}
 */
export function condenseMemoryContext(reflections) {
  if (!reflections || reflections.length === 0) return [];
  const seen = new Set();
  const lines = [];
  for (const reflection of reflections) {
    const line = formatReflectionLine(reflection);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
    if (lines.length >= MAX_MEMORY_LINES) break;
  }
  return lines;
}

/**
 * Renders recalled reflections into a system-prompt block. Returns null
 * when there is nothing worth surfacing, so callers can skip adding an
 * empty system message.
 * @param {import('../../contracts/hindsight').Reflection[]} reflections
 * @returns {string|null}
 */
export function renderMemoryContext(reflections) {
  const lines = condenseMemoryContext(reflections);
  if (lines.length === 0) return null;
  return [
    'From your long-term memory (Hindsight), things you have come to understand',
    'that may be relevant to this conversation. Use only what genuinely applies;',
    'do not force it in, and do not announce that you are consulting memory.',
    'Items marked (uncertain) are not confirmed — hold them as a possibility,',
    'not a settled fact.',
    '',
    ...lines,
  ].join('\n');
}

/**
 * Reflects on a completed turn. Fire-and-forget by design — reflection is
 * asynchronous (architecture.md §10, the REFLECT step happens after
 * COMPLETE) and must never delay or fail a conversation. Failures are
 * swallowed; Hindsight's own retain extracts what's actually significant,
 * so passing the raw exchange is reflection, not logging, in practice.
 * Skips the call entirely when memoryPolicy judges the whole exchange too
 * trivial to be worth writing — see memoryPolicy.js for what that means.
 *
 * @param {{ conversationId: string, userText: string, assistantText: string, assistantMessageId: string }} turn
 */
export function reflectOnTurn({ conversationId, userText, assistantText, assistantMessageId }) {
  if (!userText || !assistantText) return;
  if (!shouldReflect(userText, assistantText)) return;
  const provider = getMemoryProvider();
  provider.storeReflection({
    domain: 'context',
    summary: `Bo: ${userText}\n\nGaia: ${assistantText}`,
    provenance: {
      conversation_id: conversationId,
      source_message_id: assistantMessageId,
      observed_at: new Date().toISOString(),
    },
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('reflection failed (non-fatal):', err?.message || err);
  });
}
