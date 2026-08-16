/**
 * reasonIQ.js — Logos's reasonIQ faculty, orchestration/facade.
 *
 * architecture.md §4.2: reasonIQ determines what a turn means, how to
 * reason about it, and what conclusions follow. It consumes intentIQ's
 * IntentDecision, constructs a validated ReasoningResult, and stops — it
 * never answers the user, never executes a capability, never chooses a
 * provider, and never becomes the orchestrator or Gaia herself. Gaia
 * decides what to do with the result.
 *
 * Like intentIQ, this talks to the generic reasoning-provider abstraction
 * (integration/reasoning) — never to Hermes directly. Swapping the
 * provider changes nothing about the contract callers depend on.
 */
import { getReasoningProvider } from '../../integration/reasoning';
import { buildReasoningPrompt } from './prompt';
import { validateReasoningResult, fallbackReasoningResult } from './schema';
import { parseJsonResponse } from '../shared/parseJsonResponse';

function devWarn(reason, detail) {
  if (process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.warn(`[Logos:reasonIQ] ${reason}`, detail ?? '');
}

/**
 * Constructs a validated ReasoningResult from intentIQ's IntentDecision and
 * whatever evidence is already available.
 *
 * Never throws: provider failure, malformed output, and schema violations
 * all resolve to a safe fallback result (confidence 0, uncertainty stated
 * plainly) so a failure here never breaks the surrounding conversation.
 *
 * Does not retrieve memory itself — architecture.md §7 of this
 * implementation's brief: memory retrieval is an explicit capability
 * decision made before reasoning (see state/memoryPolicy.js's recall gate),
 * not something reasonIQ triggers on its own. Pass whatever was already
 * retrieved via context.recalledMemory; if nothing was retrieved, reasonIQ
 * reasons from the evidence it has rather than assuming nothing exists.
 *
 * @param {import('../intentIQ/schema').IntentDecisionSchema} intentDecision
 * @param {{ role: string, content: string }[]} messages conversation so far, most recent last
 * @param {{
 *   recalledMemory?: import('../../../contracts/hindsight').Reflection[],
 *   existingHypotheses?: Array<{ statement: string, confidence: number, status: string, verificationPlan?: string }>,
 *   attachments?: Array<{ name?: string, type?: string }>,
 *   provider?: import('../../integration/reasoning').ReasoningProvider,
 *   signal?: AbortSignal,
 * }} [context]
 * @returns {Promise<import('./schema').ReasoningResultSchema extends infer T ? T : never>}
 */
export async function reasonAboutTurn(intentDecision, messages, context = {}) {
  const provider = context.provider || getReasoningProvider();
  const prompt = buildReasoningPrompt(intentDecision, messages, context);

  let raw;
  try {
    raw = await provider.chat(prompt, { signal: context.signal });
  } catch (e) {
    devWarn('provider failure', e?.message || e);
    return fallbackReasoningResult();
  }

  const parsed = parseJsonResponse(raw);
  if (parsed === undefined) {
    devWarn('malformed JSON output', raw);
    return fallbackReasoningResult();
  }

  const validated = validateReasoningResult(parsed);
  if (!validated.ok) {
    devWarn('schema validation failed', validated.issues);
    return fallbackReasoningResult();
  }

  return validated.result;
}
