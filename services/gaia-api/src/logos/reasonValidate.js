'use strict';

/**
 * Validates and coerces a reasoning model's raw text output into a
 * well-formed ReasoningResult body (everything except schemaVersion/
 * reasoningDepth/meta, which reasonIQ.js attaches itself). Deliberately
 * strict about shape, lenient about a model's minor field omissions —
 * a missing optional array becomes [], a missing optional string becomes
 * null — but a genuinely malformed or non-JSON response throws
 * MalformedReasoningOutputError, which reasonIQ.js catches and turns into
 * an honest fallback result rather than ever passing bad data upstream.
 */

const { isValidEpistemicStatus, isValidVerdict, isValidHypothesisStatus } = require('./reasonModels');

class MalformedReasoningOutputError extends Error {
  constructor(reason) {
    super(`malformed reasoning model output: ${reason}`);
    this.name = 'MalformedReasoningOutputError';
  }
}

function clampConfidence(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(0.95, Math.max(0, n)); // soul.md: never claim certainty
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function coerceEvidenceItem(item) {
  if (!item || typeof item !== 'object') throw new MalformedReasoningOutputError('evidence item is not an object');
  const type = isValidEpistemicStatus(item.type) ? item.type : 'unknown';
  return {
    content: asString(item.content),
    type,
    origin: ['conversation', 'supplied', 'unknown'].includes(item.origin) ? item.origin : 'unknown',
  };
}

function coerceEvidenceAssessment(item) {
  if (!item || typeof item !== 'object') throw new MalformedReasoningOutputError('evidence assessment is not an object');
  if (!isValidVerdict(item.verdict)) {
    throw new MalformedReasoningOutputError(`invalid evidence verdict: ${JSON.stringify(item.verdict)}`);
  }
  return {
    evidence: asString(item.evidence),
    verdict: item.verdict,
    confidence: clampConfidence(item.confidence),
    reasoning: asString(item.reasoning),
    newConfidence: clampConfidence(item.newConfidence, clampConfidence(item.confidence)),
  };
}

function coerceHypothesis(item) {
  if (!item || typeof item !== 'object' || !item.statement) {
    throw new MalformedReasoningOutputError('hypothesis missing a statement');
  }
  const status = isValidHypothesisStatus(item.status) ? item.status : 'proposed';
  return {
    id: require('crypto').randomUUID(),
    statement: asString(item.statement),
    confidence: clampConfidence(item.confidence),
    status,
    verificationPlan: typeof item.verificationPlan === 'string' ? item.verificationPlan : null,
    evidenceAssessments: asArray(item.evidenceAssessments).map(coerceEvidenceAssessment),
  };
}

function coerceContradiction(item) {
  if (!item || typeof item !== 'object') throw new MalformedReasoningOutputError('contradiction is not an object');
  return { a: asString(item.a), b: asString(item.b), explanation: asString(item.explanation) };
}

function coerceConclusion(item) {
  if (!item || typeof item !== 'object' || !item.statement) {
    throw new MalformedReasoningOutputError('conclusion missing a statement');
  }
  const basis = ['fact', 'inference', 'hypothesis'].includes(item.basis) ? item.basis : 'inference';
  return { statement: asString(item.statement), basis, confidence: clampConfidence(item.confidence) };
}

/**
 * @param {string} rawText raw text content from the reasoning model
 * @returns {object} a validated ReasoningResult body (no schemaVersion/reasoningDepth/meta)
 * @throws {MalformedReasoningOutputError}
 */
function parseAndValidateReasoningOutput(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new MalformedReasoningOutputError(`not valid JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MalformedReasoningOutputError('top-level output is not a JSON object');
  }
  if (typeof parsed.interpretation !== 'string' || parsed.interpretation.trim() === '') {
    throw new MalformedReasoningOutputError('missing or empty interpretation');
  }

  return {
    interpretation: parsed.interpretation,
    evidence: asArray(parsed.evidence).map(coerceEvidenceItem),
    hypotheses: asArray(parsed.hypotheses).map(coerceHypothesis),
    contradictions: asArray(parsed.contradictions).map(coerceContradiction),
    uncertainties: asArray(parsed.uncertainties).map((u) => asString(u)).filter(Boolean),
    informationGaps: asArray(parsed.informationGaps).map((g) => asString(g)).filter(Boolean),
    conclusions: asArray(parsed.conclusions).map(coerceConclusion),
    sufficientForConclusion: Boolean(parsed.sufficientForConclusion),
    confidence: clampConfidence(parsed.confidence),
  };
}

module.exports = { parseAndValidateReasoningOutput, MalformedReasoningOutputError, clampConfidence };
