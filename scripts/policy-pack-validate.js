#!/usr/bin/env node
import { PolicyTestLab } from "../src/policy-lab/index.js";
import { writeJsonReport } from "./policy-lab-utils.js";

const root = process.cwd();
const lab = new PolicyTestLab({ rootDir: root });
const report = lab.validatePacks();
console.log("RuleOak policy pack validation");
console.log("==============================");
console.log(`Schema: ${report.schemaVersion}`);
console.log(`Packs: ${report.summary.total}, valid=${report.summary.valid}, invalid=${report.summary.invalid}, warnings=${report.summary.warnings}`);
for (const pack of report.packs) {
  const status = pack.valid ? "valid" : "invalid";
  console.log(`${pack.id}@${pack.version}: ${status}, warnings=${pack.warnings.length}`);
  for (const error of pack.errors) console.log(`  error: ${error}`);
  for (const warning of pack.warnings) console.log(`  warning: ${warning}`);
}
const path = writeJsonReport(root, "reports/policy-packs/validation.json", report);
console.log(`Report: ${path}`);
if (report.summary.invalid > 0) process.exitCode = 1;
