import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GitHubApiReadOnlyConnector, JiraApiReadOnlyConnector, AsyncEvidenceConnectorRunner } from "../../src/connectors/index.js";

const out = join(process.cwd(), "examples", "connector-reliability-demo", "out", "connector-reliability-report.json");
mkdirSync(dirname(out), { recursive: true });

const githubFetch = async (url, options) => {
  if (options.method !== "GET") throw new Error("fixture expected GET only");
  if (url.includes("/issues?")) return { ok: true, status: 200, headers: new Map([["x-ratelimit-remaining", "42"]]), json: async () => [{ number: 7, title: "Audit report should show connector diagnostics", labels: [{ name: "governance" }] }] };
  if (url.includes("/pulls?")) return { ok: true, status: 200, headers: new Map(), json: async () => [{ number: 8, title: "Improve connector paging", draft: false }] };
  return { ok: true, status: 200, headers: new Map(), json: async () => ({ full_name: "ruleoak/core", default_branch: "main", visibility: "public", stargazers_count: 12, forks_count: 3, open_issues_count: 4 }) };
};

const jiraFetch = async (url, options) => {
  if (options.method !== "GET") throw new Error("fixture expected GET only");
  const parsed = new URL(url);
  const startAt = Number(parsed.searchParams.get("startAt") || 0);
  const issue = startAt === 0
    ? { id: "1001", key: "GOV-1", fields: { summary: "Review approval-required tool calls", status: { name: "In Progress" }, issuetype: { name: "Task" }, priority: { name: "High" }, updated: "2026-06-18T00:00:00.000+0000" } }
    : { id: "1002", key: "GOV-2", fields: { summary: "Validate connector read-only boundary", status: { name: "To Do" }, issuetype: { name: "Task" }, priority: { name: "Medium" }, updated: "2026-06-18T01:00:00.000+0000" } };
  return { ok: true, status: 200, headers: new Map(), json: async () => ({ issues: [issue], total: 2 }) };
};

const runner = new AsyncEvidenceConnectorRunner({
  connectors: [
    new GitHubApiReadOnlyConnector({ repo: "ruleoak/core", fetchImpl: githubFetch, maxIssues: 1, maxPullRequests: 1, pageSize: 1, maxPages: 2, timeoutMs: 5000, maxAttempts: 2 }),
    new JiraApiReadOnlyConnector({ baseUrl: "https://example.atlassian.net", jql: "project = GOV ORDER BY updated DESC", fetchImpl: jiraFetch, maxResults: 2, pageSize: 1, maxPages: 2, timeoutMs: 5000, maxAttempts: 2 })
  ]
});
await runner.collect();
const report = runner.report({
  title: "Connector Reliability Demo",
  summary: "GitHub and Jira read-only connectors with pagination, timeout policy, token redaction, diagnostics, and local evidence records."
});
report.runtimeVersion = "2.10.0";
report.connectorReliability = {
  schema: "ruleoak.connector_reliability_report.v1",
  readOnlyOnly: true,
  pagination: true,
  timeoutPolicy: true,
  tokenRedaction: true,
  diagnostics: true
};
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, outputPath: out, evidenceCount: report.evidence.length, connectorReliability: report.connectorReliability }, null, 2));
