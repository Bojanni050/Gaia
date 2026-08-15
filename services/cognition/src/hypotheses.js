/**
 * Hypothesis lifecycle — adapted from Stash's internal/brain/hypothesis.go
 * concept (state machine + confirm-promotes-to-fact), reimplemented against
 * our own schema and Hindsight as the fact store (architecture.md §6.1).
 */
const { pool } = require('./db/pool');
const { NotFoundError, InvalidTransitionError, ValidationError } = require('./errors');
const { randomUUID } = require('crypto');
const hindsightClient = require('./hindsightClient');

const VALID_TRANSITIONS = {
  proposed: ['testing', 'rejected'],
  testing: ['confirmed', 'rejected', 'proposed'],
  confirmed: [],
  rejected: [],
};

function assertTransition(from, to) {
  if (!(VALID_TRANSITIONS[from] || []).includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

const COLUMNS = `
  id, bank_id, statement, confidence, status, verification_plan,
  evidence_memory_ids, confirmed_document_id, rejection_reason,
  tested_at, confirmed_at, rejected_at, created_at, updated_at
`;

async function propose(bankId, { statement, confidence = 0.5, verificationPlan = '', evidenceMemoryIds = [] }) {
  if (!statement) throw new ValidationError('statement is required');
  const { rows } = await pool.query(
    `INSERT INTO hypotheses (bank_id, statement, confidence, verification_plan, evidence_memory_ids)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [bankId, statement, confidence, verificationPlan, evidenceMemoryIds],
  );
  return rows[0];
}

async function list(bankId, { status } = {}) {
  if (status) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM hypotheses
       WHERE bank_id = $1 AND status = $2 AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [bankId, status],
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM hypotheses
     WHERE bank_id = $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [bankId],
  );
  return rows;
}

async function get(bankId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM hypotheses WHERE bank_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [bankId, id],
  );
  if (rows.length === 0) throw new NotFoundError(`hypothesis not found: ${id}`);
  return rows[0];
}

/** Update statement/confidence/verification_plan. From `testing`, this is a refine and resets status to `proposed` (mirrors Stash's RefineHypothesis). */
async function update(bankId, id, { statement, confidence, verificationPlan, evidenceMemoryIds } = {}) {
  const current = await get(bankId, id);
  if (current.status === 'confirmed' || current.status === 'rejected') {
    throw new InvalidTransitionError(current.status, 'edited');
  }

  const nextStatus = current.status === 'testing' ? 'proposed' : current.status;
  const { rows } = await pool.query(
    `UPDATE hypotheses SET
       statement = COALESCE($3, statement),
       confidence = COALESCE($4, confidence),
       verification_plan = COALESCE($5, verification_plan),
       evidence_memory_ids = COALESCE($6, evidence_memory_ids),
       status = $7,
       tested_at = CASE WHEN $7 = 'proposed' THEN NULL ELSE tested_at END,
       updated_at = now()
     WHERE bank_id = $1 AND id = $2
     RETURNING ${COLUMNS}`,
    [bankId, id, statement ?? null, confidence ?? null, verificationPlan ?? null, evidenceMemoryIds ?? null, nextStatus],
  );
  return rows[0];
}

async function markTesting(bankId, id) {
  const current = await get(bankId, id);
  assertTransition(current.status, 'testing');
  const { rows } = await pool.query(
    `UPDATE hypotheses SET status = 'testing', tested_at = now(), updated_at = now()
     WHERE bank_id = $1 AND id = $2 RETURNING ${COLUMNS}`,
    [bankId, id],
  );
  return rows[0];
}

/** Confirms the hypothesis and retains it into Hindsight as a real memory — the "promotes into a fact" step from architecture.md §6.1. */
async function confirm(bankId, id) {
  const current = await get(bankId, id);
  assertTransition(current.status, 'confirmed');

  const documentId = `hypothesis-${id}-${randomUUID()}`;
  const memory = await hindsightClient.retainMemory(bankId, {
    content: current.statement,
    context: 'confirmed-hypothesis',
    tags: ['confirmed-hypothesis'],
    document_id: documentId,
  });

  const { rows } = await pool.query(
    `UPDATE hypotheses SET status = 'confirmed', confirmed_at = now(), confirmed_document_id = $3, updated_at = now()
     WHERE bank_id = $1 AND id = $2 RETURNING ${COLUMNS}`,
    [bankId, id, memory.documentId],
  );
  return rows[0];
}

async function reject(bankId, id, reason) {
  const current = await get(bankId, id);
  assertTransition(current.status, 'rejected');
  const { rows } = await pool.query(
    `UPDATE hypotheses SET status = 'rejected', rejected_at = now(), rejection_reason = $3, updated_at = now()
     WHERE bank_id = $1 AND id = $2 RETURNING ${COLUMNS}`,
    [bankId, id, reason || null],
  );
  return rows[0];
}

async function softDelete(bankId, id) {
  const { rowCount } = await pool.query(
    `UPDATE hypotheses SET deleted_at = now(), updated_at = now()
     WHERE bank_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [bankId, id],
  );
  if (rowCount === 0) throw new NotFoundError(`hypothesis not found: ${id}`);
}

module.exports = { propose, list, get, update, markTesting, confirm, reject, softDelete, VALID_TRANSITIONS };
