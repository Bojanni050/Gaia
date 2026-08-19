'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const reasonModels = require('../src/logos/reasonModels');
const { parseAndValidateReasoningOutput, MalformedReasoningOutputError } = require('../src/logos/reasonValidate');
const { buildReasoningPrompt } = require('../src/logos/reasonPrompt');
const { createReasoningModelClient } = require('../src/logos/reasoningModelClient');
const reasonIQ = require('../src/logos/reasonIQ');
const { runLogos } = require('../src/logos/index');

const silent = { silent: true };

// --- reasonModels -----------------------------------------------------

test('reasonModels: vocabularies are the exact fixed sets', () => {
  assert.deepEqual(reasonModels.EPISTEMIC_STATUS, ['fact', 'inference', 'hypothesis', 'unknown']);
  assert.deepEqual(reasonModels.EVIDENCE_VERDICTS, ['supports', 'weakens', 'contradicts', 'irrelevant']);
  assert.deepEqual(reasonModels.HYPOTHESIS_STATUSES, ['proposed', 'testing', 'confirmed', 'rejected']);
});

test('reasonModels: makeHypothesis defaults to proposed and gets a local id', () => {
  const h = reasonModels.makeHypothesis({ statement: 'x' });
  assert.equal(h.status, 'proposed');
  assert.ok(h.id);
  assert.equal(h.confidence, 0.5);
});

// --- reasonValidate -----------------------------------------------------

const VALID_OUTPUT = JSON.stringify({
  interpretation: 'The user is asking why their website crashed.',
  evidence: [{ content: 'server logs show OOM errors', type: 'fact', origin: 'supplied' }],
  hypotheses: [{
    statement: 'The website crashes due to a memory leak.',
    confidence: 0.6,
    status: 'proposed',
    verificationPlan: 'Check memory usage over time.',
    evidenceAssessments: [{
      evidence: 'server logs show OOM errors',
      verdict: 'supports',
      confidence: 0.8,
      reasoning: 'OOM errors directly indicate a memory problem.',
      newConfidence: 0.75,
    }],
  }],
  contradictions: [],
  uncertainties: ['exact leak source unknown'],
  informationGaps: [],
  conclusions: [{ statement: 'Investigate memory usage.', basis: 'inference', confidence: 0.7 }],
  sufficientForConclusion: true,
  confidence: 0.7,
});

test('parseAndValidateReasoningOutput: happy path parses fully', () => {
  const result = parseAndValidateReasoningOutput(VALID_OUTPUT);
  assert.equal(result.interpretation, 'The user is asking why their website crashed.');
  assert.equal(result.hypotheses.length, 1);
  assert.equal(result.hypotheses[0].evidenceAssessments[0].verdict, 'supports');
});

test('parseAndValidateReasoningOutput: confidence and newConfidence stay distinct', () => {
  const result = parseAndValidateReasoningOutput(VALID_OUTPUT);
  const assessment = result.hypotheses[0].evidenceAssessments[0];
  assert.equal(assessment.confidence, 0.8);
  assert.equal(assessment.newConfidence, 0.75);
  assert.notEqual(assessment.confidence, assessment.newConfidence);
});

test('parseAndValidateReasoningOutput: confidence is capped below 1.0', () => {
  const output = JSON.parse(VALID_OUTPUT);
  output.confidence = 1.0;
  output.hypotheses[0].confidence = 1.0;
  const result = parseAndValidateReasoningOutput(JSON.stringify(output));
  assert.ok(result.confidence <= 0.95);
  assert.ok(result.hypotheses[0].confidence <= 0.95);
});

test('parseAndValidateReasoningOutput: throws on non-JSON', () => {
  assert.throws(() => parseAndValidateReasoningOutput('not json at all'), MalformedReasoningOutputError);
});

test('parseAndValidateReasoningOutput: throws on missing interpretation', () => {
  assert.throws(() => parseAndValidateReasoningOutput(JSON.stringify({})), MalformedReasoningOutputError);
});

test('parseAndValidateReasoningOutput: throws on an invalid evidence verdict', () => {
  const output = JSON.parse(VALID_OUTPUT);
  output.hypotheses[0].evidenceAssessments[0].verdict = 'definitely-true';
  assert.throws(() => parseAndValidateReasoningOutput(JSON.stringify(output)), MalformedReasoningOutputError);
});

