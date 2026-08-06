import { phraseReasoningError } from '../errorPhrases';
import {
  ReasoningUnavailableError,
  ReasoningAbortedError,
} from '../../integration/reasoning/errors';

describe('phraseReasoningError', () => {
  beforeAll(() => {
    localStorage.setItem('gaia.lang', 'en');
  });

  afterAll(() => {
    localStorage.removeItem('gaia.lang');
  });
  test('returns the calm unreachable phrase', () => {
    const phrase = phraseReasoningError(new ReasoningUnavailableError());
    expect(phrase).toMatch(/reason engine/);
    expect(phrase).not.toMatch(/500|HTTP|stack/);
  });

  test('returns the stopped phrase on abort', () => {
    expect(phraseReasoningError(new ReasoningAbortedError())).toBe('Stopped.');
  });

  test('falls back to the unreachable phrase for unknown errors', () => {
    const phrase = phraseReasoningError(new Error('anything weird'));
    expect(phrase).toMatch(/reason engine/);
  });
});
