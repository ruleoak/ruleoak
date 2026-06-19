#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PolicyEngine } from '../../../src/runtime/index.js';
import { renderReport } from '../../../src/reports/index.js';
import {
  appendAuditEventChain,
  createApprovalRecord,
  createAuditEvent,
  createEvidenceBundle,
  createEvidenceRecord,
  createPolicyDecisionRecord,
  createRedactionManifest,
  createReportRecord,
  createRunRecord,
  recordHash,
  verifyAuditEventChain,
  verifyEvidenceBundle
} from '../../../src/protocol/index.js';

const recordId = (record) => record.runId || record.evidenceId || record.decisionId || record.approvalId || record.eventId || record.reportId;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(outDir, file, value) {
  fs.mkdirSync(outDir, { recursive: true });
  const fullPath = path.join(outDir, file);
  fs.writeFileSync(fullPath, JSON.stringify(value, null, 2));
  return fullPath;
}

function decisionRecordFrom({ scenario, policyEngine, actionSpec, createdAt }) {
  const engineDecision = policyEngine.evaluate(actionSpec.action, {
    runId: scenario.runId,
    evidenceIds: scenario.evidence.map((item) => `${scenario.slug}-evidence-${item.id}`),
    subject: actionSpec.subject,
    control: actionSpec.control
  });
  return createPolicyDecisionRecord({
    decisionId: `${scenario.slug}-decision-${actionSpec.id}`,
    runId: scenario.runId,
    action: actionSpec.action,
    subject: actionSpec.subject,
    effect: actionSpec.effect,
    decision: engineDecision.decision,
    matchedRuleIds: actionSpec.matchedRuleIds,
    reason: actionSpec.reason,
    createdAt,
    metadata: {
      engineDecision: engineDecision.decision,
      allowedNow: engineDecision.allowedNow,
      approvalRequired: engineDecision.approvalRequired,
      blocked: engineDecision.blocked,
      control: actionSpec.control
    }
  });
}

