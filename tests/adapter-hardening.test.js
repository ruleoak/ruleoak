import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ToolManifest } from "../src/guard/tool-manifest.js";
import { ToolGuard } from "../src/guard/tool-guard.js";
import {
  RULEOAK_ADAPTER_CONFORMANCE_VERSION,
  RuleOakMcpLocalClient,
  adapterConformanceReport,
  createCrewAiGovernedTool,
  createLangGraphGovernedNode,
  createLangGraphToolSpec,
  createMcpClientConfig,
  withRuleOakMcpProxy
} from "../src/adapters/index.js";

const manifest = ToolManifest.fromObject({ tools: [
  { id: "search_docs", risk: "low" },
  { id: "write_file", risk: "medium" },
  { id: "send_external_message", risk: "high" },
  { id: "delete_workspace_file", risk: "critical" }
] });
const policy = { allow: ["search_docs"], approvalRequired: ["write_file", "send_external_message"], block: ["delete_workspace_file"] };
const guard = new ToolGuard({ manifest, policy, actor: "adapter-hardening-test" });

let executed = 0;
const langNode = createLangGraphGovernedNode({ name: "search_docs", guard, node: async () => { executed++; return { ok: true }; } });
const langResult = await langNode({ q: "x" });
assert.equal(langResult.schema, RULEOAK_ADAPTER_CONFORMANCE_VERSION);
assert.equal(langResult.executed, true);
assert.equal(langResult.ruleoak.effect, "allow");
assert.equal(executed, 1);

const langWrite = createLangGraphToolSpec({ name: "write_file", guard, tool: async () => { executed++; return { wrote: true }; } });
const writeResult = await langWrite.invoke({ path: "x" });
assert.equal(writeResult.executed, false);
assert.equal(writeResult.ruleoak.effect, "approval_required");
assert.equal(executed, 1);

const crewDelete = createCrewAiGovernedTool({ name: "delete_workspace_file", guard, func: async () => { executed++; return { deleted: true }; } });
const deleteResult = await crewDelete.run({ path: "x" });
assert.equal(deleteResult.executed, false);
assert.equal(deleteResult.ruleoak.effect, "deny");
assert.equal(executed, 1);

const conformance = adapterConformanceReport({ reports: [langResult, writeResult, deleteResult], adapters: ["langgraph", "crewai"], guard });
assert.equal(conformance.schema, RULEOAK_ADAPTER_CONFORMANCE_VERSION);
assert.equal(conformance.summary.allowed, 1);
assert.equal(conformance.summary.approvalRequired, 1);
assert.equal(conformance.summary.denied, 1);

const mcpSummary = await withRuleOakMcpProxy({
  manifest: { name: "adapter-hardening-mcp-test", tools: [{ name: "search_docs", risk: "low" }, { name: "send_external_message", risk: "high" }, { name: "delete_workspace_file", risk: "critical" }] },
  policy: { allowedTools: ["search_docs"], approvalRequired: ["send_external_message"], blockedTools: ["delete_workspace_file"] },
  serverHandler: async () => ({ ok: true })
}, async ({ client, address, config }) => {
  assert.ok(address.url.startsWith("http://127.0.0.1:"));
  assert.equal(config.schema, "ruleoak.mcp_client_config.v1");
  assert.match(config.endpoint, /\/rpc$/);
  assert.equal(client instanceof RuleOakMcpLocalClient, true);
  const allowed = await client.callTool("search_docs", {}, 1);
  const approval = await client.callTool("send_external_message", {}, 2);
  const blocked = await client.callTool("delete_workspace_file", {}, 3);
  return { allowed, approval, blocked };
});
assert.ok(mcpSummary.allowed.result);
assert.equal(mcpSummary.approval.error.code, -32001);
assert.equal(mcpSummary.blocked.error.code, -32003);
const config = createMcpClientConfig({ url: "http://127.0.0.1:7777" });
assert.equal(config.endpoint, "http://127.0.0.1:7777/rpc");

const output = execFileSync("npm", ["run", "adapter:hardening"], { encoding: "utf8" });
assert.ok(output.includes("adapter-hardening"));
assert.ok(output.includes("ruleoak.adapter_conformance.v1"));
const reportPath = "examples/adapter-hardening/out/adapter-conformance-report.json";
assert.ok(existsSync(reportPath));
const report = JSON.parse(readFileSync(reportPath, "utf8"));
assert.equal(report.ok, true);
assert.equal(report.conformance.summary.approvalRequired, 2);
console.log("adapter hardening tests passed");

process.exit(0);
