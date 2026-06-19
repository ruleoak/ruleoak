#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEventChain } from "../../src/protocol/audit-log.js";
import { createAuditEvent, createEvidenceRecord, createPolicyDecisionRecord, createRunRecord } from "../../src/protocol/record-factory.js";
import { createEvidenceBundle } from "../../src/protocol/evidence-bundle.js";
import { createTrustRoot, generateEd25519KeyPair } from "../../src/integrity/signing.js";
import { signAuditEventChain, signEvidenceBundle, verifyAuditEventChainSignature, verifySignedEvidenceBundle } from "../../src/integrity/evidence-integrity.js";

const outDir = join(process.cwd(), "examples", "signed-integrity", "out");
mkdirSync(outDir, { recursive: true });

const keys = generateEd25519KeyPair();
const keyId = "ruleoak-signed-integrity-demo-key";
const trustRoot = createTrustRoot({
  rootId: "ruleoak-signed-integrity-demo-trust-root",
  createdAt: "2026-06-19T00:00:00.000Z",
  keys: [{ keyId, publicKeyPem: keys.publicKeyPem }],
  metadata: { mode: "local-demo", privateKeyStored: false }
});

const run = createRunRecord({ runId: "roak-run-signed-integrity-demo", domain: "integrity-demo", workflow: "signed evidence demo", actor: "developer", createdAt: "2026-06-19T00:00:00.000Z" });
const evidence = createEvidenceRecord({ evidenceId: "roak-evidence-signed-demo-1", runId: run.runId, action: "read.policy_pack", subject: "coding-agent-governance", source: "local-policy-pack", createdAt: "2026-06-19T00:00:01.000Z" });
const decision = createPolicyDecisionRecord({ decisionId: "roak-decision-signed-demo-1", runId: run.runId, action: "write.source_file", subject: "src/app.js", effect: "approval_required", reason: "Signed-integrity demo requires approval before repository write.", createdAt: "2026-06-19T00:00:02.000Z" });
const records = [run, evidence, decision];
const bundle = createEvidenceBundle({ bundleId: "roak-evidence-bundle-signed-demo", runId: run.runId, records, generatedAt: "2026-06-19T00:00:03.000Z", metadata: { demo: "signed-integrity" } });
const signedBundle = signEvidenceBundle(bundle, { privateKeyPem: keys.privateKeyPem, keyId, signedAt: "2026-06-19T00:00:04.000Z" });

let auditChain = [];
auditChain = appendAuditEventChain(auditChain, createAuditEvent({ eventId: "roak-audit-signed-demo-1", runId: run.runId, eventType: "run.started", actor: "ruleoak", createdAt: "2026-06-19T00:00:05.000Z" }));
auditChain = appendAuditEventChain(auditChain, createAuditEvent({ eventId: "roak-audit-signed-demo-2", runId: run.runId, eventType: "policy.decision", action: decision.action, subject: decision.subject, actor: "ruleoak", policyDecision: decision.effect, evidenceId: evidence.evidenceId, createdAt: "2026-06-19T00:00:06.000Z" }));
const auditSignature = signAuditEventChain(auditChain, { privateKeyPem: keys.privateKeyPem, keyId, signedAt: "2026-06-19T00:00:07.000Z" });

const bundleVerification = verifySignedEvidenceBundle(signedBundle, trustRoot);
const auditVerification = verifyAuditEventChainSignature(auditChain, auditSignature, trustRoot);

writeFileSync(join(outDir, "trust-root.json"), `${JSON.stringify(trustRoot, null, 2)}\n`);
writeFileSync(join(outDir, "signed-evidence-bundle.json"), `${JSON.stringify(signedBundle, null, 2)}\n`);
writeFileSync(join(outDir, "audit-events.json"), `${JSON.stringify(auditChain, null, 2)}\n`);
writeFileSync(join(outDir, "audit-chain.signature.json"), `${JSON.stringify(auditSignature, null, 2)}\n`);
writeFileSync(join(outDir, "verification-report.json"), `${JSON.stringify({ bundleVerification, auditVerification }, null, 2)}\n`);

console.log(JSON.stringify({
  schemaVersion: "ruleoak.integrity.v1",
  example: "signed-integrity",
  bundleValid: bundleVerification.valid,
  auditChainValid: auditVerification.valid,
  outDir
}, null, 2));

if (!bundleVerification.valid || !auditVerification.valid) process.exit(1);
