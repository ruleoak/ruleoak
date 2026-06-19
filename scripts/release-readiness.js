#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { getGovernanceProtocolStatus } from "../src/protocol/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const pkg = readJson("package.json");
const status = getGovernanceProtocolStatus();
const requiredScripts = [
  "integrate:10min",
  "guard:demo",
  "mcp:proxy:smoke",
  "policy:test",
  "approval:inbox:build",
  "github:demo",
  "jira:demo",
  "connector:reliability",
  "protocol:status",
  "protocol:conformance",
  "protocol:python",
  "python:bridge",
  "test:python-bridge",
  "docs:protocol:lint",
  "compatibility:matrix",
  "validate:release"
];

const missingScripts = requiredScripts.filter((name) => !pkg.scripts?.[name]);
const readme = readFileSync("README.md", "utf8");
const docs = [
  "docs/protocol/stability-contract.md",
  "docs/stable-local-governance-layer.md",
  "docs/compatibility-matrix.md",
  "docs/hardening/release-validation.md"
];
const missingDocs = docs.filter((path) => !existsSync(path));

const checks = [
  { name: "package version is v2.1.0 public release", ok: pkg.version === "2.1.0" },
  { name: "protocol remains ruleoak.governance.v1", ok: status.schemaVersion === "ruleoak.governance.v1" },
  { name: "protocol status is stable", ok: status.status === "stable" },
  { name: "protocol line covers v2.x and future major releases", ok: status.compatibleCoreLine === "v2.x and future major releases" },
  { name: "required scripts are present", ok: missingScripts.length === 0, details: missingScripts },
  { name: "required docs are present", ok: missingDocs.length === 0, details: missingDocs },
  { name: "README positions RuleOak Core as governance for AI tool calls", ok: /RuleOak Core v2\.1\.0|RuleOak Core/.test(readme) && /governance for AI tool calls/i.test(readme) },
  { name: "README keeps explicit non-certification boundary", ok: /not a certified compliance product/i.test(readme) || /not a legal compliance standard/i.test(readme) }
];

let protocolLintOk = false;
try {
  execFileSync("node", ["scripts/docs-protocol-lint.js"], { stdio: "pipe" });
  protocolLintOk = true;
} catch {
  protocolLintOk = false;
}
checks.push({ name: "protocol docs lint passes", ok: protocolLintOk });

const ok = checks.every((check) => check.ok);
mkdirSync("reports/validation", { recursive: true });
const report = { ok, version: pkg.version, protocol: status.schemaVersion, protocolStatus: status.status, compatibleCoreLine: status.compatibleCoreLine, checks };
writeFileSync("reports/validation/release-readiness.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);
