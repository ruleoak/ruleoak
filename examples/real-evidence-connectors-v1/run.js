import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  ServiceNowApiReadOnlyConnector,
  ConfluenceApiReadOnlyConnector,
  GitLabApiReadOnlyConnector,
  PrometheusApiReadOnlyConnector,
  GrafanaApiReadOnlyConnector,
  collectRealEnterpriseEvidence,
  REAL_EVIDENCE_CONNECTOR_V1_MANIFEST
} from "../../src/connectors/index.js";

function json(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? "OK" : "Error", headers: { get: () => null }, json: async () => data };
}

function mockFetch(url, options = {}) {
  if (options.method !== "GET") throw new Error(`unexpected non-read-only method: ${options.method}`);
  const value = String(url);
  if (value.includes("/api/now/table/change_request")) {
    return Promise.resolve(json({ result: [
      { number: "CHG001", state: "Scheduled", risk: "High", approval: "approved", short_description: "Change alert threshold", updated_on: "2026-06-19" },
      { number: "CHG002", state: "New", risk: "Low", approval: "requested", short_description: "Update dashboard", updated_on: "2026-06-18" }
    ] }));
  }
  if (value.includes("/api/now/table/incident")) {
    return Promise.resolve(json({ result: [
      { number: "INC001", state: "Resolved", priority: "3", short_description: "Transient alert", updated_on: "2026-06-19" },
      { number: "INC002", state: "In Progress", priority: "2", short_description: "Latency increase", updated_on: "2026-06-19" }
    ] }));
  }
  if (value.includes("/wiki/rest/api/content/search")) {
    return Promise.resolve(json({ results: [
      { id: "100", title: "Production change runbook", space: { key: "OPS" }, version: { number: 7 }, metadata: { labels: { results: [{ name: "runbook" }, { name: "reviewed" }] } } },
      { id: "101", title: "Rollback procedure", space: { key: "OPS" }, version: { number: 3 }, metadata: { labels: { results: [{ name: "rollback" }] } } }
    ] }));
  }
  if (value.includes("/api/v4/projects/") && !value.includes("merge_requests") && !value.includes("pipelines")) {
    return Promise.resolve(json({ path_with_namespace: "ruleoak/demo", default_branch: "main", visibility: "private", open_issues_count: 4 }));
  }
  if (value.includes("/merge_requests")) {
    return Promise.resolve(json([{ iid: 11, title: "Govern write tool", state: "opened", draft: false }]));
  }
  if (value.includes("/pipelines")) {
    return Promise.resolve(json([{ id: 900, status: "success", ref: "main", sha: "abc123" }]));
  }
  if (value.includes("/api/v1/targets")) {
    return Promise.resolve(json({ status: "success", data: { activeTargets: [
      { labels: { job: "api" }, health: "up" },
      { labels: { job: "worker" }, health: "down" }
    ] } }));
  }
  if (value.includes("/api/v1/alerts")) {
    return Promise.resolve(json({ status: "success", data: { alerts: [
      { state: "firing", labels: { alertname: "HighLatency" } },
      { state: "pending", labels: { alertname: "ElevatedErrors" } }
    ] } }));
  }
  if (value.includes("/api/v1/query")) {
    return Promise.resolve(json({ status: "success", data: { resultType: "vector", result: [
      { metric: { job: "api" }, value: [1780000000, "1"] }
    ] } }));
  }
  if (value.includes("/api/search")) {
    return Promise.resolve(json([{ uid: "dash1", title: "Service Health", folderTitle: "Operations" }]));
  }
  if (value.includes("/api/v1/provisioning/alert-rules")) {
    return Promise.resolve(json([{ uid: "rule1", title: "Latency alert", condition: "A" }]));
  }
  return Promise.resolve(json({ error: "unmatched mock url", url: value }, 404));
}

const connectors = [
  new ServiceNowApiReadOnlyConnector({ baseUrl: "https://servicenow.example", token: "demo-token", fetchImpl: mockFetch }),
  new ConfluenceApiReadOnlyConnector({ baseUrl: "https://example.atlassian.net", email: "dev@example.com", token: "demo-token", fetchImpl: mockFetch }),
  new GitLabApiReadOnlyConnector({ baseUrl: "https://gitlab.example", projectId: "ruleoak/demo", token: "demo-token", fetchImpl: mockFetch }),
  new PrometheusApiReadOnlyConnector({ baseUrl: "https://prometheus.example", query: "up", fetchImpl: mockFetch }),
  new GrafanaApiReadOnlyConnector({ baseUrl: "https://grafana.example", token: "demo-token", fetchImpl: mockFetch })
];

const evidence = await collectRealEnterpriseEvidence({ connectors });
const report = {
  schema: "ruleoak.real_evidence_connectors_v1.report",
  coreRelease: "v2.1.0",
  manifest: REAL_EVIDENCE_CONNECTOR_V1_MANIFEST,
  connectorCount: connectors.length,
  evidenceCount: evidence.length,
  subjects: evidence.map((item) => item.subject),
  evidence
};

const outDir = join(process.cwd(), "examples/real-evidence-connectors-v1/out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "real-evidence-connectors-report.json"), JSON.stringify(report, null, 2));
console.log(`real evidence connectors v1 completed: ${report.evidenceCount} evidence records from ${report.connectorCount} connectors`);
