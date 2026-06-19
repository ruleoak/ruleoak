import assert from "node:assert/strict";
import {
  ServiceNowApiReadOnlyConnector,
  ConfluenceApiReadOnlyConnector,
  GitLabApiReadOnlyConnector,
  PrometheusApiReadOnlyConnector,
  GrafanaApiReadOnlyConnector,
  collectRealEnterpriseEvidence,
  REAL_EVIDENCE_CONNECTOR_V1_MANIFEST
} from "../src/connectors/index.js";
import { enforceReadOnlyRequest } from "../src/connectors/reliability.js";

const requests = [];
function response(data) {
  return Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, json: async () => data });
}
function mockFetch(url, options = {}) {
  requests.push({ url: String(url), method: options.method, headers: options.headers || {} });
  assert.equal(options.method, "GET");
  const value = String(url);
  if (value.includes("change_request")) return response({ result: [{ number: "CHG100", state: "Scheduled", risk: "High", approval: "approved" }] });
  if (value.includes("incident")) return response({ result: [{ number: "INC100", state: "In Progress", priority: "2" }] });
  if (value.includes("content/search")) return response({ results: [{ id: "1", title: "Runbook", space: { key: "OPS" }, version: { number: 4 }, metadata: { labels: { results: [{ name: "reviewed" }] } } }] });
  if (value.includes("/api/v4/projects/") && !value.includes("merge_requests") && !value.includes("pipelines")) return response({ path_with_namespace: "ruleoak/demo", default_branch: "main", visibility: "private" });
  if (value.includes("merge_requests")) return response([{ iid: 1, title: "MR", state: "opened" }]);
  if (value.includes("pipelines")) return response([{ id: 2, status: "success", ref: "main", sha: "abc" }]);
  if (value.includes("/api/v1/targets")) return response({ data: { activeTargets: [{ labels: { job: "api" }, health: "up" }] } });
  if (value.includes("/api/v1/alerts")) return response({ data: { alerts: [{ state: "firing", labels: { alertname: "Latency" } }] } });
  if (value.includes("/api/v1/query")) return response({ data: { resultType: "vector", result: [{ metric: { job: "api" }, value: [1, "1"] }] } });
  if (value.includes("/api/search")) return response([{ uid: "d1", title: "Dashboard", folderTitle: "Ops" }]);
  if (value.includes("alert-rules")) return response([{ uid: "a1", title: "Alert", condition: "A" }]);
  throw new Error(`unmatched url ${value}`);
}

const connectors = [
  new ServiceNowApiReadOnlyConnector({ baseUrl: "https://snow.example", token: "secret-token", fetchImpl: mockFetch }),
  new ConfluenceApiReadOnlyConnector({ baseUrl: "https://wiki.example", email: "dev@example.com", token: "secret-token", fetchImpl: mockFetch }),
  new GitLabApiReadOnlyConnector({ baseUrl: "https://gitlab.example", projectId: "group/project", token: "secret-token", fetchImpl: mockFetch }),
  new PrometheusApiReadOnlyConnector({ baseUrl: "https://prometheus.example", fetchImpl: mockFetch }),
  new GrafanaApiReadOnlyConnector({ baseUrl: "https://grafana.example", token: "secret-token", fetchImpl: mockFetch })
];

const evidence = await collectRealEnterpriseEvidence({ connectors });
assert.ok(evidence.length >= 10);
assert.equal(REAL_EVIDENCE_CONNECTOR_V1_MANIFEST.coreRelease, "v2.1.0");
assert.ok(REAL_EVIDENCE_CONNECTOR_V1_MANIFEST.connectors.includes("gitlab_api_readonly"));
assert.ok(evidence.every((item) => item.metadata.readOnly === true));
assert.ok(evidence.every((item) => item.metadata.writes === false || item.metadata.diagnostic === true));
assert.ok(requests.every((request) => request.method === "GET"));
assert.throws(() => enforceReadOnlyRequest({ method: "POST" }), /not read-only/);
assert.ok(requests.some((request) => request.url.includes("/api/now/table/change_request")));
assert.ok(requests.some((request) => request.url.includes("/wiki/rest/api/content/search")));
assert.ok(requests.some((request) => request.url.includes("/api/v4/projects/")));
assert.ok(requests.some((request) => request.url.includes("/api/v1/targets")));
assert.ok(requests.some((request) => request.url.includes("/api/search")));
console.log("real evidence connectors tests passed");
