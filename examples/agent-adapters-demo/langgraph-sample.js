import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { ToolManifest } from "../../src/guard/tool-manifest.js";
import { ToolGuard } from "../../src/guard/tool-guard.js";
import { wrapLangGraphTool } from "../../src/adapters/index.js";

const manifest = ToolManifest.fromObject(JSON.parse(readFileSync(new URL("./tool-manifest.json", import.meta.url), "utf8")));
const policy = JSON.parse(readFileSync(new URL("./policy.json", import.meta.url), "utf8"));
const guard = new ToolGuard({ manifest, policy, actor: "langgraph-sample" });

const searchDocs = wrapLangGraphTool({ name: "search_docs", guard, tool: async (input) => ({ documents: [`result for ${input.query}`] }) });
const sendMessage = wrapLangGraphTool({ name: "send_external_message", guard, tool: async () => ({ sent: true }) });

const allowed = await searchDocs({ query: "governance" });
const paused = await sendMessage({ to: "external@example.com", body: "hello" });
const report = guard.report({ title: "RuleOak LangGraph Adapter Sample", summary: "LangGraph-style tool calls wrapped by RuleOak Tool Guard." });
mkdirSync("examples/agent-adapters-demo/out", { recursive: true });
writeFileSync("examples/agent-adapters-demo/out/langgraph-adapter-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ allowed: allowed.ruleoak.decision, paused: paused.ruleoak.decision, report: "examples/agent-adapters-demo/out/langgraph-adapter-report.json" }, null, 2));
