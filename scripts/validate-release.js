#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const full = process.argv.includes("--full") || process.env.RULEOAK_FULL_VALIDATE === "1";
const commands = [
  ["npm", ["run", "typecheck"]],
  ...(full ? [["npm", ["test", "--", "--from-validate-release"]]] : []),
  ["npm", ["run", "release:readiness"]],
  ["npm", ["run", "protocol:status"]],
  ["npm", ["run", "docs:protocol:lint"]],
  ["npm", ["run", "test:connector-reliability"]],
  ["npm", ["run", "test:github-connector"]],
  ["npm", ["run", "test:jira-connector"]],
  ["npm", ["run", "test:connector-safety"]],
  ["npm", ["run", "test:security-corpus"]],
  ["npm", ["run", "test:mcp-safety"]],
  ["npm", ["run", "test:report-snapshots"]],
  ["npm", ["run", "protocol:conformance"]],
  ["npm", ["run", "protocol:python"]],
  ["npm", ["run", "python:bridge"]],
  ["npm", ["run", "integrate:10min"]],
  ["npm", ["run", "guard:demo"]],
  ["npm", ["run", "mcp:proxy:smoke"]],
  ["npm", ["run", "github:demo"]],
  ["npm", ["run", "jira:demo"]],
  ["npm", ["run", "connector:reliability"]],
  ["npm", ["run", "policy:demo"]],
  ["npm", ["run", "policy:test"]],
  ["npm", ["run", "approval:inbox:build"]],
  ["npm", ["run", "approval:inbox:export"]],
  ["npm", ["run", "viewer:build"]],
  ["npm", ["run", "telemetry:export"]],
  ["npm", ["run", "report:html"]],
  ["npm", ["run", "adapter:real:list"]],
  ["npm", ["run", "adapter:mcp:real"]],
  ["npm", ["run", "compatibility:matrix"]]
];

const results = [];
for (const [bin, args] of commands) {
  const command = `${bin} ${args.join(" ")}`;
  const startedAt = new Date().toISOString();
  try {
    execFileSync(bin, args, { stdio: "inherit", env: { ...process.env, RULEOAK_VALIDATE_RELEASE: "1" } });
    results.push({ command, status: "passed", startedAt, finishedAt: new Date().toISOString() });
  } catch (error) {
    results.push({ command, status: "failed", startedAt, finishedAt: new Date().toISOString(), exitCode: error.status ?? 1 });
    mkdirSync("reports/validation", { recursive: true });
    writeFileSync("reports/validation/release-validation.json", `${JSON.stringify({ ok: false, full, results }, null, 2)}\n`);
    process.exit(error.status ?? 1);
  }
}
mkdirSync("reports/validation", { recursive: true });
writeFileSync("reports/validation/release-validation.json", `${JSON.stringify({ ok: true, full, results }, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, full, commandCount: commands.length, outputPath: "reports/validation/release-validation.json" }, null, 2));
