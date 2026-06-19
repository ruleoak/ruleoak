#!/usr/bin/env node
import { PolicyTestLab } from "../src/policy-lab/index.js";
import { loadScenario, parseListArg, printDecisionTable, writeJsonReport } from "./policy-lab-utils.js";

const root = process.cwd();
const packs = parseListArg("packs", ["filesystem-safe", "external-communication", "ticketing-write-approval", "cloud-llm-approval", "pii-redaction"]);
const scenario = loadScenario(root);
const lab = new PolicyTestLab({ rootDir: root });
const report = lab.runScenario({ packIds: packs, scenario, title: "RuleOak Policy Test Lab Report" });
console.log("RuleOak policy test lab");
console.log("=========================");
console.log(`Packs: ${report.selectedPolicyPacks.join(", ")}`);
printDecisionTable(report.decisions);
console.log(`Summary: allowed=${report.summary.allowed}, approval_required=${report.summary.approvalRequired}, blocked=${report.summary.blocked}, failed_expectations=${report.summary.failedExpectations}`);
const path = writeJsonReport(root, "reports/policy-lab/policy-test-report.json", report);
console.log(`Report: ${path}`);
if (report.summary.failedExpectations > 0) process.exit(1);
