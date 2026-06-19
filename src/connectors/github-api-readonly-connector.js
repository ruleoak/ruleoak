import { createConnectorEvidence } from "./connector-records.js";
import { buildPagePlan, connectorDiagnosticRecord, connectorReliabilityPolicy, fetchJsonReadOnly, redactSecret } from "./reliability.js";

function safeHeaders(token) {
  const headers = { "accept": "application/vnd.github+json", "user-agent": "ruleoak-core-readonly-connector" };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function parseRepo(repo) {
  const [owner, name] = String(repo || "").split("/");
  if (!owner || !name) throw new Error("GitHub repository must use owner/name format");
  return { owner, name, fullName: `${owner}/${name}` };
}

function appendQuery(path, params = {}) {
  const url = new URL(path, "https://ruleoak.local");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

export class GitHubApiReadOnlyConnector {
  constructor({
    repo,
    token = process.env.GITHUB_TOKEN || null,
    apiBaseUrl = "https://api.github.com",
    fetchImpl = globalThis.fetch,
    id = "github_api_readonly",
    maxIssues = 10,
    maxPullRequests = 10,
    pageSize = 50,
    maxPages = 5,
    maxRecords = 100,
    timeoutMs = 10000,
    maxAttempts = 2,
    retryDelayMs = 100
  } = {}) {
    this.id = id;
    this.repo = parseRepo(repo || process.env.RULEOAK_GITHUB_REPO || "ruleoak/ruleoak-core");
    this.token = token;
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.maxIssues = maxIssues;
    this.maxPullRequests = maxPullRequests;
    this.pageSize = pageSize;
    this.maxPages = maxPages;
    this.maxRecords = maxRecords;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
    this.retryDelayMs = retryDelayMs;
    this.diagnostics = { requestCount: 0, pageCount: 0, recordCount: 0, errors: [], rateLimit: null };
    if (typeof this.fetchImpl !== "function") throw new Error("GitHubApiReadOnlyConnector requires fetch support or a fetchImpl");
  }

  async request(path) {
    const url = `${this.apiBaseUrl}${path}`;
    this.diagnostics.requestCount += 1;
    try {
      const result = await fetchJsonReadOnly({
        fetchImpl: this.fetchImpl,
        url,
        method: "GET",
        headers: safeHeaders(this.token),
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs
      });
      this.diagnostics.rateLimit = result.rateLimit;
      return result.data;
    } catch (error) {
      this.diagnostics.errors.push({ message: redactSecret(error.message), status: error.status || null, url: redactSecret(url) });
      throw error;
    }
  }

  async requestPages(path, { state = "open", limit = 10 } = {}) {
    const plan = buildPagePlan({ limit, pageSize: this.pageSize, maxPages: this.maxPages, maxRecords: this.maxRecords });
    const records = [];
    for (const page of plan) {
      const data = await this.request(appendQuery(path, { state, per_page: page.perPage, page: page.page }));
      this.diagnostics.pageCount += 1;
      const items = Array.isArray(data) ? data : [];
      records.push(...items);
      if (items.length < page.perPage || records.length >= limit) break;
    }
    return records.slice(0, limit);
  }

  diagnosticRecord() {
    return connectorDiagnosticRecord({
      connector: this.id,
      requestCount: this.diagnostics.requestCount,
      pageCount: this.diagnostics.pageCount,
      recordCount: this.diagnostics.recordCount,
      errors: this.diagnostics.errors,
      rateLimit: this.diagnostics.rateLimit,
      timeoutMs: this.timeoutMs,
      maxAttempts: this.maxAttempts
    });
  }

  async collectEvidence() {
    const encodedRepo = `/repos/${this.repo.owner}/${this.repo.name}`;
    const repo = await this.request(encodedRepo);
    const [issues, pulls] = await Promise.all([
      this.requestPages(`${encodedRepo}/issues`, { limit: this.maxIssues }),
      this.requestPages(`${encodedRepo}/pulls`, { limit: this.maxPullRequests })
    ]);
    const issueOnly = Array.isArray(issues) ? issues.filter((item) => !item.pull_request) : [];
    const pullRequests = Array.isArray(pulls) ? pulls : [];
    this.diagnostics.recordCount = 1 + issueOnly.length + pullRequests.length;
    const reliability = connectorReliabilityPolicy({ timeoutMs: this.timeoutMs, maxAttempts: this.maxAttempts, pageSize: this.pageSize, maxPages: this.maxPages, maxRecords: this.maxRecords });
    return [
      createConnectorEvidence({
        connector: this.id,
        source: repo.full_name || this.repo.fullName,
        subject: "repository",
        claim: "Repository metadata was collected from GitHub through a read-only API request.",
        value: { name: repo.full_name, defaultBranch: repo.default_branch, visibility: repo.visibility || (repo.private ? "private" : "public"), stars: repo.stargazers_count ?? null, forks: repo.forks_count ?? null, openIssues: repo.open_issues_count ?? null },
        metadata: { mode: "read_only", api: "github", writes: false, reliability }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: `${this.repo.fullName}/issues`,
        subject: "issues",
        claim: "Open issue metadata was collected from GitHub through paginated read-only API requests.",
        value: { sampled: issueOnly.length, titles: issueOnly.slice(0, 10).map((i) => ({ number: i.number, title: i.title, labels: (i.labels || []).map((l) => l.name || l) })) },
        metadata: { mode: "read_only", api: "github", writes: false, maxIssues: this.maxIssues, pagination: { pageSize: this.pageSize, maxPages: this.maxPages } }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: `${this.repo.fullName}/pulls`,
        subject: "pull_requests",
        claim: "Open pull request metadata was collected from GitHub through paginated read-only API requests.",
        value: { sampled: pullRequests.length, titles: pullRequests.slice(0, 10).map((p) => ({ number: p.number, title: p.title, draft: Boolean(p.draft) })) },
        metadata: { mode: "read_only", api: "github", writes: false, maxPullRequests: this.maxPullRequests, pagination: { pageSize: this.pageSize, maxPages: this.maxPages } }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: this.repo.fullName,
        subject: "connector_diagnostics",
        claim: "GitHub connector reliability diagnostics were captured with token redaction and read-only boundaries.",
        value: this.diagnosticRecord(),
        metadata: { mode: "read_only", api: "github", writes: false, diagnostic: true }
      })
    ];
  }
}

export async function collectGitHubEvidence(options = {}) {
  const connector = new GitHubApiReadOnlyConnector(options);
  return connector.collectEvidence();
}
