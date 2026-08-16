import { interpretIntent } from './intentIQ';
import { fallbackDecision } from './schema';

function userMsg(content) {
  return { role: 'user', content };
}
function assistantMsg(content) {
  return { role: 'assistant', content };
}

/** A fake ReasoningProvider whose chat() resolves to a fixed string. */
function providerReturning(text) {
  return { chat: jest.fn().mockResolvedValue(text) };
}
function providerRejecting(error) {
  return { chat: jest.fn().mockRejectedValue(error) };
}
function providerReturningJson(obj) {
  return providerReturning(JSON.stringify(obj));
}

const BASE_DECISION = {
  intent: 'technical.implement',
  intentFamily: 'technical',
  status: 'accepted',
  confidence: 0.91,
  candidates: [
    { intent: 'technical.implement', confidence: 0.91 },
    { intent: 'technical.design', confidence: 0.54 },
  ],
  entities: [{ type: 'component', value: 'theme switcher' }],
  sourceOfTruth: 'conversation',
  capability: 'hermes',
  reasoningProfile: 'technical',
  needsClarification: false,
};

describe('interpretIntent — accepted intents', () => {
  test('returns a validated decision for a straightforward technical.implement turn', async () => {
    const provider = providerReturningJson(BASE_DECISION);
    const decision = await interpretIntent([userMsg('Can you change this React component?')], { provider });
    expect(decision).toEqual(BASE_DECISION);
  });

  test('ordinary conversation resolves to capability "none"', async () => {
    const decision = {
      ...BASE_DECISION,
      intent: 'chat.general',
      intentFamily: 'chat',
      candidates: [{ intent: 'chat.general', confidence: 0.95 }],
      entities: [],
      capability: 'none',
      reasoningProfile: 'calm',
    };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('What theme should I use tonight?')], { provider });
    expect(result.capability).toBe('none');
    expect(result.intent).toBe('chat.general');
  });

  test('memory recall routes to the hindsight capability, not hermes', async () => {
    const decision = {
      ...BASE_DECISION,
      intent: 'memory.recall',
      intentFamily: 'memory',
      candidates: [{ intent: 'memory.recall', confidence: 0.88 }],
      entities: [],
      capability: 'hindsight',
      reasoningProfile: 'calm',
    };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('What did I tell you about my project last week?')], { provider });
    expect(result.intent).toBe('memory.recall');
    expect(result.capability).toBe('hindsight');
  });
});

describe('interpretIntent — topic vs. intent distinction', () => {
  test('"how does this work" and "can you change this" on the same topic yield different intents', async () => {
    const explainProvider = providerReturningJson({
      ...BASE_DECISION,
      intent: 'technical.explain',
      candidates: [{ intent: 'technical.explain', confidence: 0.9 }],
    });
    const implementProvider = providerReturningJson({
      ...BASE_DECISION,
      intent: 'technical.implement',
      candidates: [{ intent: 'technical.implement', confidence: 0.9 }],
    });

    const explain = await interpretIntent([userMsg('How does this React component work?')], { provider: explainProvider });
    const implement = await interpretIntent([userMsg('Can you change this React component?')], { provider: implementProvider });

    expect(explain.intent).toBe('technical.explain');
    expect(implement.intent).toBe('technical.implement');
    expect(explain.intent).not.toBe(implement.intent);
  });

  test('technical.explain vs. technical.debug', async () => {
    const debugDecision = { ...BASE_DECISION, intent: 'technical.debug', candidates: [{ intent: 'technical.debug', confidence: 0.87 }] };
    const provider = providerReturningJson(debugDecision);
    const result = await interpretIntent([userMsg('Why does my deployment keep failing?')], { provider });
    expect(result.intent).toBe('technical.debug');
  });

  test('technical.design vs. technical.implement', async () => {
    const designDecision = { ...BASE_DECISION, intent: 'technical.design', capability: 'hermes', candidates: [{ intent: 'technical.design', confidence: 0.85 }] };
    const provider = providerReturningJson(designDecision);
    const result = await interpretIntent([userMsg('How should we structure this React application?')], { provider });
    expect(result.intent).toBe('technical.design');
  });

  test('creative.write vs. creative.brainstorm', async () => {
    const brainstormDecision = { ...BASE_DECISION, intent: 'creative.brainstorm', intentFamily: 'creative', reasoningProfile: 'creative', candidates: [{ intent: 'creative.brainstorm', confidence: 0.8 }] };
    const provider = providerReturningJson(brainstormDecision);
    const result = await interpretIntent([userMsg('Give me a few ideas for a birthday message.')], { provider });
    expect(result.intent).toBe('creative.brainstorm');
  });
});

