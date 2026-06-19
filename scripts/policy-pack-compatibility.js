#!/usr/bin/env node
import { PolicyTestLab } from "../src/policy-lab/index.js";
import { writeJsonReport } from "./policy-lab-utils.js";

const root = process.cwd();
const lab = new PolicyTestLab({ rootDir: root });
const report = lab.compatibilityMatrix();
console.log("RuleOak policy pack compatibility matrix");
console.log("========================================");
console.log(`Latest public Core: ${report.latestPublicCoreRelease}`);
for (const pack of report.packs) {
  console.log(`${pack.id}@${pack.version}: schema=${pack.schemaVersion}, protocol=${pack.governanceProtocol}, scenarios=${pack.scenarioTestCount}`);
}
const path = writeJsonReport(root, "reports/policy-packs/compatibility-matrix.json", report);
console.log(`Report: ${path}`);
