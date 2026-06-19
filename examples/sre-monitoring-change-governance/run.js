#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PolicyEngine } from '../../src/runtime/index.js';
import { renderReport } from '../../src/reports/index.js';
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
} from '../../src/protocol/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'out');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const readText = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');
const writeJson = (file, value) => {
  fs.mkdirSync(outDir, { recursive: true });
  const fullPath = path.join(outDir, file);
  fs.writeFileSync(fullPath, JSON.stringify(value, null, 2));
  return fullPath;
};

const createdAt = '2026-06-19T02:00:00.000Z';
const completedAt = '2026-06-19T02:05:00.000Z';
const runId = 'sre-monitoring-change-20260619-001';

const policy = readJson('policy.json');
const changeRequest = readJson('mock-data/change-request.json');
const metrics = readJson('mock-data/metrics-baseline.json');
const alertPolicy = readJson('mock-data/current-alert-policy.json');
const ticket = readJson('mock-data/jira-change.json');
const pullRequest = readJson('mock-data/github-pr.json');
const runbook = readText('mock-data/runbook.md');
const raci = readJson('raci.json');

const policyEngine = new PolicyEngine(policy);

const runRecord = createRunRecord({
  runId,
  domain: 'sre',
  workflow: 'monitoring-threshold-change-governance',
  actor: 'sre-governance-reference-app',
  status: 'completed',
  createdAt,
  updatedAt: completedAt,
  metadata: {
    packageReleaseContext: 'RuleOak Core public latest v2.1.0; this reference vertical is RuleOak Core v2.1.0',
    requestId: changeRequest.requestId,
    ticketKey: ticket.key,
    service: changeRequest.service,
    environment: changeRequest.environment
  }
});

const evidenceRecords = [
  createEvidenceRecord({
    evidenceId: 'sre-evidence-change-request',
    runId,
    action: 'read.change_ticket',
    subject: changeRequest.requestId,
    subjectType: 'change_request',
    source: 'local-fixture',
    createdAt,
    metadata: {
      service: changeRequest.service,
      alertId: changeRequest.alertId,
      currentThresholdMs: changeRequest.currentThresholdMs,
      requestedThresholdMs: changeRequest.requestedThresholdMs,
      rollbackPlanPresent: Boolean(changeRequest.rollbackPlan),
      successCriteriaCount: changeRequest.successCriteria.length
    }
  }),
  createEvidenceRecord({
    evidenceId: 'sre-evidence-ticket',
    runId,
    action: 'read.change_ticket',
    subject: ticket.key,
    subjectType: 'ticket',
    source: 'jira-readonly-fixture',
    createdAt,
    metadata: {
      status: ticket.status,
      risk: ticket.risk,
      plannedWindow: ticket.plannedWindow,
      expiry: ticket.expiry,
      approverCount: ticket.approvers.length
    }
  }),
  createEvidenceRecord({
    evidenceId: 'sre-evidence-metrics',
    runId,
    action: 'read.metric_baseline',
    subject: `${metrics.service}:${metrics.window}`,
    subjectType: 'metric_baseline',
    source: 'observability-fixture',
    createdAt,
    metadata: {
      p95MedianMs: metrics.p95LatencyMs.median,
      p95P90Ms: metrics.p95LatencyMs.p90,
      p95P99Ms: metrics.p95LatencyMs.p99,
      errorRateMaxPct: metrics.errorRatePct.max,
      warningPages24h: metrics.alertNoise.warningPages24h,
      criticalPages24h: metrics.alertNoise.criticalPages24h,
      relatedAlertsEnabled: metrics.relatedAlertsEnabled
    }
  }),
  createEvidenceRecord({
    evidenceId: 'sre-evidence-alert-policy',
    runId,
    action: 'read.alert_policy',
    subject: alertPolicy.alertId,
    subjectType: 'alert_policy',
    source: 'prometheus-alertmanager-fixture',
    createdAt,
    metadata: {
      warningThresholdMs: alertPolicy.warningThresholdMs,
      criticalThresholdMs: alertPolicy.criticalThresholdMs,
      enabled: alertPolicy.enabled,
      ownerTeam: alertPolicy.ownerTeam,
      evaluationWindow: alertPolicy.evaluationWindow
    }
  }),
  createEvidenceRecord({
    evidenceId: 'sre-evidence-runbook',
    runId,
    action: 'read.runbook',
    subject: alertPolicy.runbook,
    subjectType: 'runbook',
    source: 'local-runbook-fixture',
    createdAt,
    metadata: {
      requiresTicket: /ticket/i.test(runbook),
      requiresApproval: /approval/i.test(runbook),
      requiresExpiry: /expiry/i.test(runbook),
      preservesCriticalAlert: /critical p95 latency alert/i.test(runbook)
    }
  }),
  createEvidenceRecord({
    evidenceId: 'sre-evidence-pr',
    runId,
    action: 'read.pull_request',
    subject: pullRequest.id,
    subjectType: 'pull_request',
    source: 'github-readonly-fixture',
    createdAt,
    metadata: {
      repository: pullRequest.repository,
      filesChanged: pullRequest.filesChanged,
      diffSummary: pullRequest.diffSummary,
      lint: pullRequest.checks.lint,
      unitTests: pullRequest.checks.unitTests,
      policySimulation: pullRequest.checks.policySimulation,
      merged: pullRequest.merged
    }
  }),
  createEvidenceRecord({
    evidenceId: 'sre-evidence-raci',
    runId,
    action: 'generate.audit_report',
    subject: raci.process,
    subjectType: 'raci',
    source: 'local-raci-fixture',
    createdAt,
    metadata: {
      accountableRole: 'sreLead',
      stepCount: raci.steps.length,
      roles: Object.keys(raci.roles)
    }
  })
];

