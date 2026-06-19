import assert from 'node:assert/strict';
import { collectPublicReleaseHardening } from '../scripts/public-release-hardening-check.js';

const report = collectPublicReleaseHardening();

assert.equal(report.protocol, 'ruleoak.public_release_hardening.v1');
assert.equal(report.latestPublicCoreRelease, 'v2.1.0');
assert.equal(report.previousPublicRelease, 'v2.0.3');
assert.equal(report.earlierPublicBaseline, 'v1.0.1');
assert.equal(report.packageVersion, '2.1.0');
assert.equal(report.summary.failed, 0, JSON.stringify(report.checks.filter((item) => !item.ok), null, 2));
assert.ok(report.checks.length >= 30);

console.log(`public release hardening tests passed (${report.summary.passed}/${report.summary.total})`);
