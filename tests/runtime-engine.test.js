#!/usr/bin/env node
import assert from "node:assert/strict";
import { RunManager, PolicyEngine } from "../src/runtime/index.js";

const policy = {
  boundary: "local_only",
  allowedTools: ["read.logs"],
  approvalRequired: ["restart.service"],
  blockedTools: ["delete.database"]
};

const engine = new PolicyEngine(policy);
assert.equal(engine.evaluate("read.logs").decision, "allowed");
assert.equal(engine.evaluate("restart.service").approvalRequired, true);
assert.equal(engine.evaluate("delete.database").blocked, true);
assert.equal(engine.evaluate("unknown.action").approvalRequired, true);

const run = new RunManager({ app: "Runtime Test", policy }).start();
run.addEvidence({ id: "E1", source: "test", claim: "runtime records evidence", value: "ok" });
const { decision, approval } = run.evaluateAction("restart.service");
const report = run.complete({ summary: { ok: true }, output: { decision } });

assert.equal(report.runtimeVersion, "2.0.0");
assert.equal(report.runtimeStage, "early-runtime");
assert.equal(report.evidence.length, 1);
assert.equal(decision.approvalRequired, true);
assert.equal(approval.status, "pending");
assert.ok(report.auditEvents.some((event) => event.type === "policy.evaluated"));
assert.ok(report.auditEvents.some((event) => event.type === "approval.requested"));

console.log("runtime-engine test passed");
