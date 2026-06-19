#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const json = (cmd, args) => JSON.parse(execFileSync(cmd, args, { encoding: "utf8" }));
const checks = [];
function check(condition, name) {
  checks.push({ name, ok: Boolean(condition) });
}

for (const path of [
  "examples/real-frameworks/README.md",
  "examples/real-frameworks/langgraph-python/guarded_node.py",
  "examples/real-frameworks/crewai-python/guarded_tool.py",
  "examples/real-frameworks/mcp-proxy/run.js",
  "examples/real-frameworks/coding-agent-boundary/run.js",
  "docs/adapters/real-framework-examples.md"
]) check(existsSync(path), `${path} exists`);

const langgraph = json("python3", ["examples/real-frameworks/langgraph-python/guarded_node.py"]);
check(langgraph.ok && langgraph.ruleoakCoreRelease === "2.1.0", "LangGraph example reports v2.1.0");
check(langgraph.summary.allowed === 1 && langgraph.summary.approvalRequired === 1 && langgraph.summary.denied === 1, "LangGraph example covers allow/approval/deny");

const crewai = json("python3", ["examples/real-frameworks/crewai-python/guarded_tool.py"]);
check(crewai.ok && crewai.ruleoakCoreRelease === "2.1.0", "CrewAI example reports v2.1.0");
check(crewai.summary.allowed === 1 && crewai.summary.approvalRequired === 1 && crewai.summary.denied === 1, "CrewAI example covers allow/approval/deny");

const mcp = json(process.execPath, ["examples/real-frameworks/mcp-proxy/run.js"]);
check(mcp.ok && mcp.ruleoakCoreRelease === "2.1.0", "MCP proxy example reports v2.1.0");
check(mcp.executed.includes("search_docs") && !mcp.executed.includes("delete_workspace_file"), "MCP executes allowed call only");
check(JSON.stringify(mcp).includes("approval_required") && JSON.stringify(mcp).includes("blocked"), "MCP example covers approval and blocked decisions");

const coding = json(process.execPath, ["examples/real-frameworks/coding-agent-boundary/run.js"]);
check(coding.ok && coding.ruleoakCoreRelease === "2.1.0", "Coding-agent boundary reports v2.1.0");
check(coding.executed.includes("read_file") && coding.paused.includes("push_to_main") && coding.blocked.includes("shell_rm_rf"), "Coding-agent boundary covers execute/pause/block");

const docsText = ["README.md", "docs/adapters/real-framework-examples.md", "docs/adapters/real-adapter-pack.md"]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
check(!/post-v2\.0\.3|development[- ]snapshot/i.test(docsText), "External adapter docs do not use preview wording");
check(!/public[- ]roadmap|roadmap\.html/i.test(docsText), "External adapter docs do not expose roadmap content");

const failed = checks.filter((item) => !item.ok);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
} else {
  for (const item of checks) console.log(`${item.ok ? "✓" : "✗"} ${item.name}`);
}
if (failed.length) process.exit(1);
