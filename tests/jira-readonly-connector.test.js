import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JiraApiReadOnlyConnector, collectJiraEvidence, AsyncEvidenceConnectorRunner } from "../src/connectors/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, "tmp", "jira-readonly");
mkdirSync(tmp, { recursive: true });

const fixture = {
  issues: [
    { id: "1", key: "PLAT-1", fields: { summary: "One", status: { name: "To Do" }, issuetype: { name: "Task" }, priority: { name: "High" }, updated: "2026-06-18T00:00:00.000+0000", created: "2026-06-17T00:00:00.000+0000" } },
    { id: "2", key: "PLAT-2", fields: { summary: "Two", status: { name: "Done" }, issuetype: { name: "Bug" }, priority: { name: "Low" }, updated: "2026-06-18T01:00:00.000+0000", created: "2026-06-17T01:00:00.000+0000" } }
  ]
};

const calls = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, options });
  assert.equal(options.method, "GET");
  return { ok: true, status: 200, statusText: "OK", async json() { return fixture; } };
};

const connector = new JiraApiReadOnlyConnector({ baseUrl: "https://example.atlassian.net", jql: "project = PLAT ORDER BY updated DESC", maxResults: 2, fetchImpl });
const evidence = await connector.collectEvidence();
assert.equal(evidence.length, 3);
assert.equal(evidence[0].subject, "jira_search");
assert.equal(evidence[1].subject, "jira_issues");
assert.equal(evidence[1].metadata.writes, false);
assert.equal(evidence[1].value.issues.length, 2);
assert.ok(calls[0].url.includes("/rest/api/3/search/jql"));
assert.ok(calls[0].url.includes("jql=project"));

const evidenceViaHelper = await collectJiraEvidence({ baseUrl: "https://example.atlassian.net", jql: "project = PLAT", fetchImpl });
assert.equal(evidenceViaHelper.length, 3);

const runner = new AsyncEvidenceConnectorRunner({ connectors: [connector] });
await runner.collect();
const report = runner.report({ title: "Jira test" });
assert.equal(report.summary.evidenceCount, 3);
assert.equal(report.connectorBoundary.writes, "not supported by evidence connectors");

const reportPath = join(tmp, "jira-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
assert.ok(readFileSync(reportPath, "utf8").includes("jira_issues"));
console.log("jira-readonly-connector tests passed");
