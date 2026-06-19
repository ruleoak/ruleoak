#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAuditEventChain, verifyEvidenceBundle, validateGovernanceRecord } from '../src/protocol/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cases = [
  {
    slug: 'ai-coding-agent-governance',
    reportFile: 'ai-coding-agent-governance-report.json',
    status: 'approved_for_controlled_code_edit',
    outcomes: { repositoryRead: 'allowed', sourceEdit: 'approval_required_then_approved', destructiveShell: 'blocked' },
    approvalAction: 'write.source_file',
    blockedAction: 'run.destructive_shell'
  },
  {
    slug: 'enterprise-rag-answer-governance',
    reportFile: 'enterprise-rag-answer-governance-report.json',
    status: 'answered_with_evidence_and_redaction',
    outcomes: { documentSearch: 'allowed', restrictedDocument: 'approval_required_then_approved', unsupportedAnswer: 'blocked' },
    approvalAction: 'read.restricted_document',
    blockedAction: 'answer.without_evidence'
  },
  {
    slug: 'personal-local-first-assistant-governance',
    reportFile: 'personal-local-first-assistant-governance-report.json',
    status: 'draft_prepared_send_requires_approval',
    outcomes: { localRead: 'allowed', sendEmail: 'approval_required_then_approved', privateUpload: 'blocked' },
    approvalAction: 'send.email',
    blockedAction: 'upload.private_files'
  }
];

for (const item of cases) {
  await import(`../examples/${item.slug}/run.js`);
  const outDir = path.join(root, 'examples', item.slug, 'out');
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
  const report = readJson(item.reportFile);
  const records = readJson('governance-records.json');
  const bundle = readJson('evidence-bundle.json');
  const auditLog = readJson('audit-log.json');
  const approval = readJson('approval-request.json');

  assert.equal(report.summary.status, item.status, item.slug);
  assert.deepEqual(report.summary.policyOutcome, item.outcomes, item.slug);
  assert.equal(report.evidence.length, 7, item.slug);
  assert.equal(report.policyDecisions.length, 3, item.slug);
  assert.equal(report.approvals[0].decision, 'approved', item.slug);
  assert.equal(approval.action, item.approvalAction, item.slug);
  assert.equal(fs.existsSync(path.join(outDir, `${item.slug}-report.html`)), true, item.slug);

  for (const record of records) {
    assert.equal(validateGovernanceRecord(record).valid, true, `${item.slug}: ${record.recordType} must validate`);
  }

  const bundleCheck = verifyEvidenceBundle(bundle);
  assert.equal(bundleCheck.valid, true, `${item.slug}: ${bundleCheck.errors.join('; ')}`);
  assert.equal(bundleCheck.recordCount, records.length, item.slug);

  const chainCheck = verifyAuditEventChain(auditLog);
  assert.equal(chainCheck.valid, true, `${item.slug}: ${chainCheck.errors.join('; ')}`);
  assert.equal(chainCheck.eventCount, report.auditEvents.length, item.slug);
  assert.equal(report.protocol.evidenceBundleHash, bundle.bundleHash, item.slug);
  assert.equal(report.protocol.auditChainLastHash, chainCheck.lastHash, item.slug);

  const approvalDecision = report.policyDecisions.find((decision) => decision.action === item.approvalAction);
  assert.equal(approvalDecision.effect, 'approval_required', item.slug);
  assert.equal(approvalDecision.decision, 'approval_required', item.slug);

  const blockedDecision = report.policyDecisions.find((decision) => decision.action === item.blockedAction);
  assert.equal(blockedDecision.effect, 'deny', item.slug);
  assert.equal(blockedDecision.decision, 'blocked', item.slug);
}

console.log('extra reference verticals test passed');
