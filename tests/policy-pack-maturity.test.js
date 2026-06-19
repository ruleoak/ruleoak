import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  POLICY_PACK_SCHEMA_VERSION,
  POLICY_PACK_LATEST_PUBLIC_CORE,
  PolicyPackRegistry,
  diffPolicyPackManifests,
  explainPolicyWithProvenance,
  validatePolicyPackManifest
} from "../src/policy-packs/index.js";
import { PolicyTestLab } from "../src/policy-lab/index.js";

const root = process.cwd();
const registry = PolicyPackRegistry.fromDirectory(join(root, "policy-packs"));
const packs = registry.list();
assert.ok(packs.length >= 10, "policy pack maturity should validate all current policy packs");
for (const pack of packs) {
  assert.equal(pack.schemaVersion, POLICY_PACK_SCHEMA_VERSION);
  assert.equal(pack.compatibility.latestPublicCoreRelease, POLICY_PACK_LATEST_PUBLIC_CORE);
  assert.equal(pack.compatibility.governanceProtocol, "ruleoak.governance.v1");
  assert.ok(pack.scenarioTests.length >= 1, `${pack.id} should define scenarioTests`);
  assert.equal(validatePolicyPackManifest(pack).valid, true, `${pack.id} manifest should be valid`);
}

const validation = registry.validateAll();
assert.equal(validation.summary.invalid, 0);
assert.equal(validation.summary.total, packs.length);

const matrix = registry.compatibilityMatrix();
assert.equal(matrix.latestPublicCoreRelease, "v2.1.0");
assert.equal(matrix.packs.length, packs.length);
assert.ok(matrix.packs.every((pack) => pack.scenarioTestCount >= 1));

const explain = registry.combine(["filesystem-safe", "external-communication"]).explain;
const deleteRow = explain.find((row) => row.toolId === "delete_workspace_file");
assert.equal(deleteRow.decision, "blocked");
assert.ok(deleteRow.packIds.includes("filesystem-safe"));
const sendRow = explain.find((row) => row.toolId === "send_external_message");
assert.equal(sendRow.decision, "approval_required");
assert.ok(sendRow.effects.some((effect) => effect.packId === "external-communication"));

const conflictExplain = explainPolicyWithProvenance([
  { id: "allow", version: "1.0.0", policy: { allowedTools: ["x"] } },
  { id: "deny", version: "1.0.0", policy: { blockedTools: ["x"] } }
]);
assert.equal(conflictExplain.find((row) => row.toolId === "x").decision, "blocked");
assert.equal(conflictExplain.find((row) => row.toolId === "x").conflictingEffects, true);

const before = JSON.parse(readFileSync(join(root, "policy-packs", "ticketing-readonly", "pack.json"), "utf8"));
const after = JSON.parse(readFileSync(join(root, "policy-packs", "ticketing-write-approval", "pack.json"), "utf8"));
const manifestDiff = diffPolicyPackManifests(before, after);
assert.ok(manifestDiff.policy.approvalRequired.added.includes("comment_ticket"));
assert.ok(manifestDiff.scenarioTests.afterCount >= 1);

const lab = new PolicyTestLab({ rootDir: root });
const scenarioReport = lab.runPackScenarios({ packIds: ["filesystem-safe", "coding-agent-governance", "enterprise-rag-governance", "personal-local-assistant-governance"] });
assert.equal(scenarioReport.summary.failed, 0);
assert.equal(scenarioReport.summary.packs, 4);

execFileSync(process.execPath, [join(root, "scripts", "policy-pack-validate.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(root, "scripts", "policy-pack-scenarios.js"), "--packs=filesystem-safe,coding-agent-governance"], { stdio: "pipe" });
execFileSync(process.execPath, [join(root, "scripts", "policy-pack-compatibility.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(root, "scripts", "policy-explain.js"), "--packs=filesystem-safe,external-communication"], { stdio: "pipe" });

assert.ok(existsSync(join(root, "reports", "policy-packs", "validation.json")));
assert.ok(existsSync(join(root, "reports", "policy-packs", "scenario-tests.json")));
assert.ok(existsSync(join(root, "reports", "policy-packs", "compatibility-matrix.json")));

console.log("policy pack maturity tests passed");
