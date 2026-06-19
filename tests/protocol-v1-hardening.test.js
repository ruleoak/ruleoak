#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  appendAuditEventChain,
  canonicalJson,
  createApprovalRecord,
  createAuditEvent,
  createEvidenceBundle,
  createEvidenceRecord,
  createPolicyDecisionRecord,
  createProtocolEnvelope,
  createRedactionManifest,
  createRunRecord,
  recordHash,
  validateGovernanceRecord,
  verifyAuditEventChain,
  verifyEvidenceBundle
} from "../src/protocol/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";
const run = createRunRecord({ runId: "protocol-run-001", domain: "sre", workflow: "threshold-change", actor: "tester", status: "completed", createdAt, updatedAt: createdAt });
const evidence = createEvidenceRecord({ evidenceId: "protocol-ev-001", runId: run.runId, action: "read_ticket", subject: "JIRA-1", subjectType: "ticket", source: "fixture", createdAt, metadata: { severity: "medium" } });
const decision = createPolicyDecisionRecord({ decisionId: "protocol-dec-001", runId: run.runId, action: "change_threshold", subject: "latency-alert", effect: "approval_required", matchedRuleIds: ["sre.threshold.approval"], reason: "Threshold change requires approval", createdAt });
const approval = createApprovalRecord({ approvalId: "protocol-ap-001", runId: run.runId, action: "change_threshold", subject: "latency-alert", decision: "approved", actor: "sre-lead", reason: "Evidence complete", createdAt });

for (const record of [run, evidence, decision, approval]) {
  const validation = validateGovernanceRecord(record);
  assert.equal(validation.valid, true);
}

assert.throws(() => validateGovernanceRecord({ ...run, extra: true }), /not part of RuleOak Governance Protocol v1/);
assert.throws(() => validateGovernanceRecord({ ...run, createdAt: "2026-01-01" }), /ISO-8601 UTC/);

const evidenceSame = createEvidenceRecord({ evidenceId: "protocol-ev-001", runId: run.runId, action: "read_ticket", subject: "JIRA-1", subjectType: "ticket", source: "fixture", createdAt, metadata: { severity: "medium" } });
assert.equal(evidence.hash, evidenceSame.hash, "canonical evidence hash must be deterministic");
assert.equal(recordHash(evidence), evidence.hash, "recordHash ignores integrity fields and verifies evidence hash");
assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));

const envelope = createProtocolEnvelope(run, { sdk: "ruleoak-core", sdkVersion: "2.1.0" });
assert.equal(envelope.protocol, "ruleoak.governance.v1");
assert.equal(envelope.kind, "RunRecord");

let chain = [];
chain = appendAuditEventChain(chain, createAuditEvent({ eventId: "protocol-au-001", runId: run.runId, eventType: "policy_checked", action: decision.action, subject: decision.subject, policyDecision: decision.effect, createdAt }));
chain = appendAuditEventChain(chain, createAuditEvent({ eventId: "protocol-au-002", runId: run.runId, eventType: "approval_recorded", action: approval.action, subject: approval.subject, approvalId: approval.approvalId, createdAt }));
assert.equal(verifyAuditEventChain(chain).valid, true);
assert.equal(chain[1].previousHash, chain[0].eventHash);
const tamperedChain = chain.map((event) => ({ ...event }));
tamperedChain[0].eventType = "tampered";
assert.equal(verifyAuditEventChain(tamperedChain).valid, false);

const redactionManifest = createRedactionManifest({ manifestId: "protocol-redact-001", runId: run.runId, actor: "tester", reason: "Remove customer identifiers", fields: [{ path: "records[0].metadata.customerName", method: "remove", reason: "PII" }], createdAt });
const bundle = createEvidenceBundle({ bundleId: "protocol-bundle-001", runId: run.runId, records: [run, evidence, decision, approval, ...chain], redactionManifest, generatedAt: createdAt, metadata: { scenario: "protocol-hardening" } });
const bundleCheck = verifyEvidenceBundle(bundle);
assert.equal(bundleCheck.valid, true, bundleCheck.errors.join("; "));
const tamperedBundle = { ...bundle, records: bundle.records.map((record) => ({ ...record })) };
tamperedBundle.records[1].subject = "JIRA-2";
assert.equal(verifyEvidenceBundle(tamperedBundle).valid, false);

console.log("protocol v1 hardening test passed");
