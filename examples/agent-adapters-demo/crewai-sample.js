import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { ToolManifest } from "../../src/guard/tool-manifest.js";
import { ToolGuard } from "../../src/guard/tool-guard.js";
import { createCrewAiGovernedTool } from "../../src/adapters/index.js";

const manifest = ToolManifest.fromObject(JSON.parse(readFileSync(new URL("./tool-manifest.json", import.meta.url), "utf8")));
const policy = JSON.parse(readFileSync(new URL("./policy.json", import.meta.url), "utf8"));
const guard = new ToolGuard({ manifest, policy, actor: "crewai-sample" });

const searchDocs = createCrewAiGovernedTool({ name: "search_docs", guard, func: async (input) => ({ answer: `found ${input.query}` }) });
const deleteFile = createCrewAiGovernedTool({ name: "delete_workspace_file", guard, func: async () => ({ deleted: true }) });

const allowed = await searchDocs.run({ query: "policy" });
const blocked = await deleteFile.run({ path: "workspace/important.md" });
const report = guard.report({ title: "RuleOak CrewAI Adapter Sample", summary: "CrewAI-style tool calls wrapped by RuleOak Tool Guard." });
mkdirSync("examples/agent-adapters-demo/out", { recursive: true });
writeFileSync("examples/agent-adapters-demo/out/crewai-adapter-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ allowed: allowed.ruleoak.decision, blocked: blocked.ruleoak.decision, report: "examples/agent-adapters-demo/out/crewai-adapter-report.json" }, null, 2));