test('parseAndValidateReasoningOutput: missing optional arrays default to empty, not a throw', () => {
  const result = parseAndValidateReasoningOutput(JSON.stringify({ interpretation: 'ok' }));
  assert.deepEqual(result.evidence, []);
  assert.deepEqual(result.hypotheses, []);
  assert.deepEqual(result.contradictions, []);
  assert.equal(result.sufficientForConclusion, false);
});

// --- reasonPrompt -----------------------------------------------------

test('buildReasoningPrompt: embeds text, intent, and evidence in the user message', () => {
  const messages = buildReasoningPrompt({
    text: 'Why is my website crashing?',
    intentDecision: { intent: 'inform.explain', status: 'accepted', confidence: 0.8 },
    conversationContext: [],
    evidence: [{ content: 'server logs show OOM errors' }],
  });
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[1].role, 'user');
  assert.match(messages[1].content, /Why is my website crashing\?/);
  assert.match(messages[1].content, /inform\.explain/);
  assert.match(messages[1].content, /OOM errors/);
});

// --- reasoningModelClient -----------------------------------------------

test('reasoningModelClient: reports unconfigured with no baseUrl/model', () => {
  const client = createReasoningModelClient({});
  assert.equal(client.isConfigured(), false);
});

test('reasoningModelClient: chat() rejects when unconfigured, without a network call', async () => {
  const client = createReasoningModelClient({});
  await assert.rejects(() => client.chat([]), /not configured/);
});

test('reasoningModelClient: chat() parses a happy-path OpenAI-compatible response', async () => {
  const fakeFetch = async (url) => {
    assert.match(url, /\/chat\/completions$/);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"interpretation":"ok"}' } }] }),
    };
  };
  const client = createReasoningModelClient({ baseUrl: 'http://fake:1234', model: 'test-model', fetchImpl: fakeFetch });
  const content = await client.chat([{ role: 'user', content: 'hi' }]);
  assert.equal(content, '{"interpretation":"ok"}');
});

test('reasoningModelClient: chat() maps a failing fetch to a generic error, no URL leaked', async () => {
  const fakeFetch = async () => { throw new Error('connect ECONNREFUSED 10.0.0.1:1234'); };
  const client = createReasoningModelClient({ baseUrl: 'http://fake:1234', model: 'test-model', fetchImpl: fakeFetch });
  await assert.rejects(() => client.chat([]), (err) => {
    assert.ok(!err.message.includes('10.0.0.1'));
    assert.match(err.message, /unreachable/);
    return true;
  });
});

// --- reasonIQ.evaluate — reasoning depth ----------------------------------

function stubModelReturning(jsonBody) {
  return { chat: async () => JSON.stringify(jsonBody), isConfigured: () => true };
}

function throwingModel(message) {
  return { chat: async () => { throw new Error(message); }, isConfigured: () => true };
}

test('reasonIQ: trivial input never calls the reasoning model (shallow)', async () => {
  let called = false;
  const model = { chat: async () => { called = true; return '{}'; }, isConfigured: () => true };
  const result = await reasonIQ.evaluate({ text: 'ok' }, { reasoningModel: model, ...silent });
  assert.equal(called, false);
  assert.equal(result.reasoningDepth, 'shallow');
});

test('reasonIQ: an accepted converse intent with no evidence is shallow', async () => {
  let called = false;
  const model = { chat: async () => { called = true; return '{}'; }, isConfigured: () => true };
  const result = await reasonIQ.evaluate(
    { text: 'I just need to vent for a second, it has been a long week honestly', intentDecision: { intent: 'converse', status: 'accepted' } },
    { reasoningModel: model, ...silent }
  );
  assert.equal(called, false);
  assert.equal(result.reasoningDepth, 'shallow');
});

