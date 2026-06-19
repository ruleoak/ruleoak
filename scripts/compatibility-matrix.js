#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function buildCompatibilityMatrix() {
  return {
    schema: "ruleoak.compatibility_matrix.v1",
    generatedAt: new Date().toISOString(),
    latestCore: "2.1.0",
    governanceProtocol: {
      name: "ruleoak.governance.v1",
      stability: "stable protocol v1 contract for RuleOak Core v2.x and future major releases",
      schemas: ["RunRecord", "EvidenceRecord", "ApprovalRecord", "AuditEvent", "PolicyDecisionRecord", "ReportRecord"],
      statusCommand: "npm run protocol:status",
      conformanceCommand: "npm run protocol:conformance",
      docsLintCommand: "npm run docs:protocol:lint",
      breakingChangePath: "ruleoak.governance.v2"
    },
    releases: [
      { version: "1.0.1", publicStatus: "released", focus: "Earlier public baseline for governed runtime, sandbox foundation, demos, and reports", compatibleProtocol: "pre-protocol baseline" },
      { version: "2.0.3", publicStatus: "released", focus: "Previous public Core release for local-first governance, Tool Guard, MCP-style paths, approval UX, policy packs, evidence, and reports", compatibleProtocol: "ruleoak.governance.v1 direction" },
      { version: "2.1", publicStatus: "released", focus: "Public developer release for protocol conformance, policy-pack maturity, adapter paths, approval UX v2, audit viewer v2, signed integrity, and launch hardening", compatibleProtocol: "stable ruleoak.governance.v1" }
    ],
    compatibilityRules: [
      "Governance Protocol v1 records must continue to validate against v1 schemas across RuleOak Core v2.x and future major releases unless protocol v2 is explicitly introduced.",
      "Read-only evidence connectors must not perform write actions or require write scopes.",
      "Approval-gated write connector demos must remain local dry-run/outbox only unless explicitly documented otherwise.",
      "Telemetry export remains local-only unless explicitly configured by a future release.",
      "Sandbox and Tool Guard decisions must stay outside prompts and remain policy-driven."
    ]
  };
}

const outputPath = "reports/compatibility/matrix.json";
mkdirSync(dirname(outputPath), { recursive: true });
const matrix = buildCompatibilityMatrix();
writeFileSync(outputPath, `${JSON.stringify(matrix, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, outputPath, latestCore: matrix.latestCore, protocol: matrix.governanceProtocol.name }, null, 2));
if (!existsSync(outputPath)) process.exit(1);
