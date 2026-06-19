import { createConnectorEvidence } from "./connector-records.js";
import { connectorDiagnosticRecord, connectorReliabilityPolicy, fetchJsonReadOnly, redactSecret } from "./reliability.js";

function normalizeBaseUrl(baseUrl) {
  const value = String(baseUrl || process.env.RULEOAK_JIRA_BASE_URL || "").trim();
  if (!value) throw new Error("Jira base URL is required. Set RULEOAK_JIRA_BASE_URL, for example https://example.atlassian.net");
  return value.replace(/\/$/, "");
}

function safeHeaders({ email, token }) {
  const headers = { "accept": "application/json", "user-agent": "ruleoak-core-jira-readonly-connector" };
  if (email && token) headers.authorization = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  return headers;
}

function normalizeIssue(issue) {
  const fields = issue.fields || {};
  return {
    id: issue.id || null,
    key: issue.key,
    summary: fields.summary || "",
    status: fields.status?.name || null,
    issueType: fields.issuetype?.name || null,
    priority: fields.priority?.name || null,
    assignee: fields.assignee?.displayName || fields.assignee?.accountId || null,
    reporter: fields.reporter?.displayName || fields.reporter?.accountId || null,
    updated: fields.updated || null,
    created: fields.created || null
  };
}

export class JiraApiReadOnlyConnector {
  constructor({
    baseUrl = process.env.RULEOAK_JIRA_BASE_URL,
    email = process.env.RULEOAK_JIRA_EMAIL || null,
    token = process.env.RULEOAK_JIRA_API_TOKEN || process.env.JIRA_TOKEN || null,
    jql = process.env.RULEOAK_JIRA_JQL || "ORDER BY updated DESC",
    projectKey = process.env.RULEOAK_JIRA_PROJECT || null,
    maxResults = Number(process.env.RULEOAK_JIRA_MAX_RESULTS || 10),
    pageSize = Number(process.env.RULEOAK_JIRA_PAGE_SIZE || 50),
    maxPages = Number(process.env.RULEOAK_JIRA_MAX_PAGES || 5),
    timeoutMs = Number(process.env.RULEOAK_CONNECTOR_TIMEOUT_MS || 10000),
    maxAttempts = Number(process.env.RULEOAK_CONNECTOR_MAX_ATTEMPTS || 2),
    retryDelayMs = 100,
    apiPath = "/rest/api/3/search/jql",
    fetchImpl = globalThis.fetch,
    id = "jira_api_readonly"
  } = {}) {
    this.id = id;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.email = email;
    this.token = token;
    this.jql = projectKey && !process.env.RULEOAK_JIRA_JQL ? `project = ${projectKey} ORDER BY updated DESC` : jql;
    this.maxResults = Math.max(0, maxResults);
    this.pageSize = Math.max(1, Math.min(pageSize, this.maxResults || pageSize));
    this.maxPages = Math.max(1, maxPages);
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
    this.retryDelayMs = retryDelayMs;
    this.apiPath = apiPath;
    this.fetchImpl = fetchImpl;
    this.diagnostics = { requestCount: 0, pageCount: 0, recordCount: 0, errors: [] };
    if (typeof this.fetchImpl !== "function") throw new Error("JiraApiReadOnlyConnector requires fetch support or a fetchImpl");
  }

  buildSearchUrl({ startAt = 0, maxResults = this.pageSize, nextPageToken = null } = {}) {
    const url = new URL(`${this.baseUrl}${this.apiPath}`);
    url.searchParams.set("jql", this.jql);
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("fields", "summary,status,issuetype,priority,assignee,reporter,updated,created");
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);
    else url.searchParams.set("startAt", String(startAt));
    return url.toString();
  }

  async requestSearchPage({ startAt = 0, maxResults = this.pageSize, nextPageToken = null } = {}) {
    const url = this.buildSearchUrl({ startAt, maxResults, nextPageToken });
    this.diagnostics.requestCount += 1;
    try {
      const result = await fetchJsonReadOnly({
        fetchImpl: this.fetchImpl,
        url,
        method: "GET",
        headers: safeHeaders({ email: this.email, token: this.token }),
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs
      });
      return result.data;
    } catch (error) {
      this.diagnostics.errors.push({ message: redactSecret(error.message), status: error.status || null, url: redactSecret(url) });
      throw error;
    }
  }

  async requestSearch() {
    const issues = [];
    let startAt = 0;
    let nextPageToken = null;
    let total = null;
    for (let page = 1; page <= this.maxPages && issues.length < this.maxResults; page += 1) {
      const pageLimit = Math.min(this.pageSize, this.maxResults - issues.length);
      const data = await this.requestSearchPage({ startAt, maxResults: pageLimit, nextPageToken });
      this.diagnostics.pageCount += 1;
      const pageIssues = Array.isArray(data.issues) ? data.issues : [];
      issues.push(...pageIssues);
      total = typeof data.total === "number" ? data.total : total;
      nextPageToken = data.nextPageToken || null;
      if (data.isLast === true || pageIssues.length < pageLimit || (!nextPageToken && total != null && issues.length >= total)) break;
      startAt += pageIssues.length || pageLimit;
    }
    return { issues: issues.slice(0, this.maxResults), total, startAt: 0, maxResults: this.maxResults };
  }

  diagnosticRecord() {
    return connectorDiagnosticRecord({
      connector: this.id,
      requestCount: this.diagnostics.requestCount,
      pageCount: this.diagnostics.pageCount,
      recordCount: this.diagnostics.recordCount,
      errors: this.diagnostics.errors,
      timeoutMs: this.timeoutMs,
      maxAttempts: this.maxAttempts
    });
  }

  async collectEvidence() {
    const data = await this.requestSearch();
    const issues = Array.isArray(data.issues) ? data.issues : [];
    const normalized = issues.map(normalizeIssue);
    this.diagnostics.recordCount = normalized.length;
    const reliability = connectorReliabilityPolicy({ timeoutMs: this.timeoutMs, maxAttempts: this.maxAttempts, pageSize: this.pageSize, maxPages: this.maxPages, maxRecords: this.maxResults });
    return [
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "jira_search",
        claim: "Jira issues were collected through paginated read-only Jira Cloud REST API requests.",
        value: { jql: this.jql, sampled: normalized.length, maxResults: this.maxResults, total: data.total ?? null },
        metadata: { mode: "read_only", api: "jira", writes: false, endpoint: this.apiPath, reliability }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: `${this.baseUrl}${this.apiPath}`,
        subject: "jira_issues",
        claim: "Jira issue metadata was collected for evidence without creating, updating, transitioning, or commenting on issues.",
        value: { issues: normalized.slice(0, this.maxResults) },
        metadata: { mode: "read_only", api: "jira", writes: false, jql: this.jql, pagination: { pageSize: this.pageSize, maxPages: this.maxPages } }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: this.baseUrl,
        subject: "connector_diagnostics",
        claim: "Jira connector reliability diagnostics were captured with credential redaction and read-only boundaries.",
        value: this.diagnosticRecord(),
        metadata: { mode: "read_only", api: "jira", writes: false, diagnostic: true }
      })
    ];
  }
}

export async function collectJiraEvidence(options = {}) {
  const connector = new JiraApiReadOnlyConnector(options);
  return connector.collectEvidence();
}