test('reasonIQ: supplied evidence always triggers deep reasoning, even for short input', async () => {
  let called = false;
  const model = stubModelReturning({ interpretation: 'ok' });
  model.chat = async () => { called = true; return JSON.stringify({ interpretation: 'ok' }); };
  const result = await reasonIQ.evaluate(
    { text: 'and this?', evidence: [{ content: 'the server restarted at 3am' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(called, true);
  assert.equal(result.reasoningDepth, 'deep');
});

test('reasonIQ: a substantial, non-conversational turn WITHOUT evidence still stays shallow — intent alone no longer triggers a model call', async () => {
  let called = false;
  const model = { chat: async () => { called = true; return JSON.stringify({ interpretation: 'ok' }); }, isConfigured: () => true };
  const result = await reasonIQ.evaluate(
    { text: 'Why does the API return a 500 on the checkout endpoint sometimes?', intentDecision: { intent: 'inform.explain', status: 'accepted' } },
    { reasoningModel: model, ...silent }
  );
  assert.equal(called, false);
  assert.equal(result.reasoningDepth, 'shallow');
});

test('reasonIQ: decideReasoningDepth depends only on evidence, not intent or text length', () => {
  assert.equal(reasonIQ.decideReasoningDepth({ text: 'short' }), 'shallow');
  assert.equal(reasonIQ.decideReasoningDepth({ text: 'a long, substantial, detailed question about something important' }), 'shallow');
  assert.equal(reasonIQ.decideReasoningDepth({ text: 'x', evidence: [{ content: 'anything' }] }), 'deep');
  assert.equal(reasonIQ.decideReasoningDepth({ text: '', evidence: [] }), 'shallow');
});

// --- reasonIQ.evaluate — happy path structure -----------------------------

test('reasonIQ: deep path returns a fully-shaped ReasoningResult', async () => {
  const model = stubModelReturning(JSON.parse(VALID_OUTPUT));
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'server logs show OOM errors' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(result.schemaVersion, 'reasoniq.v1');
  assert.equal(result.reasoningDepth, 'deep');
  assert.equal(result.hypotheses.length, 1);
  assert.equal(result.meta.reasoningModelConfigured, true);
  assert.equal(result.meta.fallbackReason, null);
});

// --- reasonIQ.evaluate — graceful degradation -----------------------------

test('reasonIQ: malformed model output degrades gracefully, never throws', async () => {
  const model = { chat: async () => 'this is not json', isConfigured: () => true };
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'x' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(result.meta.fallbackReason, 'malformed_model_output');
  assert.equal(result.sufficientForConclusion, false);
  assert.equal(result.confidence, 0);
  assert.ok(result.informationGaps.length > 0);
});

test('reasonIQ: an unreachable model degrades gracefully, never throws', async () => {
  const model = throwingModel('connect ECONNREFUSED');
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'x' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(result.meta.fallbackReason, 'reasoning_model_unavailable');
});

test('reasonIQ: with no reasoning model configured at all, a deep-worthy turn still degrades gracefully', async () => {
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'x' }] },
    { reasoningModel: createReasoningModelClient({}), ...silent }
  );
  assert.equal(result.meta.reasoningModelConfigured, false);
  assert.equal(result.meta.fallbackReason, 'reasoning_model_unavailable');
});

// --- epistemic honesty -----------------------------------------------------

test('reasonIQ: never reports a hypothesis confidence of 1.0 (no false certainty)', async () => {
  const output = JSON.parse(VALID_OUTPUT);
  output.hypotheses[0].confidence = 1.0;
  const model = stubModelReturning(output);
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'x' }] },
    { reasoningModel: model, ...silent }
  );
  assert.ok(result.hypotheses[0].confidence < 1.0);
});

test('reasonIQ: contradicting evidence can drive a hypothesis toward a low newConfidence', async () => {
  const output = JSON.parse(VALID_OUTPUT);
  output.hypotheses[0].evidenceAssessments[0].verdict = 'contradicts';
  output.hypotheses[0].evidenceAssessments[0].newConfidence = 0.1;
  const model = stubModelReturning(output);
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'x' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(result.hypotheses[0].evidenceAssessments[0].verdict, 'contradicts');
  assert.equal(result.hypotheses[0].evidenceAssessments[0].newConfidence, 0.1);
});

