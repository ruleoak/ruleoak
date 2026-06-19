import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { appendAuditEventChain } from "../src/protocol/audit-log.js";
import { createAuditEvent, createEvidenceRecord, createPolicyDecisionRecord, createRunRecord } from "../src/protocol/record-factory.js";
import { createEvidenceBundle } from "../src/protocol/evidence-bundle.js";
import { createTrustRoot, generateEd25519KeyPair, validateTrustRoot } from "../src/integrity/signing.js";
import { signEvidenceBundle, signAuditEventChain, verifyAuditEventChainSignature, verifySignedEvidenceBundle } from "../src/integrity/evidence-integrity.js";
import { verifyAllPolicyPackSignatures } from "../src/integrity/policy-pack-integrity.js";

const root = process.cwd();

function fixtureTrustRoot() {
  return JSON.parse(readFileSync(join(root, "configs", "trust", "ruleoak-local-trust-root.json"), "utf8"));
}

function demoRecords() {
  const run = createRunRecord({ runId: "roak-run-integrity-test", domain: "integrity-test", workflow: "signed evidence test", createdAt: "2026-06-19T00:00:00.000Z" });
  const evidence = createEvidenceRecord({ evidenceId: "roak-evidence-integrity-test", runId: run.runId, action: "read.evidence", subject: "fixture", createdAt: "2026-06-19T00:00:01.000Z" });
  const decision = createPolicyDecisionRecord({ decisionId: "roak-decision-integrity-test", runId: run.runId, action: "write.file", subject: "fixture.txt", effect: "approval_required", createdAt: "2026-06-19T00:00:02.000Z" });
  return { run, evidence, decision };
}

test("Signed-integrity trust root validates", () => {
  const result = validateTrustRoot(fixtureTrustRoot());
  assert.equal(result.valid, true);
  assert.equal(result.keyCount, 1);
});

test("Signed-integrity verifies all signed policy pack manifests", () => {
  const result = verifyAllPolicyPackSignatures(join(root, "policy-packs"), fixtureTrustRoot());
  assert.equal(result.summary.total, 10);
  assert.equal(result.summary.invalid, 0);
  assert.equal(result.summary.valid, 10);
});

test("Signed evidence bundle verifies and tampering is detected", () => {
  const keys = generateEd25519KeyPair();
  const trustRoot = createTrustRoot({ keys: [{ keyId: "test-key", publicKeyPem: keys.publicKeyPem }] });
  const { run, evidence, decision } = demoRecords();
  const bundle = createEvidenceBundle({ bundleId: "roak-bundle-integrity-test", runId: run.runId, records: [run, evidence, decision], generatedAt: "2026-06-19T00:00:03.000Z" });
  const signed = signEvidenceBundle(bundle, { privateKeyPem: keys.privateKeyPem, keyId: "test-key", signedAt: "2026-06-19T00:00:04.000Z" });
  const ok = verifySignedEvidenceBundle(signed, trustRoot);
  assert.equal(ok.valid, true);
  const tampered = { ...signed, records: signed.records.map((record) => record.recordType === "PolicyDecisionRecord" ? { ...record, effect: "allowed" } : record) };
  const bad = verifySignedEvidenceBundle(tampered, trustRoot);
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some((error) => error.includes("payloadHash") || error.includes("bundleHash") || error.includes("recordHashes")));
});

test("Signed audit chain verifies and tampering is detected", () => {
  const keys = generateEd25519KeyPair();
  const trustRoot = createTrustRoot({ keys: [{ keyId: "audit-test-key", publicKeyPem: keys.publicKeyPem }] });
  let chain = [];
  chain = appendAuditEventChain(chain, createAuditEvent({ eventId: "roak-audit-integrity-1", runId: "roak-run-integrity-test", eventType: "run.started", createdAt: "2026-06-19T00:00:05.000Z" }));
  chain = appendAuditEventChain(chain, createAuditEvent({ eventId: "roak-audit-integrity-2", runId: "roak-run-integrity-test", eventType: "policy.decision", action: "write.file", subject: "fixture.txt", policyDecision: "approval_required", createdAt: "2026-06-19T00:00:06.000Z" }));
  const signature = signAuditEventChain(chain, { privateKeyPem: keys.privateKeyPem, keyId: "audit-test-key", signedAt: "2026-06-19T00:00:07.000Z" });
  const ok = verifyAuditEventChainSignature(chain, signature, trustRoot);
  assert.equal(ok.valid, true);
  const tampered = chain.map((event) => event.eventId === "roak-audit-integrity-2" ? { ...event, subject: "tampered.txt" } : event);
  const bad = verifyAuditEventChainSignature(tampered, signature, trustRoot);
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length > 0);
});
