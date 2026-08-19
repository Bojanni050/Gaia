'use strict';

/**
 * Policy-gated memory recall and reflection — a port of gaia-web's
 * state/memoryContext.js, calling hindsightClient.js instead of going
 * through a same-origin browser proxy (see that file's own comment).
 * Same rendering, same gating, same "never blocks or breaks the turn"
 * contract.
 */
const { shouldRecall, shouldReflect } = require('./memoryPolicy');

const MAX_MEMORY_LINES = 6;
const UNCERTAIN_CONFIDENCE_THRESHOLD = 0.55;

function normalizeSummary(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Reads Hindsight's own field names directly (`text`, `scores.final`) —
 * hindsightClient.js no longer renames these to `summary`/`confidence` on
 * the way in, so this is the one place that derives a renderable line
 * from them. `type`/`entities`/`tags`/`occurred*` ride along on each
 * reflection for future use (e.g. filtering by type) without needing
 * another round-trip through hindsightClient.js to add them.
 */
function formatReflectionLine(reflection) {
  const summary = normalizeSummary(reflection?.text);
  if (!summary) return null;
  const confidence = reflection?.scores?.final;
  const isUncertain = typeof confidence === 'number' && confidence < UNCERTAIN_CONFIDENCE_THRESHOLD;
  return isUncertain ? `- ${summary} (uncertain)` : `- ${summary}`;
}

/** @param {Array<{text: string, scores: {final: number|null}}>} reflections */
function condenseMemoryContext(reflections) {
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

/** @param {Array<{text: string, scores: {final: number|null}}>} reflections */
function renderMemoryContext(reflections) {
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
 * Best-effort recall, policy-gated. Never throws — a slow or unreachable
 * Hindsight, or a query the policy judges not worth a lookup, both
 * resolve to [] rather than failing or delaying the turn.
 * @param {ReturnType<import('./hindsightClient').createHindsightClient>} hindsight
 * @param {string} query
 */
async function recallRelevantContext(hindsight, query) {
  if (!query || !query.trim()) return [];
  if (!shouldRecall(query)) return [];
  try {
    return await hindsight.recall(query);
  } catch (_) {
    return [];
  }
}

/**
 * Fire-and-forget reflection, policy-gated. Callers must not await this
 * for turn completion — matches gaia-web's reflectOnTurn contract exactly.
 * @param {ReturnType<import('./hindsightClient').createHindsightClient>} hindsight
 * @param {{ conversationId: string, userText: string, assistantText: string, assistantMessageId: string }} turn
 */
function reflectOnTurn(hindsight, { conversationId, userText, assistantText, assistantMessageId }) {
  if (!userText || !assistantText) return;
  if (!shouldReflect(userText, assistantText)) return;
  hindsight.reflect({
    domain: 'context',
    summary: `Bo: ${userText}\n\nGaia: ${assistantText}`,
    provenance: {
      conversation_id: conversationId,
      source_message_id: assistantMessageId,
      observed_at: new Date().toISOString(),
    },
  }).catch((err) => {
    console.warn(`reflection failed (non-fatal): ${err.message}`);
  });
}

module.exports = { condenseMemoryContext, renderMemoryContext, recallRelevantContext, reflectOnTurn };