test('reasonIQ: insufficient information is reported, not papered over', async () => {
  const model = stubModelReturning({
    interpretation: 'The user asked something with almost no context to reason from.',
    informationGaps: ['no prior conversation context was supplied', 'no evidence was supplied'],
    sufficientForConclusion: false,
    confidence: 0.2,
  });
  const result = await reasonIQ.evaluate(
    { text: 'Should I say yes or no?', evidence: [{ content: 'placeholder' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(result.sufficientForConclusion, false);
  assert.ok(result.informationGaps.length >= 2);
});

test('reasonIQ: competing hypotheses are both preserved with distinct ids', async () => {
  const model = stubModelReturning({
    interpretation: 'Two plausible explanations exist.',
    hypotheses: [
      { statement: 'A', confidence: 0.5, status: 'proposed', evidenceAssessments: [] },
      { statement: 'B', confidence: 0.5, status: 'proposed', evidenceAssessments: [] },
    ],
    sufficientForConclusion: false,
    confidence: 0.3,
  });
  const result = await reasonIQ.evaluate(
    { text: 'Why did the deploy fail?', evidence: [{ content: 'x' }] },
    { reasoningModel: model, ...silent }
  );
  assert.equal(result.hypotheses.length, 2);
  assert.notEqual(result.hypotheses[0].id, result.hypotheses[1].id);
});

// --- logging ---------------------------------------------------------------

test('reasonIQ: logs a result line unless silent', async () => {
  const lines = [];
  const model = { chat: async () => '{}', isConfigured: () => true };
  await reasonIQ.evaluate({ text: 'ok' }, { reasoningModel: model, logger: (l) => lines.push(l) });
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.kind, 'reasoniq.result');
});

// --- IntentIQ -> ReasonIQ handoff (logos/index.js) ------------------------

test('runLogos: passes IntentIQ\'s real decision into ReasonIQ\'s prompt, not a re-derived one', async () => {
  let capturedMessages;
  const model = {
    chat: async (messages) => { capturedMessages = messages; return JSON.stringify({ interpretation: 'ok' }); },
    isConfigured: () => true,
  };

  const { intentDecision, reasoningResult } = await runLogos(
    [{ role: 'user', content: 'Why is my website crashing?' }],
    { evidence: [{ content: 'server logs show OOM errors' }], reasoningModel: model, silent: true }
  );

  assert.equal(intentDecision.intent, 'inform.explain');
  assert.equal(reasoningResult.reasoningDepth, 'deep');
  const userMessage = capturedMessages.find((m) => m.role === 'user');
  assert.match(userMessage.content, /"intent":\s*"inform\.explain"/);
});

test('runLogos: a shallow-worthy turn never calls the reasoning model, but still runs IntentIQ', async () => {
  let called = false;
  const model = { chat: async () => { called = true; return '{}'; }, isConfigured: () => true };
  const { intentDecision, reasoningResult } = await runLogos([{ role: 'user', content: 'ok' }], { reasoningModel: model, silent: true });
  assert.equal(called, false);
  assert.equal(intentDecision.status, 'unknown');
  assert.equal(reasoningResult.reasoningDepth, 'shallow');
});

// --- boundary: ReasonIQ is a cognitive component, never an agent ---------

test('boundary: reasonIQ.js and logos/index.js never import Hermes, Hindsight, or MCP clients', () => {
  for (const file of ['../src/logos/reasonIQ.js', '../src/logos/index.js', '../src/logos/reasoningModelClient.js']) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    assert.ok(!/require\(.*hermesClient/.test(source), `${file} must not import hermesClient`);
    assert.ok(!/require\(.*hindsightClient/.test(source), `${file} must not import hindsightClient`);
    assert.ok(!/require\(.*mcp/i.test(source), `${file} must not import an MCP client`);
  }
});

test('boundary: a ReasoningResult never carries a tool/capability/action/final-response field', async () => {
  const model = stubModelReturning(JSON.parse(VALID_OUTPUT));
  const result = await reasonIQ.evaluate(
    { text: 'Why is my website crashing?', evidence: [{ content: 'x' }] },
    { reasoningModel: model, ...silent }
  );
  const keys = Object.keys(result);
  for (const forbidden of ['tool', 'toolCalls', 'capability', 'provider', 'action', 'response', 'model']) {
    assert.ok(!keys.includes(forbidden), `ReasoningResult leaked a routing/response field: ${forbidden}`);
  }
});

test('boundary: reasonIQ.evaluate is a pure async function of its inputs — no shared mutable state', async () => {
  const model = stubModelReturning(JSON.parse(VALID_OUTPUT));
  const a = await reasonIQ.evaluate({ text: 'Why is my website crashing?', evidence: [{ content: 'x' }] }, { reasoningModel: model, ...silent });
  const b = await reasonIQ.evaluate({ text: 'Why is my website crashing?', evidence: [{ content: 'x' }] }, { reasoningModel: model, ...silent });
  assert.equal(a.interpretation, b.interpretation);
  assert.equal(a.hypotheses.length, b.hypotheses.length);
});
