import { createConnectorEvidence } from "./connector-records.js";
import { connectorDiagnosticRecord, connectorReliabilityPolicy, fetchJsonReadOnly, redactSecret } from "./reliability.js";

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

function requireBaseUrl(value, name) {
  const baseUrl = stripTrailingSlash(value);
  if (!baseUrl) throw new Error(`${name} base URL is required`);
  return baseUrl;
}

function basicAuth(username, password) {
  if (!username || !password) return null;
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function bearer(token) {
  return token ? `Bearer ${token}` : null;
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value || "")).replace(/%2F/g, "%2F");
}

function appendQuery(baseUrl, path, params = {}) {
  const url = new URL(path, `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function limitArray(value, limit) {
  const array = Array.isArray(value) ? value : [];
  return array.slice(0, Math.max(0, Number(limit || 0)));
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

class RealReadOnlyConnectorBase {
  constructor({ id, baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 10000, maxAttempts = 2, retryDelayMs = 100, pageSize = 25, maxRecords = 50 } = {}) {
    this.id = id;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
    this.retryDelayMs = retryDelayMs;
    this.pageSize = pageSize;
    this.maxRecords = maxRecords;
    this.diagnostics = { requestCount: 0, pageCount: 0, recordCount: 0, errors: [], rateLimit: null };
    if (typeof this.fetchImpl !== "function") throw new Error(`${id} requires fetch support or a fetchImpl`);
  }

  async get(url, headers = {}) {
    this.diagnostics.requestCount += 1;
    try {
      const result = await fetchJsonReadOnly({
        fetchImpl: this.fetchImpl,
        url,
        method: "GET",
        headers,
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs
      });
      this.diagnostics.rateLimit = result.rateLimit || null;
      return result.data;
    } catch (error) {
      this.diagnostics.errors.push({ message: redactSecret(error?.message || String(error)), status: error.status || null, url: redactSecret(url) });
      throw error;
    }
  }

  reliability() {
    return connectorReliabilityPolicy({ timeoutMs: this.timeoutMs, maxAttempts: this.maxAttempts, pageSize: this.pageSize, maxPages: 1, maxRecords: this.maxRecords });
  }

  diagnosticEvidence(source) {
    return createConnectorEvidence({
      connector: this.id,
      source,
      subject: "connector_diagnostics",
      claim: "Real read-only connector diagnostics were captured with credential redaction and no write methods.",
      value: connectorDiagnosticRecord({
        connector: this.id,
        requestCount: this.diagnostics.requestCount,
        pageCount: this.diagnostics.pageCount,
        recordCount: this.diagnostics.recordCount,
        errors: this.diagnostics.errors,
        rateLimit: this.diagnostics.rateLimit,
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts
      }),
      metadata: { mode: "read_only", realApi: true, writes: false, diagnostic: true }
    });
  }
}

export class ServiceNowApiReadOnlyConnector extends RealReadOnlyConnectorBase {
  constructor({
    baseUrl = process.env.RULEOAK_SERVICENOW_BASE_URL,
    username = process.env.RULEOAK_SERVICENOW_USERNAME || null,
    password = process.env.RULEOAK_SERVICENOW_PASSWORD || null,
    token = process.env.RULEOAK_SERVICENOW_TOKEN || null,
    maxRecords = Number(process.env.RULEOAK_SERVICENOW_MAX_RECORDS || 10),
    fetchImpl,
    id = "servicenow_api_readonly",
    ...rest
  } = {}) {
    super({ id, baseUrl: requireBaseUrl(baseUrl, "ServiceNow"), fetchImpl, maxRecords, ...rest });
    this.username = username;
    this.password = password;
    this.token = token;
  }

  headers() {
    const headers = { accept: "application/json", "user-agent": "ruleoak-core-servicenow-readonly-connector" };
    const auth = bearer(this.token) || basicAuth(this.username, this.password);
    if (auth) headers.authorization = auth;
    return headers;
  }

  async table(table, fields) {
    const url = appendQuery(this.baseUrl, `/api/now/table/${table}`, {
      sysparm_limit: this.maxRecords,
      sysparm_fields: fields,
      sysparm_display_value: "true"
    });
    this.diagnostics.pageCount += 1;
    const data = await this.get(url, this.headers());
    return limitArray(data.result, this.maxRecords);
  }

  async collectEvidence() {
    const changes = await this.table("change_request", "number,state,risk,approval,short_description,updated_on");
    const incidents = await this.table("incident", "number,state,priority,short_description,updated_on");
    this.diagnostics.recordCount = changes.length + incidents.length;
    return [
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "servicenow_change_requests",
        claim: "ServiceNow change-request metadata was collected through read-only Table API requests.",
        value: {
          sampled: changes.length,
          byState: countBy(changes, (c) => c.state),
          highRisk: changes.filter((c) => ["High", "Critical", "1", "2"].includes(String(c.risk || ""))).map((c) => c.number),
          approved: changes.filter((c) => String(c.approval || "").toLowerCase().includes("approved")).map((c) => c.number)
        },
        metadata: { mode: "read_only", api: "servicenow", realApi: true, writes: false, reliability: this.reliability() }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "servicenow_incidents",
        claim: "ServiceNow incident metadata was collected as operational evidence without updating tickets.",
        value: { sampled: incidents.length, byPriority: countBy(incidents, (i) => i.priority), open: incidents.filter((i) => !["Closed", "Resolved", "7", "6"].includes(String(i.state || ""))).map((i) => i.number) },
        metadata: { mode: "read_only", api: "servicenow", realApi: true, writes: false }
      }),
      this.diagnosticEvidence(this.baseUrl)
    ];
  }
}

export class ConfluenceApiReadOnlyConnector extends RealReadOnlyConnectorBase {
  constructor({
    baseUrl = process.env.RULEOAK_CONFLUENCE_BASE_URL,
    email = process.env.RULEOAK_CONFLUENCE_EMAIL || process.env.RULEOAK_ATLASSIAN_EMAIL || null,
    token = process.env.RULEOAK_CONFLUENCE_API_TOKEN || process.env.RULEOAK_ATLASSIAN_API_TOKEN || null,
    cql = process.env.RULEOAK_CONFLUENCE_CQL || "type=page order by lastmodified desc",
    maxRecords = Number(process.env.RULEOAK_CONFLUENCE_MAX_RECORDS || 10),
    fetchImpl,
    id = "confluence_api_readonly",
    ...rest
  } = {}) {
    super({ id, baseUrl: requireBaseUrl(baseUrl, "Confluence"), fetchImpl, maxRecords, ...rest });
    this.email = email;
    this.token = token;
    this.cql = cql;
  }

  headers() {
    const headers = { accept: "application/json", "user-agent": "ruleoak-core-confluence-readonly-connector" };
    const auth = basicAuth(this.email, this.token);
    if (auth) headers.authorization = auth;
    return headers;
  }

  async collectEvidence() {
    const url = appendQuery(this.baseUrl, "/wiki/rest/api/content/search", { cql: this.cql, limit: this.maxRecords, expand: "space,version,metadata.labels" });
    this.diagnostics.pageCount += 1;
    const data = await this.get(url, this.headers());
    const pages = limitArray(data.results, this.maxRecords);
    this.diagnostics.recordCount = pages.length;
    return [
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "confluence_pages",
        claim: "Confluence page metadata was collected through read-only REST API requests.",
        value: {
          cql: this.cql,
          sampled: pages.length,
          pages: pages.map((p) => ({ id: p.id, title: p.title, space: p.space?.key || null, version: p.version?.number || null, labels: (p.metadata?.labels?.results || []).map((l) => l.name).filter(Boolean) }))
        },
        metadata: { mode: "read_only", api: "confluence", realApi: true, writes: false, rawBodyStored: false, reliability: this.reliability() }
      }),
      this.diagnosticEvidence(this.baseUrl)
    ];
  }
}

export class GitLabApiReadOnlyConnector extends RealReadOnlyConnectorBase {
  constructor({
    baseUrl = process.env.RULEOAK_GITLAB_BASE_URL || "https://gitlab.com",
    projectId = process.env.RULEOAK_GITLAB_PROJECT_ID || process.env.RULEOAK_GITLAB_PROJECT,
    token = process.env.RULEOAK_GITLAB_TOKEN || null,
    maxRecords = Number(process.env.RULEOAK_GITLAB_MAX_RECORDS || 10),
    fetchImpl,
    id = "gitlab_api_readonly",
    ...rest
  } = {}) {
    if (!projectId) throw new Error("GitLab project id/path is required. Set RULEOAK_GITLAB_PROJECT_ID.");
    super({ id, baseUrl: stripTrailingSlash(baseUrl), fetchImpl, maxRecords, ...rest });
    this.projectId = projectId;
    this.token = token;
  }

  headers() {
    const headers = { accept: "application/json", "user-agent": "ruleoak-core-gitlab-readonly-connector" };
    if (this.token) headers["PRIVATE-TOKEN"] = this.token;
    return headers;
  }

  async requestProject(path, params = {}) {
    const url = appendQuery(this.baseUrl, `/api/v4/projects/${encodePathSegment(this.projectId)}${path}`, params);
    this.diagnostics.pageCount += 1;
    return this.get(url, this.headers());
  }

  async collectEvidence() {
    const [project, mergeRequests, pipelines] = await Promise.all([
      this.requestProject(""),
      this.requestProject("/merge_requests", { state: "opened", per_page: this.maxRecords }),
      this.requestProject("/pipelines", { per_page: this.maxRecords })
    ]);
    const mrs = limitArray(mergeRequests, this.maxRecords);
    const pipes = limitArray(pipelines, this.maxRecords);
    this.diagnostics.recordCount = 1 + mrs.length + pipes.length;
    const source = project.path_with_namespace || String(this.projectId);
    return [
      createConnectorEvidence({
        connector: this.id,
        source,
        subject: "gitlab_project",
        claim: "GitLab project metadata was collected through read-only API requests.",
        value: { path: project.path_with_namespace || null, defaultBranch: project.default_branch || null, visibility: project.visibility || null, openIssues: project.open_issues_count ?? null },
        metadata: { mode: "read_only", api: "gitlab", realApi: true, writes: false, reliability: this.reliability() }
      }),
      createConnectorEvidence({
        connector: this.id,
        source,
        subject: "gitlab_merge_requests_and_pipelines",
        claim: "GitLab merge-request and pipeline metadata was collected without mutating project state.",
        value: { mergeRequests: mrs.map((m) => ({ iid: m.iid, title: m.title, state: m.state, draft: Boolean(m.draft || m.work_in_progress) })), pipelines: pipes.map((p) => ({ id: p.id, status: p.status, ref: p.ref, sha: p.sha })) },
        metadata: { mode: "read_only", api: "gitlab", realApi: true, writes: false }
      }),
      this.diagnosticEvidence(source)
    ];
  }
}

export class PrometheusApiReadOnlyConnector extends RealReadOnlyConnectorBase {
  constructor({
    baseUrl = process.env.RULEOAK_PROMETHEUS_BASE_URL,
    query = process.env.RULEOAK_PROMETHEUS_QUERY || "up",
    maxRecords = Number(process.env.RULEOAK_PROMETHEUS_MAX_RECORDS || 20),
    fetchImpl,
    id = "prometheus_api_readonly",
    ...rest
  } = {}) {
    super({ id, baseUrl: requireBaseUrl(baseUrl, "Prometheus"), fetchImpl, maxRecords, ...rest });
    this.query = query;
  }

  headers() {
    return { accept: "application/json", "user-agent": "ruleoak-core-prometheus-readonly-connector" };
  }

  async api(path, params = {}) {
    this.diagnostics.pageCount += 1;
    return this.get(appendQuery(this.baseUrl, path, params), this.headers());
  }

  async collectEvidence() {
    const [targets, alerts, query] = await Promise.all([
      this.api("/api/v1/targets"),
      this.api("/api/v1/alerts"),
      this.api("/api/v1/query", { query: this.query })
    ]);
    const activeTargets = limitArray(targets.data?.activeTargets, this.maxRecords);
    const alertItems = limitArray(alerts.data?.alerts, this.maxRecords);
    const queryItems = limitArray(query.data?.result, this.maxRecords);
    this.diagnostics.recordCount = activeTargets.length + alertItems.length + queryItems.length;
    return [
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "prometheus_targets_and_alerts",
        claim: "Prometheus target and alert state was collected through read-only HTTP API requests.",
        value: { targetCount: activeTargets.length, unhealthyTargets: activeTargets.filter((t) => t.health !== "up").map((t) => t.labels?.job || t.scrapeUrl), alertCount: alertItems.length, firingAlerts: alertItems.filter((a) => a.state === "firing").map((a) => a.labels?.alertname || a.name) },
        metadata: { mode: "read_only", api: "prometheus", realApi: true, writes: false, reliability: this.reliability() }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "prometheus_query_result",
        claim: "A bounded Prometheus query result was collected as metric evidence.",
        value: { query: this.query, sampled: queryItems.length, resultType: query.data?.resultType || null, series: queryItems.map((r) => ({ metric: r.metric, value: r.value })) },
        metadata: { mode: "read_only", api: "prometheus", realApi: true, writes: false }
      }),
      this.diagnosticEvidence(this.baseUrl)
    ];
  }
}

export class GrafanaApiReadOnlyConnector extends RealReadOnlyConnectorBase {
  constructor({
    baseUrl = process.env.RULEOAK_GRAFANA_BASE_URL,
    token = process.env.RULEOAK_GRAFANA_TOKEN || null,
    maxRecords = Number(process.env.RULEOAK_GRAFANA_MAX_RECORDS || 20),
    fetchImpl,
    id = "grafana_api_readonly",
    ...rest
  } = {}) {
    super({ id, baseUrl: requireBaseUrl(baseUrl, "Grafana"), fetchImpl, maxRecords, ...rest });
    this.token = token;
  }

  headers() {
    const headers = { accept: "application/json", "user-agent": "ruleoak-core-grafana-readonly-connector" };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    return headers;
  }

  async collectEvidence() {
    const dashboardsUrl = appendQuery(this.baseUrl, "/api/search", { type: "dash-db", limit: this.maxRecords });
    const alertRulesUrl = appendQuery(this.baseUrl, "/api/v1/provisioning/alert-rules", { limit: this.maxRecords });
    this.diagnostics.pageCount += 2;
    const [dashboards, alertRules] = await Promise.all([this.get(dashboardsUrl, this.headers()), this.get(alertRulesUrl, this.headers())]);
    const dashboardItems = limitArray(dashboards, this.maxRecords);
    const ruleItems = limitArray(alertRules, this.maxRecords);
    this.diagnostics.recordCount = dashboardItems.length + ruleItems.length;
    return [
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "grafana_dashboards_and_alert_rules",
        claim: "Grafana dashboard and alert-rule metadata was collected through read-only HTTP API requests.",
        value: { dashboards: dashboardItems.map((d) => ({ uid: d.uid, title: d.title, folderTitle: d.folderTitle || null })), alertRules: ruleItems.map((r) => ({ uid: r.uid, title: r.title, condition: r.condition || null })) },
        metadata: { mode: "read_only", api: "grafana", realApi: true, writes: false, reliability: this.reliability() }
      }),
      this.diagnosticEvidence(this.baseUrl)
    ];
  }
}

export const REAL_EVIDENCE_CONNECTOR_V1_MANIFEST = Object.freeze({
  protocol: "ruleoak.real_evidence_connectors.v1",
  governanceProtocol: "ruleoak.governance.v1",
  coreRelease: "v2.1.0",
  boundary: {
    mode: "read_only",
    methods: ["GET", "HEAD"],
    writes: false,
    credentialsInReports: false,
    rawHighVolumeLogsStored: false
  },
  connectors: [
    "github_api_readonly",
    "jira_api_readonly",
    "servicenow_api_readonly",
    "confluence_api_readonly",
    "gitlab_api_readonly",
    "prometheus_api_readonly",
    "grafana_api_readonly"
  ]
});

export async function collectRealEnterpriseEvidence({ connectors = [] } = {}) {
  const evidence = [];
  for (const connector of connectors) {
    const result = await connector.collectEvidence();
    evidence.push(...result);
  }
  return evidence;
}