describe('interpretIntent — ambiguity and unknown', () => {
  test('returns ambiguous when multiple candidates remain materially plausible', async () => {
    const decision = {
      ...BASE_DECISION,
      intent: null,
      intentFamily: 'unknown',
      status: 'ambiguous',
      confidence: 0.5,
      candidates: [
        { intent: 'technical.design', confidence: 0.52 },
        { intent: 'technical.implement', confidence: 0.49 },
      ],
      needsClarification: true,
    };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('Can you take a look at how this should work?')], { provider });
    expect(result.status).toBe('ambiguous');
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  test('returns unknown for out-of-taxonomy requests', async () => {
    const decision = {
      ...BASE_DECISION,
      intent: 'unknown',
      intentFamily: 'unknown',
      status: 'unknown',
      confidence: 0,
      candidates: [],
      entities: [],
      capability: 'none',
      reasoningProfile: null,
      needsClarification: false,
    };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('Purple elephants discuss quarterly tax law on the moon.')], { provider });
    expect(result.status).toBe('unknown');
  });

  test('returns needsClarification when Gaia needs more before deciding', async () => {
    const decision = {
      ...BASE_DECISION,
      status: 'ambiguous',
      intent: null,
      needsClarification: true,
      candidates: [
        { intent: 'technical.debug', confidence: 0.5 },
        { intent: 'technical.implement', confidence: 0.5 },
      ],
    };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('Fix it.')], { provider });
    expect(result.needsClarification).toBe(true);
  });

  test('uses recent context to resolve a topic shift', async () => {
    const history = [
      userMsg('What theme should I use tonight?'),
      assistantMsg('Dark mode, probably.'),
      userMsg('Actually, can you refactor the theme switcher component?'),
    ];
    const decision = { ...BASE_DECISION, intent: 'technical.implement', candidates: [{ intent: 'technical.implement', confidence: 0.9 }] };
    const provider = providerReturningJson(decision);
    await interpretIntent(history, { provider });
    const promptSentToProvider = provider.chat.mock.calls[0][0];
    const userTurn = promptSentToProvider.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('refactor the theme switcher component');
    expect(userTurn).toContain('What theme should I use tonight?');
  });
});

describe('interpretIntent — safe failure modes', () => {
  test('malformed JSON from the provider fails safe', async () => {
    const provider = providerReturning('not json at all {{{');
    const result = await interpretIntent([userMsg('hello')], { provider });
    expect(result).toEqual(fallbackDecision());
  });

  test('invalid enum values fail schema validation and fail safe', async () => {
    const provider = providerReturningJson({ ...BASE_DECISION, status: 'definitely_sure' });
    const result = await interpretIntent([userMsg('hello')], { provider });
    expect(result).toEqual(fallbackDecision());
  });

  test('missing required fields fail schema validation and fail safe', async () => {
    const { intent, ...withoutIntent } = BASE_DECISION;
    const provider = providerReturningJson(withoutIntent);
    const result = await interpretIntent([userMsg('hello')], { provider });
    expect(result).toEqual(fallbackDecision());
  });

  test('impossible confidence values fail schema validation and fail safe', async () => {
    const provider = providerReturningJson({ ...BASE_DECISION, confidence: 1.7 });
    const result = await interpretIntent([userMsg('hello')], { provider });
    expect(result).toEqual(fallbackDecision());

    const providerNegative = providerReturningJson({ ...BASE_DECISION, confidence: -0.2 });
    const resultNegative = await interpretIntent([userMsg('hello')], { provider: providerNegative });
    expect(resultNegative).toEqual(fallbackDecision());
  });

  test('provider failure fails safe without throwing', async () => {
    const provider = providerRejecting(new Error('reason engine unreachable'));
    await expect(interpretIntent([userMsg('hello')], { provider })).resolves.toEqual(fallbackDecision());
  });
});

describe('interpretIntent — contract discipline', () => {
  test('never leaks a model/provider identifier in the decision', async () => {
    // "hermes" is a legitimate *capability* value (architecture.md names it
    // as one of Gaia's capabilities) — this checks for actual model/provider
    // identifiers, which must never appear anywhere in the contract.
    const decision = { ...BASE_DECISION };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('Can you change this React component?')], { provider });
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toMatch(/openai|gpt-|claude|llama|anthropic|ollama|deepseek|venice/);
    expect(Object.keys(result)).not.toContain('provider');
    expect(Object.keys(result)).not.toContain('model');
  });

  test('never produces a user-facing answer — output is the decision object only, not prose', async () => {
    const decision = { ...BASE_DECISION };
    const provider = providerReturningJson(decision);
    const result = await interpretIntent([userMsg('Can you change this React component?')], { provider });
    expect(typeof result).toBe('object');
    expect(result).not.toHaveProperty('answer');
    expect(result).not.toHaveProperty('response');
    expect(result).not.toHaveProperty('content');
  });

  test('tolerates a provider that wraps JSON in a markdown code fence', async () => {
    const provider = providerReturning('```json\n' + JSON.stringify(BASE_DECISION) + '\n```');
    const result = await interpretIntent([userMsg('Can you change this React component?')], { provider });
    expect(result).toEqual(BASE_DECISION);
  });
});
