#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const commands = [
  ["quickstart:01", ["run", "quickstart:01"]],
  ["quickstart:02", ["run", "quickstart:02"]],
  ["quickstart:03", ["run", "quickstart:03"]],
  ["quickstart:04", ["run", "quickstart:04"]],
  ["quickstart:05", ["run", "quickstart:05"]],
  ["adoption:real-frameworks", ["run", "adoption:real-frameworks"]]
];
const requiredDocs = [
  "quickstart/README.md",
  "docs/adoption/README.md",
  "docs/adoption/10-minute-quickstart.md",
  "docs/adoption/migration-from-plain-agent.md",
  "docs/adoption/compare-with-prompt-only-guardrails.md",
  "docs/adoption/framework-adapter-path.md",
  "docs/adoption/developer-adoption-checklist.md"
];
const problems = [];
for (const file of requiredDocs) {
  if (!existsSync(file)) problems.push({ type: "missing_doc", file });
}

for (const [name, args] of commands) {
  const result = spawnSync("npm", args, { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    problems.push({ type: "command_failed", name, status: result.status, stdout: result.stdout.slice(-1000), stderr: result.stderr.slice(-1000) });
  }
}

const reportPath = "quickstart/out/04-generate-audit-report/report.json";
if (!existsSync(reportPath)) {
  problems.push({ type: "missing_quickstart_report", file: reportPath });
} else {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (report.summary.allowed !== 1 || report.summary.approvalRequired !== 1 || report.summary.blocked !== 1) {
    problems.push({ type: "unexpected_report_summary", summary: report.summary });
  }
}
const replayPath = "quickstart/out/05-replay-evidence-bundle/replay-result.json";
if (!existsSync(replayPath)) {
  problems.push({ type: "missing_replay_result", file: replayPath });
} else {
  const replay = JSON.parse(readFileSync(replayPath, "utf8"));
  if (!replay.evidenceBundle.valid || !replay.auditChain.valid) problems.push({ type: "invalid_replay", replay });
}

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, commands: commands.length, requiredDocs: requiredDocs.length }, null, 2));
