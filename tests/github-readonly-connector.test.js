import assert from "node:assert/strict";
import { GitHubApiReadOnlyConnector, AsyncEvidenceConnectorRunner } from "../src/connectors/index.js";

const requested = [];
function mockFetch(url, options) {
  requested.push({ url, options });
  assert.equal(options.method, "GET");
  const data = url.includes("/issues?") ? [
    { number: 1, title: "Issue A", labels: [{ name: "bug" }] },
    { number: 2, title: "PR disguised as issue", pull_request: {}, labels: [] }
  ] : url.includes("/pulls?") ? [
    { number: 5, title: "PR A", draft: false }
  ] : {
    full_name: "ruleoak/test",
    default_branch: "main",
    visibility: "public",
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 3
  };
  return Promise.resolve({ ok: true, status: 200, json: async () => data });
}

const connector = new GitHubApiReadOnlyConnector({ repo: "ruleoak/test", fetchImpl: mockFetch, token: "test-token" });
const evidence = await connector.collectEvidence();
assert.equal(evidence.length, 4);
assert.equal(evidence[0].subject, "repository");
assert.equal(evidence[0].metadata.writes, false);
assert.equal(evidence[1].value.sampled, 1);
assert.equal(evidence[2].value.sampled, 1);
assert.ok(requested.every((r) => r.url.includes("api.github.com")));
assert.ok(requested.every((r) => r.options.headers.authorization === "Bearer test-token"));
const runner = new AsyncEvidenceConnectorRunner({ connectors: [connector] });
await runner.collect();
const report = runner.report();
assert.equal(report.evidence.length, 4);
assert.equal(report.connectorBoundary.mode, "read_only");
console.log("github readonly connector tests passed");
