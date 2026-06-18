import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GitHubReadOnlyConnector, JiraReadOnlyConnector, LocalFileEvidenceConnector, EvidenceConnectorRunner } from "../../src/connectors/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const github = GitHubReadOnlyConnector.fromFixture(join(fixtures, "github.json"));
const jira = JiraReadOnlyConnector.fromFixture(join(fixtures, "jira.json"));
const local = new LocalFileEvidenceConnector({ workspaceRoot: here });

const runner = new EvidenceConnectorRunner({ connectors: [github, jira], runId: "ruleoak-evidence-connectors-demo" });
const evidence = runner.collect();
evidence.push(local.readEvidence("fixtures/local-notes.md", { subject: "connector_notes", claim: "Local notes were collected as read-only evidence." }));
runner.evidence = evidence;
runner.auditLog.record("connector.evidence_recorded", { connector: "local_files", subject: "connector_notes" });
const report = runner.report({ summary: "Read-only local GitHub, Jira, and file evidence was collected for a governed workflow." });
mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(join(here, "out", "evidence-connectors-report.json"), JSON.stringify(report, null, 2));

console.log(`Connectors: ${report.summary.connectorCount}`);
console.log(`Evidence records: ${report.summary.evidenceCount}`);
console.log(`Mode: ${report.connectorBoundary.mode}`);
console.log(`Report: ${join(here, "out", "evidence-connectors-report.json")}`);
