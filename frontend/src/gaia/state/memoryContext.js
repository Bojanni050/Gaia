import { getMemoryProvider } from '../integration/memory';

const RECALL_TIMEOUT_MS = 4000;

/**
 * Recall relevant reflections for a query, best-effort. Never throws and
 * never blocks the conversation for long — if Hindsight is slow or
 * unreachable, Gaia simply proceeds without recalled context, the same
 * "fails invisibly" contract HermesProvider follows for reasoning
 * (architecture.md §10, "Backpressure & failure").
 *
 * @param {string} query
 * @returns {Promise<import('../../contracts/hindsight').Reflection[]>}
 */
export async function recallRelevantContext(query) {
  if (!query || !query.trim()) return [];
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

/**
 * Renders recalled reflections into a system-prompt block. Returns null
 * when there is nothing worth surfacing, so callers can skip adding an
 * empty system message.
 * @param {import('../../contracts/hindsight').Reflection[]} reflections
 * @returns {string|null}
 */
export function renderMemoryContext(reflections) {
  if (!reflections || reflections.length === 0) return null;
  const lines = reflections
    .filter((r) => r.summary)
    .map((r) => `- ${r.summary}`);
  if (lines.length === 0) return null;
  return [
    'From your long-term memory (Hindsight), things you have come to understand',
    'that may be relevant to this conversation. Use only what genuinely applies;',
    'do not force it in, and do not announce that you are consulting memory.',
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
 *
 * @param {{ conversationId: string, userText: string, assistantText: string, assistantMessageId: string }} turn
 */
export function reflectOnTurn({ conversationId, userText, assistantText, assistantMessageId }) {
  if (!userText || !assistantText) return;
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
