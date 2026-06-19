import { mkdirSync, writeFileSync } from "node:fs";
import { GitHubApiReadOnlyConnector, AsyncEvidenceConnectorRunner } from "../../src/connectors/index.js";

function mockFetch(url) {
  const data = url.includes("/issues?") ? [
    { number: 7, title: "Clarify quickstart", labels: [{ name: "docs" }] },
    { number: 8, title: "Add MCP guard example", labels: [{ name: "examples" }] }
  ] : url.includes("/pulls?") ? [
    { number: 3, title: "Improve report viewer", draft: false }
  ] : {
    full_name: "ruleoak/demo-repo",
    default_branch: "main",
    visibility: "public",
    stargazers_count: 12,
    forks_count: 2,
    open_issues_count: 4
  };
  return Promise.resolve({ ok: true, status: 200, json: async () => data });
}

const connector = new GitHubApiReadOnlyConnector({ repo: "ruleoak/demo-repo", fetchImpl: mockFetch });
const runner = new AsyncEvidenceConnectorRunner({ connectors: [connector], actor: "github-readonly-demo" });
await runner.collect();
const report = runner.report({ title: "RuleOak GitHub Read-only Evidence Report" });
mkdirSync("examples/github-readonly-demo/out", { recursive: true });
writeFileSync("examples/github-readonly-demo/out/github-readonly-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ evidenceCount: report.evidence.length, report: "examples/github-readonly-demo/out/github-readonly-report.json", boundary: report.connectorBoundary }, null, 2));
