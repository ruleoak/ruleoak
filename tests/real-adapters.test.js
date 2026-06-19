import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { realAdapterManifest } from "../src/adapters/index.js";

const manifest = realAdapterManifest();
assert.equal(manifest.schema, "ruleoak.real_adapter_pack.v1");
assert.match(manifest.version, /^(?:2\.1\.0|2\.(?:[7-9]|10)\.0|3\.\d+\.0)$/);
assert.ok(manifest.adapters.some((adapter) => adapter.id === "langgraph-python"));
assert.ok(manifest.adapters.some((adapter) => adapter.id === "crewai-python"));
assert.ok(manifest.adapters.some((adapter) => adapter.id === "mcp-local-jsonrpc"));

for (const path of [
  "examples/real-adapters/langgraph/guarded_langgraph_example.py",
  "examples/real-adapters/crewai/guarded_crewai_example.py",
  "examples/real-adapters/mcp/run-local-mcp-client.js",
  "docs/adapters/real-adapter-pack.md"
]) assert.ok(existsSync(path), `${path} should exist`);

const listOutput = execFileSync("npm", ["run", "adapter:real:list"], { encoding: "utf8" });
assert.ok(listOutput.includes("langgraph-python"));
assert.ok(listOutput.includes("crewai-python"));
assert.ok(listOutput.includes("mcp-local-jsonrpc"));

const langgraphOutput = execFileSync("npm", ["run", "adapter:langgraph:real"], { encoding: "utf8" });
assert.ok(langgraphOutput.includes("langgraph-python"));
assert.ok(langgraphOutput.includes("ruleoak.governance.v1"));

const crewaiOutput = execFileSync("npm", ["run", "adapter:crewai:real"], { encoding: "utf8" });
assert.ok(crewaiOutput.includes("crewai-python"));
assert.ok(crewaiOutput.includes("approval_required"));

const mcpOutput = execFileSync("npm", ["run", "adapter:mcp:real"], { encoding: "utf8" });
assert.ok(mcpOutput.includes("mcp-local-jsonrpc"));
assert.ok(mcpOutput.includes("approval_required"));
assert.ok(mcpOutput.includes("blocked"));
console.log("real-adapters tests passed");

process.exit(0);
