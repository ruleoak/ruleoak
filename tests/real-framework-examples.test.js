import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "examples/real-frameworks/README.md",
  "examples/real-frameworks/langgraph-python/guarded_node.py",
  "examples/real-frameworks/crewai-python/guarded_tool.py",
  "examples/real-frameworks/mcp-proxy/run.js",
  "examples/real-frameworks/coding-agent-boundary/run.js",
  "docs/adapters/real-framework-examples.md",
  "scripts/real-framework-examples-check.js"
];
for (const path of required) assert.ok(existsSync(path), `${path} should exist`);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(pkg.version, "2.1.0");
for (const script of [
  "adapter:real:all",
  "adapter:langgraph:real",
  "adapter:crewai:real",
  "adapter:mcp:real",
  "adapter:coding-agent:real",
  "adapter:real:check"
]) assert.ok(pkg.scripts[script], `${script} should exist`);

const docs = readFileSync("docs/adapters/real-framework-examples.md", "utf8");
assert.ok(docs.includes("LangGraph"));
assert.ok(docs.includes("CrewAI"));
assert.ok(docs.includes("MCP"));
assert.ok(docs.includes("Coding agent"));
assert.ok(!/post-v2\.0\.3|development[- ]snapshot|public[- ]roadmap/i.test(docs));
console.log("real framework examples tests passed");
process.exit(0);
