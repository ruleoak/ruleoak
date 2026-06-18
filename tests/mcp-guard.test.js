import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { McpGuard, McpServerManifest } from "../src/guard/index.js";

const server = {
  serverInfo: { name: "test-mcp", version: "0.1.0" },
  tools: [
    { name: "search_docs", description: "read docs" },
    { name: "send_external_message", description: "send email" },
    { name: "delete_workspace_file", description: "delete file" }
  ]
};
const manifest = McpServerManifest.fromObject(server);
assert.equal(manifest.inspect().toolCount, 3);
assert.ok(manifest.toToolManifest().get("search_docs"));

const policy = { allowedTools: ["search_docs"], approvalRequired: ["send_external_message"], blockedTools: ["delete_workspace_file"] };
const guard = new McpGuard({ server, policy, runId: "test-mcp-guard" });
assert.equal(guard.evaluateMcpRequest({ method: "tools/call", params: { name: "search_docs", arguments: { query: "x" } } }).decision, "allowed");
assert.equal(guard.evaluateMcpRequest({ method: "tools/call", params: { name: "send_external_message", arguments: { body: "x" } } }).decision, "approval_required");
assert.equal(guard.evaluateMcpRequest({ method: "tools/call", params: { name: "delete_workspace_file", arguments: { path: "x" } } }).decision, "blocked");
const report = guard.report();
assert.equal(report.runtimeVersion, "2.0.0");
assert.equal(report.runtimeStage, "mcp-guard-pack");
assert.equal(report.mcp.server.toolCount, 3);

const outDir = "examples/mcp-guard-demo/out";
rmSync(outDir, { recursive: true, force: true });
const result = spawnSync("node", ["examples/mcp-guard-demo/run.js"], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.ok(result.stdout.includes("search_docs: allowed"));
assert.ok(result.stdout.includes("send_external_message: approval_required"));
assert.ok(result.stdout.includes("delete_workspace_file: blocked"));
assert.ok(existsSync("examples/mcp-guard-demo/out/mcp-guard-report.json"));
const fileReport = JSON.parse(readFileSync("examples/mcp-guard-demo/out/mcp-guard-report.json", "utf8"));
assert.equal(fileReport.mcp.requestDecisionCount, 3);
console.log("mcp-guard tests passed");
