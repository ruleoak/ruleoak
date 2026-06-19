#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(".");
const result = spawnSync("node", ["examples/research-brief-demo/run.js"], { cwd: root, encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);

const reportPath = join(root, "examples", "research-brief-demo", "out", "research-brief-report.json");
assert.equal(existsSync(reportPath), true, "research-brief-report.json should be generated");
const report = JSON.parse(readFileSync(reportPath, "utf8"));

assert.equal(report.runtimeVersion, "2.1.0");
assert.equal(report.runtimeStage, "governed-runtime");
assert.equal(report.run.app, "RuleOak Research Brief Demo");
assert.ok(report.output.question?.case_id, "report should include question case_id");
assert.ok(Array.isArray(report.output.claims), "report should include claims");
assert.ok(report.output.claims.every((claim) => Array.isArray(claim.source_ids) && claim.source_ids.length > 0), "every claim should have source IDs");
assert.equal(report.output.policy_decisions.publish.approvalRequired, true, "publishing should require approval");
assert.ok(report.approvals.some((request) => request.action === "brief.publish"), "publishing should create approval request");
assert.ok(report.auditEvents.some((event) => event.type === "policy.evaluated"), "audit should include policy events");

console.log("research-brief-demo test passed");
