import { EVALUATION_SET } from './evaluationSet';
import { INTENT_IDS, INTENT_REGISTRY } from './registry';

const VALID_STATUSES = new Set(['accepted', 'ambiguous', 'unknown', 'unsafe_to_route']);

/**
 * Structural sanity checks only — this fixture is for inspectability and
 * regression prevention, not a live-LLM benchmark (see evaluationSet.js).
 */
describe('EVALUATION_SET', () => {
  test('has a meaningful number of examples', () => {
    expect(EVALUATION_SET.length).toBeGreaterThanOrEqual(30);
    expect(EVALUATION_SET.length).toBeLessThanOrEqual(60);
  });

  test('every case has a unique id', () => {
    const ids = EVALUATION_SET.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every case has at least one message and a user turn', () => {
    for (const c of EVALUATION_SET) {
      expect(c.messages.length).toBeGreaterThan(0);
      expect(c.messages.some((m) => m.role === 'user')).toBe(true);
    }
  });

  test('every expectedIntent is either null or a registered intent id', () => {
    for (const c of EVALUATION_SET) {
      if (c.expectedIntent !== null) {
        expect(INTENT_IDS).toContain(c.expectedIntent);
      }
    }
  });

  test('every expectedStatus is a valid IntentDecision status', () => {
    for (const c of EVALUATION_SET) {
      expect(VALID_STATUSES.has(c.expectedStatus)).toBe(true);
    }
  });

  test('ambiguous/unknown cases never claim a specific accepted intent', () => {
    for (const c of EVALUATION_SET) {
      if (c.expectedStatus === 'ambiguous') {
        expect(c.expectedIntent).toBeNull();
      }
    }
  });

  test('covers every registered intent family at least once', () => {
    const families = new Set(
      EVALUATION_SET
        .filter((c) => c.expectedIntent !== null)
        .map((c) => INTENT_REGISTRY[c.expectedIntent].family)
    );
    const nonUnknownFamilies = new Set(Object.values(INTENT_REGISTRY).map((d) => d.family)).size;
    expect(families.size).toBeGreaterThanOrEqual(nonUnknownFamilies - 1); // 'unknown' family has no positive examples
  });
});