export function runGovernanceVertical(exampleFileUrl) {
  const exampleDir = path.dirname(fileURLToPath(exampleFileUrl));
  const outDir = path.join(exampleDir, 'out');
  const policy = readJson(path.join(exampleDir, 'policy.json'));
  const scenario = readJson(path.join(exampleDir, 'scenario.json'));
  const policyEngine = new PolicyEngine(policy);
  const { createdAt, completedAt } = scenario.timestamps;

  const runRecord = createRunRecord({
    runId: scenario.runId,
    domain: scenario.domain,
    workflow: scenario.workflow,
    actor: scenario.actor,
    status: 'completed',
    createdAt,
    updatedAt: completedAt,
    metadata: {
      packageReleaseContext: 'RuleOak Core public latest v2.1.0; this reference vertical is RuleOak Core v2.1.0',
      vertical: scenario.slug,
      targetDevelopers: scenario.targetDevelopers,
      boundary: policy.boundary
    }
  });

  const evidenceRecords = scenario.evidence.map((item) => createEvidenceRecord({
    evidenceId: `${scenario.slug}-evidence-${item.id}`,
    runId: scenario.runId,
    action: item.action,
    subject: item.subject,
    subjectType: item.subjectType,
    source: item.source,
    createdAt,
    metadata: item.metadata
  }));

  const policyDecisionRecords = scenario.actions.map((actionSpec) => decisionRecordFrom({ scenario, policyEngine, actionSpec, createdAt }));
  const approvalAction = scenario.actions.find((action) => action.effect === 'approval_required');
  const approvalRecord = createApprovalRecord({
    approvalId: `${scenario.slug}-approval-${approvalAction.id}`,
    runId: scenario.runId,
    action: approvalAction.action,
    subject: approvalAction.subject,
    decision: scenario.approval.decision,
    actor: scenario.approval.actor,
    reason: scenario.approval.reason,
    createdAt: scenario.approval.createdAt,
    metadata: scenario.approval.metadata
  });

  let auditEvents = [];
  auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
    eventId: `${scenario.slug}-audit-run-started`,
    runId: scenario.runId,
    eventType: 'run_started',
    actor: 'ruleoak',
    createdAt,
    metadata: { workflow: scenario.workflow }
  }));
  for (const evidence of evidenceRecords) {
    auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
      eventId: `${scenario.slug}-audit-${evidence.evidenceId}`,
      runId: scenario.runId,
      eventType: 'evidence_captured',
      action: evidence.action,
      subject: evidence.subject,
      actor: 'ruleoak',
      evidenceId: evidence.evidenceId,
      createdAt,
      metadata: { hash: evidence.hash, source: evidence.source }
    }));
  }
  for (const decision of policyDecisionRecords) {
    auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
      eventId: `${scenario.slug}-audit-${decision.decisionId}`,
      runId: scenario.runId,
      eventType: 'policy_decision_recorded',
      action: decision.action,
      subject: decision.subject,
      actor: 'ruleoak',
      policyDecision: decision.effect,
      createdAt,
      metadata: { decisionId: decision.decisionId, matchedRuleIds: decision.matchedRuleIds }
    }));
  }
  auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
    eventId: `${scenario.slug}-audit-approval-recorded`,
    runId: scenario.runId,
    eventType: 'approval_recorded',
    action: approvalRecord.action,
    subject: approvalRecord.subject,
    actor: approvalRecord.actor,
    approvalId: approvalRecord.approvalId,
    createdAt: approvalRecord.createdAt,
    metadata: { decision: approvalRecord.decision }
  }));
  auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
    eventId: `${scenario.slug}-audit-report-generated`,
    runId: scenario.runId,
    eventType: 'audit_report_generated',
    action: 'generate.audit_report',
    subject: scenario.summary.subject,
    actor: 'ruleoak',
    createdAt: completedAt,
    metadata: { report: `${scenario.slug}-report.json` }
  }));

  const reportSummary = {
    title: scenario.title,
    subject: scenario.summary.subject,
    status: scenario.summary.status,
    policyOutcome: scenario.summary.policyOutcome,
    evidenceCount: evidenceRecords.length,
    auditEventCount: auditEvents.length,
    riskLevel: scenario.summary.riskLevel,
    conclusion: scenario.summary.conclusion
  };

  const reportRecord = createReportRecord({
    reportId: `${scenario.slug}-report-record`,
    runId: scenario.runId,
    title: scenario.title,
    summary: reportSummary,
    records: [
      runRecord.runId,
      ...evidenceRecords.map((record) => record.evidenceId),
      ...policyDecisionRecords.map((record) => record.decisionId),
      approvalRecord.approvalId,
      ...auditEvents.map((record) => record.eventId)
    ],
    createdAt: completedAt,
    metadata: { htmlReport: `${scenario.slug}-report.html`, vertical: scenario.slug }
  });

  const redactionManifest = createRedactionManifest({
    manifestId: `${scenario.slug}-redaction-manifest`,
    runId: scenario.runId,
    actor: 'ruleoak',
    reason: scenario.redaction.reason,
    fields: scenario.redaction.fields,
    createdAt: completedAt,
    metadata: scenario.redaction.metadata
  });

  const governanceRecords = [runRecord, ...evidenceRecords, ...policyDecisionRecords, approvalRecord, ...auditEvents, reportRecord];
  const evidenceBundle = createEvidenceBundle({
    bundleId: `${scenario.slug}-evidence-bundle`,
    runId: scenario.runId,
    records: governanceRecords,
    redactionManifest,
    generatedAt: completedAt,
    metadata: {
      vertical: scenario.slug,
      replayCommand: `node scripts/protocol-replay.js examples/${scenario.slug}/out/evidence-bundle.json examples/${scenario.slug}/out/audit-log.json`
    }
  });

  const bundleCheck = verifyEvidenceBundle(evidenceBundle);
  const chainCheck = verifyAuditEventChain(auditEvents);
  if (!bundleCheck.valid) throw new Error(`Evidence bundle failed verification: ${bundleCheck.errors.join('; ')}`);
  if (!chainCheck.valid) throw new Error(`Audit chain failed verification: ${chainCheck.errors.join('; ')}`);

  const referenceReport = {
    runtimeVersion: 'RuleOak Core v2.1.0',
    runtimeStage: 'reference-vertical',
    run: {
      id: scenario.runId,
      app: scenario.title,
      status: 'completed',
      startedAt: createdAt,
      completedAt,
      metadata: runRecord.metadata
    },
    boundary: policy.boundary,
    summary: reportSummary,
    policyDecisions: policyDecisionRecords,
    approvals: [approvalRecord],
    evidence: evidenceRecords,
    auditEvents,
    output: scenario.output,
    protocol: {
      schemaVersion: 'ruleoak.governance.v1',
      evidenceBundleHash: evidenceBundle.bundleHash,
      auditChainLastHash: chainCheck.lastHash,
      recordHashes: governanceRecords.map((record) => ({ recordType: record.recordType, id: recordId(record), hash: recordHash(record) }))
    },
    boundaryNote: scenario.boundaryNote
  };

  writeJson(outDir, `${scenario.slug}-report.json`, referenceReport);
  writeJson(outDir, 'governance-records.json', governanceRecords);
  writeJson(outDir, 'evidence-bundle.json', evidenceBundle);
  writeJson(outDir, 'audit-log.json', auditEvents);
  writeJson(outDir, 'approval-request.json', approvalRecord);
  fs.writeFileSync(path.join(outDir, `${scenario.slug}-report.html`), renderReport(referenceReport, { sourcePath: `examples/${scenario.slug}/out/${scenario.slug}-report.json` }));

  console.log(`\n${scenario.title}`);
  console.log('-'.repeat(Math.min(70, scenario.title.length)));
  console.log(`Subject: ${scenario.summary.subject}`);
  for (const action of scenario.actions) {
    const decision = policyDecisionRecords.find((record) => record.action === action.action);
    console.log(`${action.action}: ${decision.decision}`);
  }
  console.log(`Approval: ${approvalRecord.decision}`);
  console.log(`Evidence records: ${evidenceRecords.length}`);
  console.log(`Audit events: ${auditEvents.length}`);
  console.log(`Evidence bundle hash: ${evidenceBundle.bundleHash}`);
  console.log(`Output written to examples/${scenario.slug}/out/\n`);

  return { referenceReport, evidenceBundle, auditEvents, governanceRecords };
}
