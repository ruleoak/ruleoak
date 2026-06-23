#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { validateEvidenceJsonlText, parseRuleOakManifestText, validateRuleOakManifest } from "../src/agentic/index.js";

const required = [
  "README.md",
  "COMMERCIAL-LICENSING.md",
  "LICENSE-STRATEGY.md",
  "REPO-STRATEGY.md",
  "docs/DEVELOPER-GUIDE.md",
  "docs/agentic/api-reference.md",
  "docs/agentic/evidence-jsonl-v1.md",
  "docs/agentic/ruleoak-yml-v1.md",
  "docs/assets/agentic-diagrams/developer-adoption-loop.svg",
  "fixtures/agentic/evidence/v1/valid-agentic-evidence.jsonl",
  "fixtures/agentic/manifest/v1/valid-ruleoak.yml",
  "packages/ruleoak-py/pyproject.toml",
  "packages/ruleoak-agentic-skills/package.json"
];
const failures = [];
for (const file of required) if (!existsSync(file)) failures.push(`missing ${file}`);
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (pkg.version !== "2.2.0") failures.push(`package version must be 2.2.0, got ${pkg.version}`);
const readme = readFileSync("README.md", "utf8");
for (const needle of ["Agent Firewall + Flight Recorder", "AGPL-3.0-or-later", "hello@ruleoak.com"]) {
  if (!readme.includes(needle)) failures.push(`README missing ${needle}`);
}
const evidence = validateEvidenceJsonlText(readFileSync("fixtures/agentic/evidence/v1/valid-agentic-evidence.jsonl", "utf8"), { allowUnknownTypes: false });
if (!evidence.ok) failures.push(`evidence fixture invalid: ${JSON.stringify(evidence.errors)}`);
const manifest = validateRuleOakManifest(parseRuleOakManifestText(readFileSync("fixtures/agentic/manifest/v1/valid-ruleoak.yml", "utf8")));
if (!manifest.ok) failures.push(`manifest fixture invalid: ${JSON.stringify(manifest.errors)}`);
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, version: pkg.version, checked: required.length }, null, 2));
