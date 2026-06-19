#!/usr/bin/env node
import { ToolManifest } from "../../../src/guard/index.js";
import { wrapLangGraphTool, createCrewAiGovernedTool, adapterConformanceReport } from "../../../src/adapters/index.js";

const manifest = new ToolManifest({
  metadata: { source: "developer-adoption-real-frameworks" },
  tools: [
    { id: "search_docs", risk: "low", kind: "retrieval" },
    { id: "write_file", risk: "medium", kind: "filesystem" },
    { id: "delete_workspace", risk: "critical", kind: "destructive_command" }
  ]
});
const policy = {
  boundary: "developer_adoption_framework_adapter_boundary",
  allowedTools: ["search_docs"],
  approvalRequired: ["write_file"],
  blockedTools: ["delete_workspace"]
};

const langGraphSearch = wrapLangGraphTool({
  name: "search_docs",
  manifest,
  policy,
  subject: "docs/adoption/10-minute-quickstart.md",
  tool: async (input) => ({ hits: [`Result for ${input.query}`] })
});
const crewWriteFile = createCrewAiGovernedTool({
  name: "write_file",
  manifest,
  policy,
  subject: "src/example.js",
  func: async (input) => ({ wrote: input.path })
});
const langGraphDelete = wrapLangGraphTool({
  name: "delete_workspace",
  manifest,
  policy,
  subject: "./",
  tool: async () => ({ deleted: true })
});

const results = [
  await langGraphSearch({ query: "quickstart" }),
  await crewWriteFile.run({ path: "src/example.js" }),
  await langGraphDelete({ path: "./" })
];
const conformance = adapterConformanceReport({
  name: "Developer adoption adapter conformance",
  adapters: ["langgraph", "crewai"],
  reports: results
});

console.log(JSON.stringify({ ok: true, results, conformance }, null, 2));

const effects = results.map((result) => result.ruleoak?.effect);
if (!effects.includes("allow") || !effects.includes("approval_required") || !effects.includes("deny")) process.exit(1);
