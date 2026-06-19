import { mkdirSync, writeFileSync } from "node:fs";
import { GitHubApiReadOnlyConnector, AsyncEvidenceConnectorRunner } from "../../src/connectors/index.js";

const repo = process.env.RULEOAK_GITHUB_REPO;
if (!repo) {
  console.error("Set RULEOAK_GITHUB_REPO=owner/repo before running the real GitHub read-only demo.");
  process.exit(2);
}
const connector = new GitHubApiReadOnlyConnector({ repo });
const runner = new AsyncEvidenceConnectorRunner({ connectors: [connector], actor: "github-readonly-real-demo" });
await runner.collect();
const report = runner.report({ title: "RuleOak Real GitHub Read-only Evidence Report" });
mkdirSync("examples/github-readonly-demo/out", { recursive: true });
writeFileSync("examples/github-readonly-demo/out/github-readonly-real-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ evidenceCount: report.evidence.length, report: "examples/github-readonly-demo/out/github-readonly-real-report.json" }, null, 2));
