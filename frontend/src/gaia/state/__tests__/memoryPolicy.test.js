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

  test('skips very short queries below the length threshold', () => {
    expect(shouldRecall('why')).toBe(false); // 3 chars, under default 12
  });

  test('skips a substantive question answerable from the current conversation — no past/durable signal', () => {
    expect(shouldRecall('What theme should I use tonight?')).toBe(false);
    expect(shouldRecall('What time zone are you usually working in?')).toBe(false);
    expect(shouldRecall("How's your day going?")).toBe(false);
  });

  test('recalls when the turn explicitly refers to the past (English)', () => {
    expect(shouldRecall('Remind me what I said about the migration plan')).toBe(true);
    expect(shouldRecall('Do you remember why I switched jobs?')).toBe(true);
    expect(shouldRecall('Last time we talked about this, what did we decide?')).toBe(true);
    expect(shouldRecall('You said something about this before, what was it?')).toBe(true);
  });

  test('recalls when the turn explicitly refers to the past (Dutch)', () => {
    expect(shouldRecall('Weet je nog wat ik eerder zei over dit project?')).toBe(true);
    expect(shouldRecall('Je zei vorige keer iets over de database')).toBe(true);
  });

  test('recalls when the turn references durable, cross-conversation context', () => {
    expect(shouldRecall('What did we decide about the project database?')).toBe(true);
    expect(shouldRecall('Which server is the deployment configuration pointing at?')).toBe(true);
    expect(shouldRecall('What is my preference for how we structure the workflow?')).toBe(true);
  });

  test('does not treat filler as a substring match', () => {
    expect(shouldRecall('ok, but why does Hermes retry twice?')).toBe(false); // substantive, but no memory signal
  });

  test('does not false-positive on substrings of signal words', () => {
    expect(shouldRecall('Can you explain this projection of quarterly numbers?')).toBe(false); // "projection" contains "project"
    expect(shouldRecall('What happens beforehand in this function?')).toBe(false); // "beforehand" contains "before"
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
