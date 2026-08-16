import { shouldRecall, shouldReflect, MEMORY_POLICY } from '../memoryPolicy';

describe('shouldRecall', () => {
  test('skips empty or whitespace-only queries', () => {
    expect(shouldRecall('')).toBe(false);
    expect(shouldRecall('   ')).toBe(false);
  });

  test('skips whole-message filler regardless of case/punctuation', () => {
    expect(shouldRecall('ok')).toBe(false);
    expect(shouldRecall('Ok.')).toBe(false);
    expect(shouldRecall('THANKS!')).toBe(false);
    expect(shouldRecall('  sure  ')).toBe(false);
  });

  test('does not treat filler as a substring match', () => {
    expect(shouldRecall('ok, but why does Hermes retry twice?')).toBe(true);
  });

  test('skips very short queries below the length threshold', () => {
    expect(shouldRecall('why')).toBe(false); // 3 chars, under default 12
  });

  test('keeps substantive queries', () => {
    expect(shouldRecall('What theme should I use tonight?')).toBe(true);
    expect(shouldRecall('Remind me what I said about the migration plan')).toBe(true);
  });
});

describe('shouldReflect', () => {
  test('skips when both sides are filler', () => {
    expect(shouldReflect('thanks', "you're welcome")).toBe(false);
  });

  test('skips when both sides are short', () => {
    expect(shouldReflect('why', 'no reason')).toBe(false);
  });

  test('keeps the exchange when the user side is substantive, even if the reply is short', () => {
    expect(shouldReflect('I always work better after midnight, remember that', 'Noted.')).toBe(true);
  });

  test('keeps the exchange when the assistant side is substantive, even if the user side is short', () => {
    expect(shouldReflect('why', 'Because you mentioned last week you prefer async updates over meetings.')).toBe(true);
  });

  test('keeps two substantive sides', () => {
    expect(shouldReflect(
      'I think I want to switch the whole stack to TypeScript next quarter',
      'That tracks with what you said about wanting stricter contracts.',
    )).toBe(true);
  });
});

describe('MEMORY_POLICY', () => {
  test('exposes the active thresholds', () => {
    expect(MEMORY_POLICY.minRecallLength).toBeGreaterThan(0);
    expect(MEMORY_POLICY.minReflectLength).toBeGreaterThan(0);
  });
});
