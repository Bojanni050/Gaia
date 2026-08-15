const express = require('express');
const hypotheses = require('../hypotheses');

const router = express.Router({ mergeParams: true });

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.post('/', asyncRoute(async (req, res) => {
  const { bankId } = req.params;
  const h = await hypotheses.propose(bankId, {
    statement: req.body.statement,
    confidence: req.body.confidence,
    verificationPlan: req.body.verification_plan,
    evidenceMemoryIds: req.body.evidence_memory_ids,
  });
  res.status(201).json(h);
}));

router.get('/', asyncRoute(async (req, res) => {
  const { bankId } = req.params;
  const list = await hypotheses.list(bankId, { status: req.query.status });
  res.json({ hypotheses: list });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { bankId, id } = req.params;
  res.json(await hypotheses.get(bankId, id));
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const { bankId, id } = req.params;
  const h = await hypotheses.update(bankId, id, {
    statement: req.body.statement,
    confidence: req.body.confidence,
    verificationPlan: req.body.verification_plan,
    evidenceMemoryIds: req.body.evidence_memory_ids,
  });
  res.json(h);
}));

router.post('/:id/test', asyncRoute(async (req, res) => {
  const { bankId, id } = req.params;
  res.json(await hypotheses.markTesting(bankId, id));
}));

router.post('/:id/confirm', asyncRoute(async (req, res) => {
  const { bankId, id } = req.params;
  res.json(await hypotheses.confirm(bankId, id));
}));

router.post('/:id/reject', asyncRoute(async (req, res) => {
  const { bankId, id } = req.params;
  res.json(await hypotheses.reject(bankId, id, req.body.reason));
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const { bankId, id } = req.params;
  await hypotheses.softDelete(bankId, id);
  res.status(204).end();
}));

module.exports = router;
