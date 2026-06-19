#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { GOVERNANCE_SCHEMA_VERSION, getGovernanceProtocolStatus, validateGovernanceRecord, createRunRecord } from "../src/protocol/index.js";

assert.equal(GOVERNANCE_SCHEMA_VERSION, "ruleoak.governance.v1");

const status = getGovernanceProtocolStatus();
assert.equal(status.schemaVersion, "ruleoak.governance.v1");
assert.equal(status.status, "stable");
assert.equal(status.compatibleCoreLine, "v2.x and future major releases");
assert.equal(status.breakingChangePath, "protocol v2");
assert.ok(status.recordTypes.includes("RunRecord"));
assert.ok(status.compatibilityRules.some((rule) => rule.includes("Required fields")));

const runRecord = createRunRecord({ runId: "test-run-protocol-stability", status: "completed" });
assert.equal(validateGovernanceRecord(runRecord).valid, true);

const output = execFileSync("node", ["scripts/protocol-status.js"], { encoding: "utf8" });
assert.match(output, /Protocol: ruleoak\.governance\.v1/);
assert.match(output, /Status: stable/);
assert.match(output, /Compatible Core line: v2\.x and future major releases/);

execFileSync("node", ["scripts/docs-protocol-lint.js"], { stdio: "inherit" });

console.log("protocol-stability test passed");
