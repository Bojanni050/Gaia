import { EVALUATION_SET } from './evaluationSet';
import { IntentDecisionSchema } from '../intentIQ/schema';

/**
 * Structural sanity checks only — this fixture is for inspectability and
 * regression prevention, not a live-LLM benchmark (see evaluationSet.js).
 */
describe('reasonIQ EVALUATION_SET', () => {
  test('has a meaningful number of examples', () => {
    expect(EVALUATION_SET.length).toBeGreaterThanOrEqual(10);
    expect(EVALUATION_SET.length).toBeLessThanOrEqual(30);
  });

  test('every case has a unique id', () => {
    const ids = EVALUATION_SET.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every case carries a schema-valid IntentDecision', () => {
    for (const c of EVALUATION_SET) {
      const result = IntentDecisionSchema.safeParse(c.intentDecision);
      expect(result.success).toBe(true);
    }
  });

  test('every case has at least one message and a user turn', () => {
    for (const c of EVALUATION_SET) {
      expect(c.messages.length).toBeGreaterThan(0);
      expect(c.messages.some((m) => m.role === 'user')).toBe(true);
    }
  });

  test('every case states a plain-language expectation', () => {
    for (const c of EVALUATION_SET) {
      expect(typeof c.expectation).toBe('string');
      expect(c.expectation.length).toBeGreaterThan(10);
    }
  });

  test('covers both cases with and without supplied context (memory/hypotheses)', () => {
    const withContext = EVALUATION_SET.filter((c) => c.context && (c.context.recalledMemory || c.context.existingHypotheses));
    const withoutContext = EVALUATION_SET.filter((c) => !c.context);
    expect(withContext.length).toBeGreaterThan(0);
    expect(withoutContext.length).toBeGreaterThan(0);
  });
});
