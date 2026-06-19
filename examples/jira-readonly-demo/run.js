import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JiraApiReadOnlyConnector, AsyncEvidenceConnectorRunner } from "../../src/connectors/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out", "jira-readonly-report.json");
const fixturePath = join(here, "jira-search-fixture.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

const mockFetch = async (url, options = {}) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  async json() { return fixture; },
  url,
  options
});

const connector = new JiraApiReadOnlyConnector({
  baseUrl: "https://example.atlassian.net",
  jql: "project = PLAT ORDER BY updated DESC",
  maxResults: 3,
  fetchImpl: mockFetch
});
const runner = new AsyncEvidenceConnectorRunner({ connectors: [connector], actor: "jira-readonly-demo" });
await runner.collect();
const report = runner.report({
  title: "RuleOak Jira Read-only Evidence Connector Report",
  summary: "Jira issue metadata was collected through a read-only connector and converted into RuleOak evidence records."
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
console.log("RuleOak Jira read-only connector demo");
console.log("======================================");
for (const ev of report.evidence) console.log(`  ✓ ${ev.subject}: ${ev.claim}`);
console.log(`Report: ${out}`);
