#!/usr/bin/env node
import { PolicyTestLab } from "../src/policy-lab/index.js";
import { parseListArg, writeJsonReport } from "./policy-lab-utils.js";

const root = process.cwd();
const packs = parseListArg("packs", ["filesystem-safe", "external-communication", "ticketing-write-approval", "cloud-llm-approval", "pii-redaction"]);
const lab = new PolicyTestLab({ rootDir: root });
const report = lab.explain(packs);
console.log("RuleOak policy explain");
console.log("======================");
console.log(`Packs: ${report.selectedPolicyPacks.join(", ")}`);
for (const row of report.tools) console.log(`${row.toolId}: ${row.decision} — ${row.reason}`);
const path = writeJsonReport(root, "reports/policy-lab/policy-explain.json", report);
console.log(`Report: ${path}`);
