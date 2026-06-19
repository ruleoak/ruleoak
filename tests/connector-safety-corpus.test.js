import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GitHubApiReadOnlyConnector, JiraApiReadOnlyConnector } from "../src/connectors/index.js";

const corpus = JSON.parse(readFileSync("tests/fixtures/connectors/connector-safety-corpus.json", "utf8"));
for (const item of corpus) assert.equal(item.writes, false, `${item.connector} should be read-only`);

const githubCalls = [];
const githubFetch = async (url, options) => {
  githubCalls.push({ url, method: options.method });
  assert.equal(options.method, "GET");
  if (url.includes("/issues")) return { ok: true, async json() { return [{ number: 1, title: "Issue", labels: [] }]; } };
  if (url.includes("/pulls")) return { ok: true, async json() { return [{ number: 2, title: "PR", draft: false }]; } };
  return { ok: true, async json() { return { full_name: "ruleoak/core", default_branch: "main", private: false, stargazers_count: 0, forks_count: 0, open_issues_count: 1 }; } };
};
const githubEvidence = await new GitHubApiReadOnlyConnector({ repo: "ruleoak/core", fetchImpl: githubFetch }).collectEvidence();
assert.ok(githubEvidence.every((record) => record.metadata.writes === false));
assert.ok(githubCalls.every((call) => call.method === "GET"));

const jiraCalls = [];
const jiraFetch = async (url, options) => {
  jiraCalls.push({ url, method: options.method });
  assert.equal(options.method, "GET");
  return { ok: true, status: 200, async json() { return { issues: [{ id: "1", key: "ROAK-1", fields: { summary: "One", status: { name: "Open" }, issuetype: { name: "Task" } } }] }; } };
};
const jiraEvidence = await new JiraApiReadOnlyConnector({ baseUrl: "https://example.atlassian.net", jql: "project = ROAK", fetchImpl: jiraFetch }).collectEvidence();
assert.ok(jiraEvidence.every((record) => record.metadata.writes === false));
assert.ok(jiraCalls.every((call) => call.method === "GET"));
console.log("connector-safety-corpus tests passed");
