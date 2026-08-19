#!/usr/bin/env node
'use strict';

/**
 * CLI entry for the IntentIQ evaluation harness.
 * Usage: node eval/run.js  (or: npm run eval:intent)
 */

const { CASES } = require('./cases');
const { runEvaluation } = require('./harness');

const { report, results } = runEvaluation(CASES);

console.log('IntentIQ v0.1 — synthetic evaluation report');
console.log('(design/evaluation cases, not real user data)\n');
console.log(`classifier:       ${report.classifierVersion}`);
console.log(`cases:            ${report.total}`);
console.log(`accuracy:         ${report.accuracy}`);
console.log(`accepted rate:    ${report.acceptedRate}`);
console.log(`unknown rate:     ${report.unknownRate}`);
console.log(`ambiguous rate:   ${report.ambiguousRate}`);
console.log(`confidence:       min=${report.confidenceStats.min} max=${report.confidenceStats.max} avg=${report.confidenceStats.avg}`);

console.log('\nconfusion (expected -> {observed: count}):');
for (const [expected, observed] of Object.entries(report.confusion)) {
  console.log(`  ${expected}: ${JSON.stringify(observed)}`);
}

if (report.mismatches.length) {
  console.log(`\nmismatches (${report.mismatches.length}):`);
  for (const m of report.mismatches) {
    console.log(`  [${m.id}] "${m.input}" — ${m.why}`);
  }
} else {
  console.log('\nno mismatches');
}
