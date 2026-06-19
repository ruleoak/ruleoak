import assert from 'node:assert/strict';
import { collectLaunchReadiness } from '../scripts/launch-readiness-check.js';

const report = collectLaunchReadiness();

assert.equal(report.protocol, 'ruleoak.public_launch_readiness.v1');
assert.equal(report.latestPublicCoreRelease, 'v2.1.0');
assert.equal(report.previousPublicBaseline, 'v1.0.1');
assert.equal(report.summary.failed, 0, JSON.stringify(report.checks.filter((item) => !item.ok), null, 2));
assert.ok(report.checks.length >= 30);

console.log(`launch readiness tests passed (${report.summary.passed}/${report.summary.total})`);
