#!/usr/bin/env node
import { PolicyTestLab } from "../src/policy-lab/index.js";
import { loadScenario, parseListArg, writeJsonReport } from "./policy-lab-utils.js";

const root = process.cwd();
const beforePackIds = parseListArg("before", ["ticketing-readonly"]);
const afterPackIds = parseListArg("after", ["ticketing-write-approval"]);
const scenario = loadScenario(root);
const lab = new PolicyTestLab({ rootDir: root });
const report = lab.diff({ beforePackIds, afterPackIds, scenario });
console.log("RuleOak policy diff");
console.log("===================");
console.log(`Before: ${beforePackIds.join(", ")}`);
console.log(`After:  ${afterPackIds.join(", ")}`);
if (report.diff.changes.length === 0) console.log("No decision changes.");
for (const change of report.diff.changes) {
  console.log(`${change.toolId}: ${change.before} -> ${change.after} (${change.direction})`);
}
console.log(`Changed=${report.diff.changed}, more_restrictive=${report.diff.moreRestrictive}, less_restrictive=${report.diff.lessRestrictive}`);
const path = writeJsonReport(root, "reports/policy-lab/policy-diff.json", report);
console.log(`Report: ${path}`);
