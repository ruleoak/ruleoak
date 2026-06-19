import assert from "node:assert/strict";
import { GitHubApiReadOnlyConnector, JiraApiReadOnlyConnector, buildPagePlan, enforceReadOnlyRequest, redactSecret } from "../src/connectors/index.js";

assert.deepEqual(buildPagePlan({ limit: 5, pageSize: 2, maxPages: 3, maxRecords: 10 }).map((p) => p.page), [1, 2, 3]);
assert.equal(enforceReadOnlyRequest({ method: "GET" }), "GET");
assert.throws(() => enforceReadOnlyRequest({ method: "POST" }), /not read-only/);
assert.equal(redactSecret("Authorization: Bearer ghp_secret123"), "Authorization: Bearer [REDACTED]");

const githubCalls = [];
function githubFetch(url, options) {
  githubCalls.push({ url, options });
  assert.equal(options.method, "GET");
  if (url.includes("/issues?")) {
    const parsed = new URL(url);
    const page = Number(parsed.searchParams.get("page"));
    const data = page === 1
      ? [{ number: 1, title: "Issue 1", labels: [] }, { number: 2, title: "Issue 2", labels: [] }]
      : [{ number: 3, title: "Issue 3", labels: [] }];
    return Promise.resolve({ ok: true, status: 200, headers: new Map([["x-ratelimit-remaining", "1"]]), json: async () => data });
  }
  if (url.includes("/pulls?")) return Promise.resolve({ ok: true, status: 200, headers: new Map(), json: async () => [] });
  return Promise.resolve({ ok: true, status: 200, headers: new Map(), json: async () => ({ full_name: "ruleoak/test", default_branch: "main", visibility: "public" }) });
}
const github = new GitHubApiReadOnlyConnector({ repo: "ruleoak/test", fetchImpl: githubFetch, maxIssues: 3, pageSize: 2, maxPages: 3, token: "ghp_secret123" });
const githubEvidence = await github.collectEvidence();
assert.equal(githubEvidence[1].value.sampled, 3);
assert.equal(githubEvidence[3].subject, "connector_diagnostics");
assert.equal(githubEvidence[3].value.requestCount, 4);
assert.ok(githubCalls.every((call) => call.options.method === "GET"));

const jiraCalls = [];
function jiraFetch(url, options) {
  jiraCalls.push({ url, options });
  assert.equal(options.method, "GET");
  const parsed = new URL(url);
  const startAt = Number(parsed.searchParams.get("startAt") || 0);
  const issues = startAt === 0
    ? [{ id: "1", key: "PLAT-1", fields: { summary: "One", status: { name: "Open" } } }]
    : [{ id: "2", key: "PLAT-2", fields: { summary: "Two", status: { name: "Done" } } }];
  return Promise.resolve({ ok: true, status: 200, headers: new Map(), json: async () => ({ issues, total: 2 }) });
}
const jira = new JiraApiReadOnlyConnector({ baseUrl: "https://example.atlassian.net", email: "user@example.com", token: "jira-secret-token", fetchImpl: jiraFetch, maxResults: 2, pageSize: 1, maxPages: 3 });
const jiraEvidence = await jira.collectEvidence();
assert.equal(jiraEvidence.length, 3);
assert.equal(jiraEvidence[1].value.issues.length, 2);
assert.equal(jiraEvidence[2].subject, "connector_diagnostics");
assert.ok(jiraCalls.every((call) => call.options.method === "GET"));
assert.ok(!JSON.stringify(jiraEvidence).includes("jira-secret-token"));

let failed = false;
try {
  const bad = new GitHubApiReadOnlyConnector({ repo: "ruleoak/test", token: "ghp_secret123", fetchImpl: async () => ({ ok: false, status: 401, statusText: "bad token ghp_secret123", headers: new Map(), json: async () => ({}) }) });
  await bad.collectEvidence();
} catch (error) {
  failed = true;
  assert.ok(!String(error.message).includes("ghp_secret123"));
}
assert.equal(failed, true);

console.log("connector reliability tests passed");
