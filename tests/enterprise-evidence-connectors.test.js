import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
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
} from "../src/connectors/index.js";

const fixtures = "examples/enterprise-evidence-connectors/fixtures";
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

const catalog = enterpriseConnectorCatalog();
assert.equal(catalog.protocol, "ruleoak.enterprise_evidence_connectors.v1");
assert.equal(catalog.latestPublicCoreRelease, "v2.1.0");
assert.ok(catalog.connectorCount >= 10, "catalog should include GitHub/Jira plus enterprise connectors");
assert.ok(catalog.recommendedOrder.includes("servicenow_readonly"));

const runner = new EvidenceConnectorRunner({ connectors, runId: "test-enterprise-connectors" });
const evidence = runner.collect();
assert.ok(evidence.length >= 18, `expected broad evidence coverage, got ${evidence.length}`);
assert.ok(evidence.every((record) => record.metadata.readOnly === true), "all enterprise evidence must be read-only");
assert.ok(evidence.every((record) => record.metadata.writes === "not_supported"), "evidence connectors must not support writes");
assert.ok(evidence.some((record) => record.connector === "servicenow_readonly" && record.subject === "change_requests"));
assert.ok(evidence.some((record) => record.connector === "splunk_readonly" && record.metadata.rawLogsStored === false));
assert.ok(evidence.some((record) => record.connector === "collaboration_readonly" && record.metadata.rawMessagesStored === false));

rmSync("examples/enterprise-evidence-connectors/out", { recursive: true, force: true });
const result = spawnSync("node", ["examples/enterprise-evidence-connectors/run.js"], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.ok(result.stdout.includes("Enterprise connector fixtures:"));
assert.ok(result.stdout.includes("Evidence records:"));
const reportPath = "examples/enterprise-evidence-connectors/out/enterprise-evidence-connectors-report.json";
assert.ok(existsSync(reportPath), "enterprise connector report should be generated");
const report = JSON.parse(readFileSync(reportPath, "utf8"));
assert.equal(report.enterpriseBoundary.mode, "read_only");
assert.equal(report.enterpriseBoundary.writes, "not supported by evidence connectors");
assert.ok(report.summary.evidenceCount >= 18);

const catalogResult = spawnSync("node", ["scripts/enterprise-connector-catalog.js", "--json"], { encoding: "utf8" });
assert.equal(catalogResult.status, 0, catalogResult.stderr || catalogResult.stdout);
const catalogJson = JSON.parse(catalogResult.stdout);
assert.equal(catalogJson.connectorCount, catalog.connectorCount);
console.log("enterprise evidence connector tests passed");
