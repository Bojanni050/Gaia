'use strict';

/**
 * ReasonIQ v0.1 — shared vocabulary and lightweight model factories.
 *
 * This file defines the fixed vocabularies ReasonIQ's output is built
 * from (epistemic status, evidence verdicts, hypothesis status) and small
 * factory/validation helpers around them. It intentionally mirrors, but
 * does not import, `services/cognition/src/hypotheses.js`'s hypothesis
 * shape (`statement`, `confidence`, `status`, `verificationPlan`, evidence
 * linkage, and its `VALID_TRANSITIONS` state machine) — that service is a
 * separate deployable with its own database and this phase explicitly
 * does not call it (Hindsight/cognition integration is out of scope; see
 * reasonIQ.js's module comment). Keeping the field names identical is
 * deliberate: it's what lets a later phase hand a ReasonIQ hypothesis to
 * `services/cognition`'s `propose()` with no translation layer.
 *
 * architecture.md §6.2's line runs through this file: Logos (this module)
 * is allowed to *judge* that a hypothesis is confirmed or rejected —
 * that's a reasoning act. It is never allowed to *persist* that judgment
 * anywhere; nothing here writes to a database, calls Hindsight, or calls
 * `services/cognition`. A hypothesis's `status` below is Logos's own
 * epistemic conclusion for this turn, not a completed state transition.
 */

const SCHEMA_VERSION = 'reasoniq.v1';
const REASONER_VERSION = 'reasoniq-v0.1';

/** FACT/INFERENCE/HYPOTHESIS/UNKNOWN — the epistemic distinctions ReasonIQ must never collapse (§11). */
const EPISTEMIC_STATUS = Object.freeze(['fact', 'inference', 'hypothesis', 'unknown']);

/** Stash's four-way evidence verdict, adopted as-is (design research, §10). */
const EVIDENCE_VERDICTS = Object.freeze(['supports', 'weakens', 'contradicts', 'irrelevant']);

/**
 * Kept identical to services/cognition/src/hypotheses.js's VALID_TRANSITIONS
 * — see this file's module comment for why it is duplicated rather than
 * imported. `status` here is a same-turn epistemic judgment, never a
 * persisted transition.
 */
const HYPOTHESIS_STATUSES = Object.freeze(['proposed', 'testing', 'confirmed', 'rejected']);

const REASONING_DEPTHS = Object.freeze(['shallow', 'deep']);

function isValidEpistemicStatus(v) {
  return EPISTEMIC_STATUS.includes(v);
}
function isValidVerdict(v) {
  return EVIDENCE_VERDICTS.includes(v);
}
function isValidHypothesisStatus(v) {
  return HYPOTHESIS_STATUSES.includes(v);
}

/**
 * @typedef {Object} EvidenceItem
 * @property {string} content
 * @property {'fact'|'inference'|'hypothesis'|'unknown'} type
 * @property {'conversation'|'supplied'|'unknown'} origin - where this evidence item came from, distinct from IntentIQ's sourceOfTruth
 */

/**
 * @typedef {Object} EvidenceAssessment
 * @property {string} evidence - the evidence content being assessed
 * @property {'supports'|'weakens'|'contradicts'|'irrelevant'} verdict
 * @property {number} confidence - confidence in THIS VERDICT being correct (§10)
 * @property {string} reasoning - short rationale for the verdict, not a hidden chain-of-thought (§13)
 * @property {number} newConfidence - the hypothesis's confidence AFTER this evidence (§10) — distinct from `confidence` above
 */

/**
 * @typedef {Object} Hypothesis
 * @property {string} id - local, in-memory id only (crypto.randomUUID()) — never a persisted identifier
 * @property {string} statement
 * @property {number} confidence
 * @property {'proposed'|'testing'|'confirmed'|'rejected'} status - Logos's judgment for this turn, not a stored transition
 * @property {string|null} verificationPlan
 * @property {EvidenceAssessment[]} evidenceAssessments
 */

/**
 * @typedef {Object} Contradiction
 * @property {string} a
 * @property {string} b
 * @property {string} explanation
 */

/**
 * @typedef {Object} Conclusion
 * @property {string} statement
 * @property {'fact'|'inference'|'hypothesis'} basis
 * @property {number} confidence
 */

/**
 * @typedef {Object} ReasoningResult
 * @property {'reasoniq.v1'} schemaVersion
 * @property {string} interpretation - what Logos understood the turn to mean
 * @property {'shallow'|'deep'} reasoningDepth
 * @property {EvidenceItem[]} evidence
 * @property {Hypothesis[]} hypotheses
 * @property {Contradiction[]} contradictions
 * @property {string[]} uncertainties
 * @property {string[]} informationGaps
 * @property {Conclusion[]} conclusions
 * @property {boolean} sufficientForConclusion
 * @property {number} confidence - overall confidence in interpretation + conclusions
 * @property {{ reasonerVersion: string, reasoningModelConfigured: boolean, fallbackReason: string|null }} meta
 */

function makeHypothesis({ statement, confidence = 0.5, status = 'proposed', verificationPlan = null, evidenceAssessments = [] }) {
  return {
    id: require('crypto').randomUUID(),
    statement,
    confidence,
    status: isValidHypothesisStatus(status) ? status : 'proposed',
    verificationPlan,
    evidenceAssessments,
  };
}

module.exports = {
  SCHEMA_VERSION,
  REASONER_VERSION,
  EPISTEMIC_STATUS,
  EVIDENCE_VERDICTS,
  HYPOTHESIS_STATUSES,
  REASONING_DEPTHS,
  isValidEpistemicStatus,
  isValidVerdict,
  isValidHypothesisStatus,
  makeHypothesis,
};
