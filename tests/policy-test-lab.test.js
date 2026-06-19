import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { PolicyTestLab, comparePolicyOutcomes, normalizeScenario } from "../src/policy-lab/index.js";

const root = process.cwd();
const lab = new PolicyTestLab({ rootDir: root });

const packs = lab.listPacks();
assert.ok(packs.length >= 6, "policy pack registry should load available packs");
assert.ok(packs.some((pack) => pack.id === "filesystem-safe"));

const scenario = JSON.parse(readFileSync(join(root, "configs", "policy-test-scenarios.example.json"), "utf8"));
const normalized = normalizeScenario(scenario);
assert.equal(normalized.calls.length, 8);

const report = lab.runScenario({
  packIds: ["filesystem-safe", "external-communication", "ticketing-write-approval", "cloud-llm-approval", "pii-redaction"],
  scenario
});
assert.equal(report.runtimeVersion, "2.1.0");
assert.equal(report.summary.failedExpectations, 0);
assert.equal(report.decisions.find((item) => item.toolId === "search_docs").decision, "allowed");
assert.equal(report.decisions.find((item) => item.toolId === "send_external_message").decision, "approval_required");
assert.equal(report.decisions.find((item) => item.toolId === "delete_workspace_file").decision, "blocked");
assert.ok(report.evidence.length >= report.decisions.length);
assert.ok(report.auditEvents.length >= report.decisions.length);

const explain = lab.explain(["filesystem-safe", "external-communication"]);
assert.ok(explain.tools.some((item) => item.toolId === "delete_workspace_file" && item.decision === "blocked"));
assert.ok(explain.tools.some((item) => item.toolId === "send_external_message" && item.decision === "approval_required"));

const diff = lab.diff({ beforePackIds: ["ticketing-readonly"], afterPackIds: ["ticketing-write-approval"], scenario });
assert.ok(diff.diff.changed >= 1);
assert.ok(diff.diff.changes.some((item) => item.toolId === "comment_ticket" && item.before === "blocked" && item.after === "approval_required"));

const comparison = comparePolicyOutcomes(
  [{ toolId: "x", decision: "allowed" }],
  [{ toolId: "x", decision: "blocked" }]
);
assert.equal(comparison.moreRestrictive, 1);

execFileSync(process.execPath, [join(root, "scripts", "policy-test.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(root, "scripts", "policy-explain.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(root, "scripts", "policy-diff.js")], { stdio: "pipe" });

assert.ok(existsSync(join(root, "reports", "policy-lab", "policy-test-report.json")));
assert.ok(existsSync(join(root, "reports", "policy-lab", "policy-explain.json")));
assert.ok(existsSync(join(root, "reports", "policy-lab", "policy-diff.json")));

console.log("policy test lab tests passed");
