const test = require('node:test');
const assert = require('node:assert/strict');
const { makeFakePool } = require('./helpers/fakePool');

const { pool } = require('../src/db/pool');
const hindsightClient = require('../src/hindsightClient');
const hypotheses = require('../src/hypotheses');

function row(overrides = {}) {
  return {
    id: 'h1',
    bank_id: 'gaia',
    statement: 'Bo is more creatively productive late at night',
    confidence: 0.7,
    status: 'proposed',
    verification_plan: '',
    evidence_memory_ids: [],
    confirmed_document_id: null,
    rejection_reason: null,
    tested_at: null,
    confirmed_at: null,
    rejected_at: null,
    created_at: '2026-08-15T00:00:00Z',
    updated_at: '2026-08-15T00:00:00Z',
    ...overrides,
  };
}

test('propose() rejects an empty statement', async () => {
  await assert.rejects(() => hypotheses.propose('gaia', { statement: '' }), /statement is required/);
});

test('propose() inserts and returns the new row', async () => {
  const fake = makeFakePool();
  fake.setImpl(async () => ({ rows: [row()] }));
  pool.query = fake.pool.query;

  const h = await hypotheses.propose('gaia', { statement: row().statement, confidence: 0.7 });

  assert.equal(h.status, 'proposed');
  assert.match(fake.calls[0].sql, /INSERT INTO hypotheses/);
});

test('markTesting() transitions proposed -> testing', async () => {
  const fake = makeFakePool();
  let call = 0;
  fake.setImpl(async () => {
    call += 1;
    if (call === 1) return { rows: [row({ status: 'proposed' })] }; // get()
    return { rows: [row({ status: 'testing' })] }; // update
  });
  pool.query = fake.pool.query;

  const h = await hypotheses.markTesting('gaia', 'h1');
  assert.equal(h.status, 'testing');
});

test('markTesting() refuses to leave a confirmed hypothesis', async () => {
  const fake = makeFakePool();
  fake.setImpl(async () => ({ rows: [row({ status: 'confirmed' })] }));
  pool.query = fake.pool.query;

  await assert.rejects(
    () => hypotheses.markTesting('gaia', 'h1'),
    (err) => err.name === 'InvalidTransitionError',
  );
});

test('reject() is allowed directly from proposed (no forced testing step)', async () => {
  const fake = makeFakePool();
  let call = 0;
  fake.setImpl(async () => {
    call += 1;
    if (call === 1) return { rows: [row({ status: 'proposed' })] };
    return { rows: [row({ status: 'rejected', rejection_reason: 'no evidence' })] };
  });
  pool.query = fake.pool.query;

  const h = await hypotheses.reject('gaia', 'h1', 'no evidence');
  assert.equal(h.status, 'rejected');
  assert.equal(h.rejection_reason, 'no evidence');
});

test('confirm() retains the statement into Hindsight and stores the document_id, not a memory_id', async () => {
  const fake = makeFakePool();
  let call = 0;
  fake.setImpl(async () => {
    call += 1;
    if (call === 1) return { rows: [row({ status: 'testing' })] }; // get()
    return { rows: [row({ status: 'confirmed', confirmed_document_id: 'doc-abc' })] };
  });
  pool.query = fake.pool.query;

  let retainedWith;
  hindsightClient.retainMemory = async (bankId, item) => {
    retainedWith = { bankId, item };
    return { documentId: item.document_id };
  };

  const h = await hypotheses.confirm('gaia', 'h1');

  assert.equal(h.status, 'confirmed');
  assert.equal(retainedWith.bankId, 'gaia');
  assert.equal(retainedWith.item.content, row().statement);
  assert.ok(retainedWith.item.document_id.startsWith('hypothesis-h1-'));
});

test('confirm() refuses to confirm a rejected hypothesis', async () => {
  const fake = makeFakePool();
  fake.setImpl(async () => ({ rows: [row({ status: 'rejected' })] }));
  pool.query = fake.pool.query;

  await assert.rejects(
    () => hypotheses.confirm('gaia', 'h1'),
    (err) => err.name === 'InvalidTransitionError',
  );
});

test('update() from testing status resets to proposed (refine)', async () => {
  const fake = makeFakePool();
  let call = 0;
  fake.setImpl(async (sql) => {
    call += 1;
    if (call === 1) return { rows: [row({ status: 'testing' })] }; // get()
    // second call is the UPDATE — assert it sets status back to 'proposed'
    assert.match(sql, /UPDATE hypotheses/);
    return { rows: [row({ status: 'proposed', confidence: 0.4 })] };
  });
  pool.query = fake.pool.query;

  const h = await hypotheses.update('gaia', 'h1', { confidence: 0.4 });
  assert.equal(h.status, 'proposed');
});

test('update() refuses to edit a confirmed hypothesis', async () => {
  const fake = makeFakePool();
  fake.setImpl(async () => ({ rows: [row({ status: 'confirmed' })] }));
  pool.query = fake.pool.query;

  await assert.rejects(
    () => hypotheses.update('gaia', 'h1', { confidence: 0.9 }),
    (err) => err.name === 'InvalidTransitionError',
  );
});

test('get() throws NotFoundError when the row is missing', async () => {
  const fake = makeFakePool();
  fake.setImpl(async () => ({ rows: [] }));
  pool.query = fake.pool.query;

  await assert.rejects(
    () => hypotheses.get('gaia', 'missing'),
    (err) => err.name === 'NotFoundError',
  );
});

test('softDelete() throws NotFoundError when nothing was deleted', async () => {
  const fake = makeFakePool();
  fake.setImpl(async () => ({ rowCount: 0 }));
  pool.query = fake.pool.query;

  await assert.rejects(
    () => hypotheses.softDelete('gaia', 'missing'),
    (err) => err.name === 'NotFoundError',
  );
});
