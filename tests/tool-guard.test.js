import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ToolGuard, ToolManifest, McpGuard } from "../src/guard/index.js";

const manifest = new ToolManifest({ tools: [
  { id: "search_docs", risk: "low" },
  { id: "send_external_message", risk: "medium" },
  { id: "delete_workspace_file", risk: "high" }
] });
const policy = {
  allowedTools: ["search_docs"],
  approvalRequired: ["send_external_message"],
  blockedTools: ["delete_workspace_file"]
};

const guard = new ToolGuard({ manifest, policy, runId: "test-tool-guard" });
assert.equal(guard.evaluateToolCall({ toolId: "search_docs" }).decision, "allowed");
assert.equal(guard.evaluateToolCall({ toolId: "send_external_message" }).decision, "approval_required");
assert.equal(guard.evaluateToolCall({ toolId: "delete_workspace_file" }).decision, "blocked");

const unknownHigh = new ToolGuard({ manifest: new ToolManifest({ tools: [] }), policy: {}, runId: "unknown-high" });
assert.equal(unknownHigh.evaluateToolCall({ toolId: "delete_production_database" }).decision, "blocked");

const mcp = new McpGuard({ server: { name: "test", tools: [{ name: "send_external_message", description: "Send message" }] }, policy, runId: "test-mcp" });
assert.equal(mcp.evaluateMcpToolCall({ name: "send_external_message", arguments: { body: "hello" } }).decision, "approval_required");

const outDir = "examples/tool-guard-demo/out";
rmSync(outDir, { recursive: true, force: true });
const result = spawnSync("node", ["examples/tool-guard-demo/run.js"], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.ok(result.stdout.includes("search_docs: allowed"));
assert.ok(result.stdout.includes("send_external_message: approval_required"));
assert.ok(result.stdout.includes("delete_workspace_file: blocked"));
assert.ok(existsSync("examples/tool-guard-demo/out/tool-guard-report.json"));
const report = JSON.parse(readFileSync("examples/tool-guard-demo/out/tool-guard-report.json", "utf8"));
assert.equal(report.runtimeVersion, "2.0.0");
assert.equal(report.summary.allowed, 1);
assert.equal(report.summary.approvalRequired, 1);
assert.equal(report.summary.blocked, 1);
console.log("tool-guard tests passed");
