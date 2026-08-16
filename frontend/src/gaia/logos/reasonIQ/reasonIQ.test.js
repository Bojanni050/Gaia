import { reasonAboutTurn } from './reasonIQ';
import { fallbackReasoningResult } from './schema';

function userMsg(content) {
  return { role: 'user', content };
}
function assistantMsg(content) {
  return { role: 'assistant', content };
}

function providerReturning(text) {
  return { chat: jest.fn().mockResolvedValue(text) };
}
function providerRejecting(error) {
  return { chat: jest.fn().mockRejectedValue(error) };
}
function providerReturningJson(obj) {
  return providerReturning(JSON.stringify(obj));
}

const CLEAR_INTENT = {
  intent: 'technical.debug',
  intentFamily: 'technical',
  status: 'accepted',
  confidence: 0.9,
  candidates: [{ intent: 'technical.debug', confidence: 0.9 }],
  entities: [{ type: 'service', value: 'deployment' }],
  sourceOfTruth: 'conversation',
  capability: 'hermes',
  reasoningProfile: 'technical',
  needsClarification: false,
};

const AMBIGUOUS_INTENT = {
  intent: null,
  intentFamily: 'unknown',
  status: 'ambiguous',
  confidence: 0.5,
  candidates: [
    { intent: 'technical.design', confidence: 0.52 },
    { intent: 'technical.implement', confidence: 0.49 },
  ],
  entities: [],
  sourceOfTruth: 'conversation',
  capability: 'hermes',
  reasoningProfile: 'technical',
  needsClarification: true,
};

const BASE_RESULT = {
  interpretation: 'The user wants the deployment failure diagnosed.',
  evidence: [
    { kind: 'fact', statement: 'The deployment has failed repeatedly.', source: 'conversation', confidence: 1 },
  ],
  uncertainties: [],
  contradictions: [],
  missingInformation: [],
  conclusions: [
    { statement: 'The build step is likely timing out.', confidence: 0.7 },
  ],
  hypotheses: [],
  capabilityImplication: { suggested: 'hermes', reason: 'Diagnosing the failure requires reasoning over the build logs.' },
  recommendedNextSteps: ['Inspect the build step timeout configuration.'],
  reasoningProfile: 'technical',
  clarificationRecommended: false,
  clarificationQuestion: null,
  confidence: 0.75,
};

describe('reasonAboutTurn — straightforward reasoning', () => {
  test('constructs a validated ReasoningResult from a clear IntentDecision', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(result).toEqual(BASE_RESULT);
  });

  test('sends the IntentDecision to the provider so reasonIQ reasons within its context', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    const promptSent = provider.chat.mock.calls[0][0];
    const userTurn = promptSent.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('technical.debug');
    expect(userTurn).toContain('status: accepted');
  });
});

