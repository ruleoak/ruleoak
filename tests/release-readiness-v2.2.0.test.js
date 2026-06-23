import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(pkg.version, "2.2.0");
const readme = readFileSync("README.md", "utf8");
assert.match(readme, /Agent Firewall \+ Flight Recorder/);
assert.match(readme, /AGPL-3\.0-or-later/);
assert.match(readme, /hello@ruleoak\.com/);
for (const file of [
  "docs/DEVELOPER-GUIDE.md",
  "docs/agentic/api-reference.md",
  "docs/agentic/evidence-jsonl-v1.md",
  "docs/agentic/ruleoak-yml-v1.md",
  "docs/assets/agentic-diagrams/developer-adoption-loop.svg",
  "docs/website-copy/ruleoak-v2.2.0-home.md",
  "docs/launch/github-release-v2.2.0.md",
  "packages/ruleoak-py/pyproject.toml",
  "packages/ruleoak-agentic-skills/package.json"
]) assert.equal(existsSync(file), true, `missing ${file}`);
execFileSync("node", ["scripts/check-agentic-release-ready.js"], { stdio: "pipe" });
console.log("release-readiness-v2.2.0.test.js passed");
