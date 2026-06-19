#!/usr/bin/env node
import { PolicyTestLab } from "../src/policy-lab/index.js";
import { parseListArg, writeJsonReport } from "./policy-lab-utils.js";

const root = process.cwd();
const packIds = parseListArg("packs", []);
const lab = new PolicyTestLab({ rootDir: root });
const report = lab.runPackScenarios({ packIds });
console.log("RuleOak policy pack scenario tests");
console.log("==================================");
console.log(`Packs: ${report.summary.packs}, scenarios=${report.summary.scenarios}, passed=${report.summary.passed}, failed=${report.summary.failed}`);
for (const item of report.results) {
  console.log(`${item.packId}/${item.scenarioId}: ${item.valid ? "passed" : "failed"} (${item.summary.failedExpectations} failed expectations)`);
}
const path = writeJsonReport(root, "reports/policy-packs/scenario-tests.json", report);
console.log(`Report: ${path}`);
if (report.summary.failed > 0) process.exitCode = 1;