describe('reasonAboutTurn — ambiguity and low confidence', () => {
  test('preserves ambiguity from intentIQ rather than reasoning as if the intent were certain', async () => {
    const result = {
      ...BASE_RESULT,
      interpretation: 'Unclear whether the user wants a design discussion or an implementation change.',
      uncertainties: ['Whether the user wants a design discussion or an implementation.'],
      clarificationRecommended: true,
      clarificationQuestion: 'Do you want to discuss the approach, or have me implement it directly?',
      confidence: 0.4,
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(AMBIGUOUS_INTENT, [userMsg('Can you take a look at how this should work?')], { provider });
    expect(outcome.clarificationRecommended).toBe(true);
    expect(outcome.uncertainties.length).toBeGreaterThan(0);
    expect(outcome.confidence).toBeLessThan(0.6);
  });

  test('handles a low-confidence accepted intent by keeping overall confidence modest', async () => {
    const lowConfidenceIntent = { ...CLEAR_INTENT, confidence: 0.3 };
    const result = { ...BASE_RESULT, confidence: 0.35, uncertainties: ['intentIQ reported low confidence in this classification.'] };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(lowConfidenceIntent, [userMsg('fix it')], { provider });
    expect(outcome.confidence).toBeLessThan(0.5);
  });
});

describe('reasonAboutTurn — evidence, fact vs. inference vs. hypothesis', () => {
  test('distinguishes fact from inference in the evidence list', async () => {
    const result = {
      ...BASE_RESULT,
      evidence: [
        { kind: 'fact', statement: 'The user said the deployment fails every time.', source: 'conversation', confidence: 1 },
        { kind: 'inference', statement: 'The failure is likely related to a recent config change.', source: 'conversation', confidence: 0.6 },
      ],
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    const kinds = outcome.evidence.map((e) => e.kind);
    expect(kinds).toContain('fact');
    expect(kinds).toContain('inference');
  });

  test('forms a hypothesis distinct from confirmed evidence, carrying its own confidence', async () => {
    const result = {
      ...BASE_RESULT,
      hypotheses: [
        { statement: 'The user may be deploying from a stale branch.', confidence: 0.4, status: 'proposed', verificationPlan: 'Ask which branch was deployed.' },
      ],
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(outcome.hypotheses).toHaveLength(1);
    expect(outcome.hypotheses[0].status).toBe('proposed');
    expect(outcome.hypotheses[0].confidence).toBeLessThan(1);
  });

  test('a hypothesis is never silently represented among evidence as a fact', async () => {
    const result = {
      ...BASE_RESULT,
      evidence: [{ kind: 'hypothesis', statement: 'The database credentials may have rotated.', source: 'conversation', confidence: 0.3 }],
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(outcome.evidence[0].kind).toBe('hypothesis');
    expect(outcome.evidence[0].kind).not.toBe('fact');
  });
});

describe('reasonAboutTurn — existing hypothesis evaluation', () => {
  test('re-evaluates a supplied existing hypothesis against new evidence', async () => {
    const existingHypotheses = [
      { statement: 'Bo tends to deploy late at night.', confidence: 0.5, status: 'testing' },
    ];
    const result = {
      ...BASE_RESULT,
      hypotheses: [
        { statement: 'Bo tends to deploy late at night.', confidence: 0.75, status: 'testing', verificationPlan: 'Confirm across a few more deployments.' },
      ],
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider, existingHypotheses });

    const promptSent = provider.chat.mock.calls[0][0];
    const userTurn = promptSent.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('Bo tends to deploy late at night.');
    expect(outcome.hypotheses[0].confidence).toBeGreaterThan(existingHypotheses[0].confidence);
  });
});

describe('reasonAboutTurn — contradictions and missing information', () => {
  test('represents conflicting evidence explicitly rather than silently resolving it', async () => {
    const result = {
      ...BASE_RESULT,
      contradictions: ['Memory says the project uses PostgreSQL; the current message says MySQL.'],
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(outcome.contradictions).toHaveLength(1);
    expect(outcome.contradictions[0]).toContain('PostgreSQL');
    expect(outcome.contradictions[0]).toContain('MySQL');
  });

  test('a contradiction between recalled memory and current evidence is preserved', async () => {
    const recalledMemory = [{ id: 'r1', summary: 'The project database is PostgreSQL.', confidence: 0.9 }];
    const result = {
      ...BASE_RESULT,
      contradictions: ['Recalled memory states PostgreSQL, but the user just said they switched to MySQL.'],
    };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('We switched to MySQL, why does the deployment fail?')], { provider, recalledMemory });
    expect(outcome.contradictions.length).toBeGreaterThan(0);
  });

  test('names missing information that would materially change the conclusion', async () => {
    const result = { ...BASE_RESULT, missingInformation: ['Which environment (staging or production) the deployment is failing in.'] };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(outcome.missingInformation).toHaveLength(1);
  });
});

describe('reasonAboutTurn — memory availability', () => {
  test('reasons using explicitly retrieved memory when supplied', async () => {
    const recalledMemory = [{ id: 'r1', summary: 'Docker is used for local deployment.', confidence: 0.85 }];
    const result = { ...BASE_RESULT, evidence: [{ kind: 'fact', statement: 'Docker is used for local deployment.', source: 'understanding', confidence: 0.85 }] };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider, recalledMemory });

    const promptSent = provider.chat.mock.calls[0][0];
    const userTurn = promptSent.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('Docker is used for local deployment.');
    expect(outcome.evidence[0].source).toBe('understanding');
  });

  test('reasons from available evidence when no memory was retrieved, without claiming nothing exists', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    const promptSent = provider.chat.mock.calls[0][0];
    const userTurn = promptSent.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('this does not mean nothing relevant exists');
  });
});

