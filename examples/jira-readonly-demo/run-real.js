import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JiraApiReadOnlyConnector, AsyncEvidenceConnectorRunner } from "../../src/connectors/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out", "jira-readonly-live-report.json");

if (!process.env.RULEOAK_JIRA_BASE_URL) throw new Error("Set RULEOAK_JIRA_BASE_URL, for example https://example.atlassian.net");
if (!process.env.RULEOAK_JIRA_JQL && !process.env.RULEOAK_JIRA_PROJECT) throw new Error("Set RULEOAK_JIRA_JQL or RULEOAK_JIRA_PROJECT");

const connector = new JiraApiReadOnlyConnector();
const runner = new AsyncEvidenceConnectorRunner({ connectors: [connector], actor: "jira-readonly-live" });
await runner.collect();
const report = runner.report({ title: "RuleOak Jira Read-only Live Evidence Report", summary: "Jira issue metadata was collected through configured read-only GET requests." });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
console.log("RuleOak Jira live read-only connector");
console.log("====================================");
console.log(`Evidence records: ${report.evidence.length}`);
console.log(`Report: ${out}`);