const readDecision = policyEngine.evaluate('read.metric_baseline', {
  requestId: changeRequest.requestId,
  evidenceIds: evidenceRecords.map((record) => record.evidenceId)
});
const writeDecision = policyEngine.evaluate('write.monitoring_threshold', {
  requestId: changeRequest.requestId,
  ticketKey: ticket.key,
  service: changeRequest.service,
  alertId: changeRequest.alertId,
  currentThresholdMs: changeRequest.currentThresholdMs,
  requestedThresholdMs: changeRequest.requestedThresholdMs,
  requiredEvidencePresent: evidenceRecords.map((record) => record.evidenceId),
  proposedBy: changeRequest.requestedBy
});
const blockedDecision = policyEngine.evaluate('disable.production_alert', {
  requestId: changeRequest.requestId,
  alertId: changeRequest.alertId,
  reason: 'Reference app proves dangerous shortcut is denied by default.'
});

const policyDecisionRecords = [
  createPolicyDecisionRecord({
    decisionId: 'sre-decision-read-evidence',
    runId,
    action: 'read.metric_baseline',
    subject: `${changeRequest.service}:baseline`,
    effect: 'allow',
    decision: 'allowed',
    matchedRuleIds: ['sre.monitoring.readonly.evidence.allowed'],
    reason: 'Read-only evidence collection is allowed locally.',
    createdAt,
    metadata: { engineDecision: readDecision.decision, allowedNow: readDecision.allowedNow }
  }),
  createPolicyDecisionRecord({
    decisionId: 'sre-decision-threshold-write',
    runId,
    action: 'write.monitoring_threshold',
    subject: changeRequest.alertId,
    effect: 'approval_required',
    decision: 'approval_required',
    matchedRuleIds: ['sre.monitoring.production.write.needs_approval'],
    reason: 'Production monitoring threshold writes require explicit SRE approval and an evidence bundle.',
    createdAt,
    metadata: {
      engineDecision: writeDecision.decision,
      approvalRequired: writeDecision.approvalRequired,
      allowedNow: writeDecision.allowedNow,
      ticketKey: ticket.key,
      evidenceCount: evidenceRecords.length
    }
  }),
  createPolicyDecisionRecord({
    decisionId: 'sre-decision-disable-alert-blocked',
    runId,
    action: 'disable.production_alert',
    subject: changeRequest.alertId,
    effect: 'deny',
    decision: 'blocked',
    matchedRuleIds: ['sre.monitoring.disable_alert.blocked'],
    reason: 'Disabling a production alert is blocked by default.',
    createdAt,
    metadata: { engineDecision: blockedDecision.decision, blocked: blockedDecision.blocked }
  })
];

const approvalRecord = createApprovalRecord({
  approvalId: 'sre-approval-threshold-write',
  runId,
  action: 'write.monitoring_threshold',
  subject: changeRequest.alertId,
  decision: 'approved',
  actor: 'sre-lead',
  reason: 'Evidence bundle is complete, critical alert remains unchanged, expiry is present, and rollback plan is documented.',
  createdAt: '2026-06-19T02:03:00.000Z',
  metadata: {
    approvedThresholdMs: changeRequest.requestedThresholdMs,
    expiry: ticket.expiry,
    implementationGate: 'merge.alert_rule_pr remains approval_required until PR review is complete',
    evidenceBundleRequired: true
  }
});

let auditEvents = [];
auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({ eventId: 'sre-audit-run-started', runId, eventType: 'run_started', actor: 'ruleoak', createdAt, metadata: { workflow: runRecord.workflow } }));
for (const evidence of evidenceRecords) {
  auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
    eventId: `audit-${evidence.evidenceId}`,
    runId,
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
    eventId: `audit-${decision.decisionId}`,
    runId,
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
  eventId: 'sre-audit-approval-recorded',
  runId,
  eventType: 'approval_recorded',
  action: approvalRecord.action,
  subject: approvalRecord.subject,
  actor: approvalRecord.actor,
  approvalId: approvalRecord.approvalId,
  createdAt: approvalRecord.createdAt,
  metadata: { decision: approvalRecord.decision }
}));
auditEvents = appendAuditEventChain(auditEvents, createAuditEvent({
  eventId: 'sre-audit-report-generated',
  runId,
  eventType: 'audit_report_generated',
  action: 'generate.audit_report',
  subject: changeRequest.requestId,
  actor: 'ruleoak',
  createdAt: completedAt,
  metadata: { report: 'sre-monitoring-change-report.json' }
}));

