/**
 * Gaia-language phrases for reasoning failure modes.
 *
 * The reasoning layer raises typed errors; the desktop translates them into
 * calm phrases a person would actually want to read. No "500 Internal Server
 * Error", no stack traces, no provider names.
 */
import { ReasoningUnavailableError, ReasoningAbortedError } from '../integration/reasoning/errors';

const QUIET_PHRASES = {
  nl: {
    unavailable: "Ik kan mijn denkmotor momenteel niet bereiken. Neem je tijd — ik ben er als je klaar bent om het opnieuw te proberen.",
    aborted: 'Gestopt.',
  },
  en: {
    unavailable: "I couldn't reach my reason engine. Take your time — I'm here when you're ready to try again.",
    aborted: 'Stopped.',
  }
};

export function phraseReasoningError(err) {
  const currentLang = localStorage.getItem('gaia.lang') || 'nl';
  const phrases = QUIET_PHRASES[currentLang] || QUIET_PHRASES.nl;

  if (err instanceof ReasoningAbortedError) return phrases.aborted;
  if (err instanceof ReasoningUnavailableError) return phrases.unavailable;
  return phrases.unavailable;
}
