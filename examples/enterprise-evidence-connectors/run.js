import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EvidenceConnectorRunner,
  ServiceNowReadOnlyConnector,
  ConfluenceReadOnlyConnector,
  GitLabReadOnlyConnector,
  SplunkReadOnlyConnector,
  PrometheusReadOnlyConnector,
  KubernetesReadOnlyConnector,
  CiCdReadOnlyConnector,
  CollaborationReadOnlyConnector,
  enterpriseConnectorCatalog
} from "../../src/connectors/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");

const connectors = [
  ServiceNowReadOnlyConnector.fromFixture(join(fixtures, "servicenow.json")),
  ConfluenceReadOnlyConnector.fromFixture(join(fixtures, "confluence.json")),
  GitLabReadOnlyConnector.fromFixture(join(fixtures, "gitlab.json")),
  SplunkReadOnlyConnector.fromFixture(join(fixtures, "splunk.json")),
  PrometheusReadOnlyConnector.fromFixture(join(fixtures, "prometheus.json")),
  KubernetesReadOnlyConnector.fromFixture(join(fixtures, "kubernetes.json")),
  CiCdReadOnlyConnector.fromFixture(join(fixtures, "cicd.json")),
  CollaborationReadOnlyConnector.fromFixture(join(fixtures, "collaboration.json"))
];

const runner = new EvidenceConnectorRunner({ connectors, runId: "ruleoak-enterprise-evidence-connectors" });
const evidence = runner.collect();
const report = {
  ...runner.report({
    title: "RuleOak Enterprise Evidence Connectors Report",
    summary: "Read-only enterprise evidence was collected from local fixtures for serious governed workflows."
  }),
  connectorCatalog: enterpriseConnectorCatalog(),
  enterpriseBoundary: {
    mode: "read_only",
    credentials: "not stored in evidence records",
    writes: "not supported by evidence connectors",
    rawLogs: "summarized only",
    rawChatTranscripts: "summarized only"
  }
};

const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "enterprise-evidence-connectors-report.json"), JSON.stringify(report, null, 2));

console.log(`Enterprise connector fixtures: ${connectors.length}`);
console.log(`Evidence records: ${evidence.length}`);
console.log(`Mode: ${report.enterpriseBoundary.mode}`);
console.log(`Report: ${join(outDir, "enterprise-evidence-connectors-report.json")}`);