const reportSummary = {
  title: 'SRE monitoring threshold change governance report',
  requestId: changeRequest.requestId,
  ticketKey: ticket.key,
  service: changeRequest.service,
  alertId: changeRequest.alertId,
  status: 'approved_for_controlled_implementation',
  policyOutcome: {
    readEvidence: 'allowed',
    thresholdWrite: 'approval_required_then_approved',
    disableAlert: 'blocked'
  },
  evidenceCount: evidenceRecords.length,
  auditEventCount: auditEvents.length,
  riskLevel: changeRequest.riskLevel,
  conclusion: 'Proceed only through the reviewed PR path; do not disable alerting; retain the evidence bundle and approval record.'
};

const reportRecord = createReportRecord({
  reportId: 'sre-report-monitoring-change',
  runId,
  title: reportSummary.title,
  summary: reportSummary,
  records: [
    runRecord.runId,
    ...evidenceRecords.map((record) => record.evidenceId),
    ...policyDecisionRecords.map((record) => record.decisionId),
    approvalRecord.approvalId,
    ...auditEvents.map((record) => record.eventId)
  ],
  createdAt: completedAt,
  metadata: { htmlReport: 'sre-monitoring-change-report.html' }
});

const redactionManifest = createRedactionManifest({
  manifestId: 'sre-redaction-manifest',
  runId,
  actor: 'ruleoak',
  reason: 'Reference export demonstrates how enterprise reports can remove requester identities and ticket comments while preserving hashes.',
  fields: [
    { path: 'records[].metadata.requester', method: 'remove', reason: 'personal data not required for audit replay' },
    { path: 'records[].metadata.rawTicketComments', method: 'hash', reason: 'comments may contain sensitive operational detail' }
  ],
  createdAt: completedAt,
  metadata: { demoOnly: true }
});

const governanceRecords = [runRecord, ...evidenceRecords, ...policyDecisionRecords, approvalRecord, ...auditEvents, reportRecord];
const evidenceBundle = createEvidenceBundle({
  bundleId: 'sre-monitoring-change-evidence-bundle',
  runId,
  records: governanceRecords,
  redactionManifest,
  generatedAt: completedAt,
  metadata: {
    vertical: 'sre-monitoring-change-governance',
    replayCommand: 'node scripts/protocol-replay.js examples/sre-monitoring-change-governance/out/evidence-bundle.json examples/sre-monitoring-change-governance/out/audit-log.json'
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
    id: runId,
    app: 'RuleOak SRE Monitoring Change Governance',
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
  output: {
    changeRequest,
    ticket,
    currentAlertPolicy: alertPolicy,
    metricsBaseline: metrics,
    pullRequest,
    raci,
    recommendation: reportSummary.conclusion,
    implementationAllowedNow: approvalRecord.decision === 'approved' && writeDecision.approvalRequired,
    blockedShortcut: blockedDecision
  },
  protocol: {
    schemaVersion: 'ruleoak.governance.v1',
    evidenceBundleHash: evidenceBundle.bundleHash,
    auditChainLastHash: chainCheck.lastHash,
    recordHashes: governanceRecords.map((record) => ({ recordType: record.recordType, id: record.runId || record.evidenceId || record.decisionId || record.approvalId || record.eventId || record.reportId, hash: recordHash(record) }))
  },
  boundaryNote: 'Reference vertical only. RuleOak provides a local-first governance and evidence boundary; it is not a certified compliance product or production sandbox.'
};

const reportJsonPath = writeJson('sre-monitoring-change-report.json', referenceReport);
writeJson('governance-records.json', governanceRecords);
writeJson('evidence-bundle.json', evidenceBundle);
writeJson('audit-log.json', auditEvents);
writeJson('approval-request.json', approvalRecord);
writeJson('raci.json', raci);
fs.writeFileSync(path.join(outDir, 'sre-monitoring-change-report.html'), renderReport(referenceReport, { sourcePath: 'examples/sre-monitoring-change-governance/out/sre-monitoring-change-report.json' }));

console.log('\nRuleOak SRE Monitoring Change Governance');
console.log('-----------------------------------------');
console.log(`Request: ${changeRequest.requestId} / ${ticket.key}`);
console.log(`Service: ${changeRequest.service}`);
console.log(`Change: ${changeRequest.currentThresholdMs}ms -> ${changeRequest.requestedThresholdMs}ms warning threshold`);
console.log(`Read evidence: ${readDecision.decision}`);
console.log(`Threshold write: ${writeDecision.decision} -> ${approvalRecord.decision}`);
console.log(`Disable alert shortcut: ${blockedDecision.decision}`);
console.log(`Evidence records: ${evidenceRecords.length}`);
console.log(`Audit events: ${auditEvents.length}`);
console.log(`Evidence bundle hash: ${evidenceBundle.bundleHash}`);
console.log('Output written to examples/sre-monitoring-change-governance/out/\n');

export { referenceReport, evidenceBundle, auditEvents, governanceRecords };
