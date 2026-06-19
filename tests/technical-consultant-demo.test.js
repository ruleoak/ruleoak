#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(".");
const result = spawnSync("node", ["examples/technical-consultant-demo/run.js"], { cwd: root, encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);

const reportPath = join(root, "examples", "technical-consultant-demo", "out", "case-report.json");
assert.equal(existsSync(reportPath), true, "case-report.json should be generated");
const report = JSON.parse(readFileSync(reportPath, "utf8"));

assert.equal(report.runtimeVersion, "2.1.0");
assert.equal(report.runtimeStage, "governed-runtime");
assert.equal(report.run.app, "RuleOak Technical Consultant Demo");
assert.ok(report.output.case?.id, "report should include case id");
assert.ok(report.output.probableCause, "report should include probable cause");
assert.ok(Array.isArray(report.evidence), "report should include evidence array");
assert.ok(report.evidence.length >= 5, "report should include at least 5 evidence items");
assert.equal(report.output.policyDecision.approvalRequired, true, "demo should require approval for risky action");
assert.equal(report.approvals.length, 1, "demo should create one approval request");
assert.ok(report.auditEvents.length >= 5, "report should include audit events");

console.log("technical-consultant-demo test passed");
