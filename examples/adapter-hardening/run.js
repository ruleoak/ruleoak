#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ToolManifest } from "../../src/guard/tool-manifest.js";
import { ToolGuard } from "../../src/guard/tool-guard.js";
import {
  adapterConformanceReport,
  createCrewAiGovernedTool,
  createLangGraphGovernedNode,
  createLangGraphToolSpec,
  createMcpClientConfig,
  withRuleOakMcpProxy
} from "../../src/adapters/index.js";

const outDir = path.join(process.cwd(), "examples/adapter-hardening/out");
await mkdir(outDir, { recursive: true });

const manifest = ToolManifest.fromObject({
  tools: [
    { id: "search_docs", risk: "low", kind: "read" },
    { id: "write_file", risk: "medium", kind: "write" },
    { id: "send_external_message", risk: "high", kind: "external_write" },
    { id: "delete_workspace_file", risk: "critical", kind: "destructive" }
  ]
});
const policy = {
  allow: ["search_docs"],
  approvalRequired: ["write_file", "send_external_message"],
  block: ["delete_workspace_file"]
};
const guard = new ToolGuard({ manifest, policy, actor: "adapter-hardening-demo" });

const langGraphNode = createLangGraphGovernedNode({
  name: "search_docs",
  guard,
  node: async (input) => ({ documents: [`Result for ${input.query}`] }),
  subject: "langgraph-node:search_docs"
});
const langGraphWriteSpec = createLangGraphToolSpec({
  name: "write_file",
  guard,
  tool: async () => ({ wrote: true }),
  description: "Approval-gated file write",
  subject: "langgraph-tool:write_file"
});
const crewTool = createCrewAiGovernedTool({
  name: "send_external_message",
  guard,
  func: async () => ({ sent: true }),
  subject: "crewai-tool:send_external_message"
});

const langAllowed = await langGraphNode({ query: "governance protocol" });
const langApproval = await langGraphWriteSpec.invoke({ path: "README.md", content: "x" });
const crewApproval = await crewTool.run({ to: "customer@example.com", body: "draft" });

const mcpReport = await withRuleOakMcpProxy({
  manifest: {
    name: "ruleoak-mcp-adapter-demo",
    tools: [
      { name: "search_docs", risk: "low" },
      { name: "send_external_message", risk: "high" },
      { name: "delete_workspace_file", risk: "critical" }
    ]
  },
  policy: {
    allowedTools: ["search_docs"],
    approvalRequired: ["send_external_message"],
    blockedTools: ["delete_workspace_file"]
  },
  serverHandler: async (request) => ({ handled: true, tool: request.params?.name })
}, async ({ client, address }) => {
  const health = await client.health();
  const allowed = await client.callTool("search_docs", { query: "adapter" }, 101);
  const approval = await client.callTool("send_external_message", { to: "external" }, 102);
  const blocked = await client.callTool("delete_workspace_file", { path: "/tmp/x" }, 103);
  return { address, health, config: createMcpClientConfig({ url: address.url }), allowed, approval, blocked };
});

const reports = [langAllowed, langApproval, crewApproval];
const conformance = adapterConformanceReport({
  name: "RuleOak adapter hardening report",
  adapters: ["langgraph", "crewai", "mcp-local-jsonrpc"],
  reports,
  guard
});
const payload = {
  ok: true,
  releaseTrack: "adapter-hardening",
  adapters: {
    langgraph: { allowed: langAllowed, approvalRequired: langApproval },
    crewai: { approvalRequired: crewApproval },
    mcp: mcpReport
  },
  conformance
};
await writeFile(path.join(outDir, "adapter-conformance-report.json"), JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

process.exit(0);
