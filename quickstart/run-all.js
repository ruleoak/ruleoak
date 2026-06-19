#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  "quickstart/01-govern-a-tool-call/run.js",
  "quickstart/02-block-dangerous-command/run.js",
  "quickstart/03-require-approval/run.js",
  "quickstart/04-generate-audit-report/run.js",
  "quickstart/05-replay-evidence-bundle/run.js"
];
const results = [];
for (const step of steps) {
  const result = spawnSync(process.execPath, [step], { stdio: "inherit" });
  results.push({ step, status: result.status });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(JSON.stringify({ ok: true, quickstarts: results.length, results }, null, 2));
