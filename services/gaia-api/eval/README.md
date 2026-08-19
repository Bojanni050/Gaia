# IntentIQ evaluation harness

Runs `eval/cases.js` — a **synthetic design/evaluation set**, not real user
data — against the current `src/logos/intentIQ.js` classifier and reports
coherence, not just accuracy.

```bash
npm run eval:intent
```

## What this checks

- **accuracy** — status/intent matched what a case expected (or one of its
  `acceptableAlternatives`).
- **unknown rate / ambiguous rate** — how often IntentIQ declines to force
  a classification. Neither rate is a bug by itself; a taxonomy this new
  should produce real unknowns and real ambiguity on the harder cases.
- **confidence distribution** — min/max/avg confidence across accepted
  cases. Confidence is capped at 0.95 in the classifier itself (never
  reported as certainty); this stat is here to catch a classifier that's
  systematically over- or under-confident, not to chase a single number.
- **confusion** — for each case's expected outcome, which actual outcomes
  it produced. Read this before the accuracy number — it shows *which*
  intents get confused with which, not just how often something was wrong.
- **mismatches** — the literal list of cases that didn't match, with why.

## What this is not

Not a training set, not a benchmark to optimize against by adding more
keyword patterns until every case passes, and not evidence about real
Gaia users — see `eval/cases.js`'s own header comment. Its job is to keep
the taxonomy and the classifier honest against each other as both evolve.

## Updating

- Add cases as real usage surfaces gaps — mark anything still invented
  clearly, the way the existing set does.
- If a mismatch reveals the *taxonomy* is wrong (not just the classifier),
  that is a taxonomy change, and belongs back in the design report's
  review process — not a quiet edit to `expectedIntent` here to make the
  harness pass.