describe('reasonAboutTurn — capability implications', () => {
  test('suggests a capability without executing anything', async () => {
    const result = { ...BASE_RESULT, capabilityImplication: { suggested: 'hindsight', reason: 'Confirming prior deployment history would help.' } };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(outcome.capabilityImplication.suggested).toBe('hindsight');
    expect(provider.chat).toHaveBeenCalledTimes(1); // only the reasoning call — nothing else was invoked
  });

  test('suggests no capability when none is needed', async () => {
    const result = { ...BASE_RESULT, capabilityImplication: { suggested: 'none', reason: null } };
    const provider = providerReturningJson(result);
    const outcome = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(outcome.capabilityImplication.suggested).toBe('none');
  });
});

describe('reasonAboutTurn — safe failure modes', () => {
  test('malformed JSON from the provider fails safe', async () => {
    const provider = providerReturning('not json at all {{{');
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('hello')], { provider });
    expect(result).toEqual(fallbackReasoningResult());
  });

  test('invalid enum values fail schema validation and fail safe', async () => {
    const provider = providerReturningJson({ ...BASE_RESULT, evidence: [{ kind: 'definitely_true', statement: 'x', source: 'conversation', confidence: 1 }] });
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('hello')], { provider });
    expect(result).toEqual(fallbackReasoningResult());
  });

  test('provider failure fails safe without throwing', async () => {
    const provider = providerRejecting(new Error('reason engine unreachable'));
    await expect(reasonAboutTurn(CLEAR_INTENT, [userMsg('hello')], { provider })).resolves.toEqual(fallbackReasoningResult());
  });

  test('fallback result preserves uncertainty rather than inventing certainty', async () => {
    const provider = providerRejecting(new Error('down'));
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('hello')], { provider });
    expect(result.confidence).toBe(0);
    expect(result.uncertainties.length).toBeGreaterThan(0);
    expect(result.hypotheses).toEqual([]);
    expect(result.conclusions).toEqual([]);
  });
});

describe('reasonAboutTurn — contract discipline', () => {
  test('never leaks a model/provider identifier in the result', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toMatch(/openai|gpt-|claude|llama|anthropic|ollama|deepseek|venice/);
    expect(Object.keys(result)).not.toContain('provider');
    expect(Object.keys(result)).not.toContain('model');
  });

  test('never produces a user-facing answer — output is the structured result only', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(result).not.toHaveProperty('answer');
    expect(result).not.toHaveProperty('response');
    expect(result).not.toHaveProperty('message');
  });

  test('never exposes a chain-of-thought/thinking field', async () => {
    const provider = providerReturningJson({ ...BASE_RESULT, thinking: 'step 1: consider the logs...' });
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    // extra fields are stripped by schema validation (zod default: strip unknown keys)
    expect(result).not.toHaveProperty('thinking');
  });

  test('the result never carries a Hindsight mutation or capability-execution instruction', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(result).not.toHaveProperty('storeReflection');
    expect(result).not.toHaveProperty('execute');
    expect(result).not.toHaveProperty('mcp');
    expect(provider.chat).toHaveBeenCalledTimes(1); // no follow-up capability call was made
  });

  test('does not mutate or reference SOUL', async () => {
    const provider = providerReturningJson(BASE_RESULT);
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(result).not.toHaveProperty('soul');
    expect(result).not.toHaveProperty('personality');
  });

  test('tolerates a provider that wraps JSON in a markdown code fence', async () => {
    const provider = providerReturning('```json\n' + JSON.stringify(BASE_RESULT) + '\n```');
    const result = await reasonAboutTurn(CLEAR_INTENT, [userMsg('Why does my deployment keep failing?')], { provider });
    expect(result).toEqual(BASE_RESULT);
  });

  test('uses recent conversation context, not just the latest message', async () => {
    const history = [
      userMsg('Why does my deployment keep failing?'),
      assistantMsg('Looks like the build step is timing out.'),
      userMsg('Okay, can you fix that?'),
    ];
    const provider = providerReturningJson(BASE_RESULT);
    await reasonAboutTurn(CLEAR_INTENT, history, { provider });
    const promptSent = provider.chat.mock.calls[0][0];
    const userTurn = promptSent.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('build step is timing out');
    expect(userTurn).toContain('Okay, can you fix that?');
  });
});
