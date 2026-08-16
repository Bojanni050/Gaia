/**
 * intentIQ.js — Logos's intentIQ faculty, orchestration/facade.
 *
 * architecture.md §4.2: intentIQ interprets what the user is trying to
 * achieve. It never answers the user, never executes a capability, never
 * chooses a provider, and never becomes the orchestrator — it hands Gaia a
 * validated IntentDecision and stops (see schema.js for the contract).
 *
 * This talks to the generic reasoning-provider abstraction
 * (integration/reasoning), the same seam the rest of Gaia Desktop uses for
 * reasoning — never to Hermes directly. Swapping the provider, or later
 * replacing this whole module with a hybrid semantic classifier, changes
 * nothing about the contract callers depend on.
 */
import { getReasoningProvider } from '../../integration/reasoning';
import { buildIntentPrompt } from './prompt';
import { validateIntentDecision, fallbackDecision } from './schema';
import { parseJsonResponse } from '../shared/parseJsonResponse';

function devWarn(reason, detail) {
  if (process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.warn(`[Logos:intentIQ] ${reason}`, detail ?? '');
}

/**
 * Interprets a user turn and returns a validated IntentDecision.
 *
 * Never throws: provider failure, malformed output, and schema violations
 * all resolve to a safe fallback decision (status "unknown") so a failure
 * here never breaks the surrounding conversation.
 *
 * @param {{ role: string, content: string }[]} messages conversation so far, most recent last
 * @param {{ attachments?: Array<{ name?: string, type?: string }>, provider?: import('../../integration/reasoning').ReasoningProvider, signal?: AbortSignal }} [options]
 * @returns {Promise<import('./schema').IntentDecisionSchema extends infer T ? T : never>}
 */
export async function interpretIntent(messages, options = {}) {
  const provider = options.provider || getReasoningProvider();
  const prompt = buildIntentPrompt(messages, options);

  let raw;
  try {
    raw = await provider.chat(prompt, { signal: options.signal });
  } catch (e) {
    devWarn('provider failure', e?.message || e);
    return fallbackDecision();
  }

  const parsed = parseJsonResponse(raw);
  if (parsed === undefined) {
    devWarn('malformed JSON output', raw);
    return fallbackDecision();
  }

  const validated = validateIntentDecision(parsed);
  if (!validated.ok) {
    devWarn('schema validation failed', validated.issues);
    return fallbackDecision();
  }

  return validated.decision;
}
