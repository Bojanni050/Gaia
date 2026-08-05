/**
 * Gaia-language phrases for reasoning failure modes.
 *
 * The reasoning layer raises typed errors; the desktop translates them into
 * calm phrases a person would actually want to read. No "500 Internal Server
 * Error", no stack traces, no provider names.
 */
import { ReasoningUnavailableError, ReasoningAbortedError } from '../integration/reasoning/errors';

const QUIET_PHRASES = {
  unavailable: "I couldn't reach my reason engine. Take your time — I'm here when you're ready to try again.",
  aborted: 'Stopped.',
};

export function phraseReasoningError(err) {
  if (err instanceof ReasoningAbortedError) return QUIET_PHRASES.aborted;
  if (err instanceof ReasoningUnavailableError) return QUIET_PHRASES.unavailable;
  return QUIET_PHRASES.unavailable;
}
