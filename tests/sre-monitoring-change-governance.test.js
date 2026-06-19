#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAuditEventChain, verifyEvidenceBundle, validateGovernanceRecord } from '../src/protocol/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const exampleDir = path.join(root, 'examples/sre-monitoring-change-governance');
const outDir = path.join(exampleDir, 'out');

await import('../examples/sre-monitoring-change-governance/run.js');

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
const report = readJson('sre-monitoring-change-report.json');
const records = readJson('governance-records.json');
const bundle = readJson('evidence-bundle.json');
const auditLog = readJson('audit-log.json');
const approval = readJson('approval-request.json');
const raci = readJson('raci.json');

assert.equal(report.summary.status, 'approved_for_controlled_implementation');
assert.equal(report.summary.policyOutcome.readEvidence, 'allowed');
assert.equal(report.summary.policyOutcome.thresholdWrite, 'approval_required_then_approved');
assert.equal(report.summary.policyOutcome.disableAlert, 'blocked');
assert.equal(report.evidence.length, 7);
assert.equal(report.policyDecisions.length, 3);
assert.equal(report.approvals[0].decision, 'approved');
assert.equal(approval.action, 'write.monitoring_threshold');
assert.equal(raci.roles.sreLead.includes('Accountable'), true);
assert.equal(fs.existsSync(path.join(outDir, 'sre-monitoring-change-report.html')), true);

for (const record of records) {
  assert.equal(validateGovernanceRecord(record).valid, true, `${record.recordType} must validate`);
}

const bundleCheck = verifyEvidenceBundle(bundle);
assert.equal(bundleCheck.valid, true, bundleCheck.errors.join('; '));
assert.equal(bundleCheck.recordCount, records.length);

const chainCheck = verifyAuditEventChain(auditLog);
assert.equal(chainCheck.valid, true, chainCheck.errors.join('; '));
assert.equal(chainCheck.eventCount, report.auditEvents.length);
assert.equal(bundle.recordHashes.length, records.length);
assert.equal(report.protocol.evidenceBundleHash, bundle.bundleHash);
assert.equal(report.protocol.auditChainLastHash, chainCheck.lastHash);

const thresholdDecision = report.policyDecisions.find((decision) => decision.action === 'write.monitoring_threshold');
assert.equal(thresholdDecision.effect, 'approval_required');
assert.equal(thresholdDecision.metadata.evidenceCount, 7);

const blockedDecision = report.policyDecisions.find((decision) => decision.action === 'disable.production_alert');
assert.equal(blockedDecision.effect, 'deny');
assert.equal(blockedDecision.decision, 'blocked');

console.log('sre monitoring change governance reference test passed');
