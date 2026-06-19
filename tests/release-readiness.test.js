#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { getGovernanceProtocolStatus } from "../src/protocol/index.js";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(pkg.version, "2.1.0");
assert.match(pkg.description, /governance for AI tool calls/i);

const status = getGovernanceProtocolStatus();
assert.equal(status.schemaVersion, "ruleoak.governance.v1");
assert.equal(status.status, "stable");
assert.equal(status.compatibleCoreLine, "v2.x and future major releases");

const inspect = execFileSync("node", ["src/cli/index.js", "inspect"], { encoding: "utf8" });
assert.match(inspect, /2\.1\.0/);
assert.match(inspect, /governance/i);

const readiness = execFileSync("node", ["scripts/release-readiness.js"], { encoding: "utf8" });
const parsed = JSON.parse(readiness);
assert.equal(parsed.ok, true);
assert.equal(parsed.protocol, "ruleoak.governance.v1");
assert.equal(parsed.protocolStatus, "stable");

console.log("release readiness test passed");
