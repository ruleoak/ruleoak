#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
execFileSync(process.execPath, ["examples/ten-minute-tool-governance/run.js"], { cwd: root, stdio: "pipe" });
const reportPath = join(root, "examples/ten-minute-tool-governance/out/ten-minute-governance-report.json");
if (!existsSync(reportPath)) throw new Error("10-minute governance report was not generated");
const report = JSON.parse(readFileSync(reportPath, "utf8"));
if (report.summary.toolDecisionCount !== 3) throw new Error("expected 3 tool decisions");
if (!report.toolDecisions.some((d) => d.decision === "approval_required")) throw new Error("expected approval_required decision");
if (!report.toolDecisions.some((d) => d.decision === "blocked")) throw new Error("expected blocked decision");
if (report.protocolCompatibility?.protocol !== "ruleoak.governance.v1") throw new Error("expected protocol compatibility note");
console.log("polish release test passed");
