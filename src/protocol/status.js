import { recordRequirements } from "./schema-validator.js";
import { GOVERNANCE_SCHEMA_VERSION } from "./record-factory.js";

export const GOVERNANCE_PROTOCOL_STATUS = Object.freeze({
  name: "RuleOak Governance Protocol",
  schemaVersion: GOVERNANCE_SCHEMA_VERSION,
  status: "stable",
  compatibleCoreLine: "v2.x and future major releases",
  stabilityContract: "docs/protocol/stability-contract.md",
  conformanceCommand: "npm run protocol:conformance",
  pythonConformanceCommand: "npm run protocol:python",
  breakingChangePath: "protocol v2",
  schemaBacked: true,
  goldenRecords: true,
  crossLanguageFixtures: true,
  recordTypes: Object.keys(recordRequirements),
  compatibilityRules: [
    "Required fields in protocol v1 records will not be removed within the v1 line.",
    "Existing enum meanings will not be changed within the v1 line.",
    "New optional fields may be added when backward compatible.",
    "Deprecated fields remain readable for a documented transition period.",
    "Breaking changes require a new protocol line, such as ruleoak.governance.v2."
  ],
  boundary: "A stable engineering record contract for RuleOak Core v2.1 and compatible v2.x/future major releases. It is not a legal compliance standard and does not certify any workflow."
});

export function getGovernanceProtocolStatus() {
  return { ...GOVERNANCE_PROTOCOL_STATUS, recordTypes: [...GOVERNANCE_PROTOCOL_STATUS.recordTypes], compatibilityRules: [...GOVERNANCE_PROTOCOL_STATUS.compatibilityRules] };
}
