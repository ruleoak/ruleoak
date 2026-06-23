import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  "LICENSE-STRATEGY.md",
  "COMMERCIAL-LICENSING.md",
  "REPO-STRATEGY.md",
  "schemas/agentic/evidence-event.schema.json",
  "schemas/agentic/ruleoak-manifest.schema.json",
  "docs/DEVELOPER-GUIDE.md",
  "docs/agentic/README.md",
  "docs/agentic/api-reference.md",
  "docs/agentic/diagrams.md",
  "docs/agentic/evidence-jsonl-v1.md",
  "docs/agentic/ruleoak-yml-v1.md",
  "docs/agentic/integrations/any-agent.md",
  "docs/agentic/integrations/mcp.md",
  "docs/agentic/integrations/openclaw-style-agent.md",
  "docs/agentic/integrations/claude-code-style-agent.md",
  "docs/agentic/integrations/local-llm-agent.md",
  "docs/website-copy/ruleoak-v2.2.0-home.md",
  "quickstart/06-agent-firewall-flight-recorder/run.js",
  "examples/public-agentic-demo/run.js",
  "protocol-conformance-kit/agentic/v1/README.md"
];
for (const file of requiredFiles) assert.equal(existsSync(file), true, `missing ${file}`);
for (const file of [
  "agentic-stack.svg",
  "flight-recorder-lifecycle.svg",
  "mcp-permission-gateway.svg",
  "approval-dry-run-flow.svg",
  "manifest-safety-ci-flow.svg",
  "agentic-skill-integration.svg",
  "license-boundary.svg",
  "developer-adoption-loop.svg"
]) assert.equal(existsSync(`docs/assets/agentic-diagrams/${file}`), true, `missing diagram ${file}`);
const readme = readFileSync("README.md", "utf8");
assert.match(readme, /Agent Firewall \+ Flight Recorder/);
assert.match(readme, /AGPL-3\.0-or-later/);
assert.match(readme, /hello@ruleoak\.com/);
execFileSync("node", ["quickstart/06-agent-firewall-flight-recorder/run.js"], { stdio: "pipe" });
execFileSync("node", ["examples/public-agentic-demo/run.js"], { stdio: "pipe" });
console.log("agentic release readiness tests passed");
