export type GovernanceRecordType = "RunRecord" | "EvidenceRecord" | "ApprovalRecord" | "AuditEvent" | "PolicyDecisionRecord" | "ReportRecord";
export declare const GOVERNANCE_SCHEMA_VERSION: "ruleoak.governance.v1";
export declare const GOVERNANCE_RECORD_TYPES: readonly GovernanceRecordType[];
export declare function stableJson(value: unknown): string;
export declare function canonicalPayload(record: Record<string, unknown>, options?: { includeIntegrity?: boolean }): Record<string, unknown>;
export declare function canonicalJson(record: Record<string, unknown>, options?: { includeIntegrity?: boolean }): string;
export declare function canonicalTimestamp(value?: string | Date): string;
export declare function recordHash(record: Record<string, unknown>): string;
export declare function createProtocolEnvelope(record: Record<string, unknown>, args?: { sdk?: string; sdkVersion?: string | null; generatedAt?: string | Date }): Record<string, unknown>;
export declare function validateGovernanceRecord(record: Record<string, unknown>, expectedType?: GovernanceRecordType, options?: { strict?: boolean }): { valid: true; recordType: string; schemaVersion: string; strict: boolean };
export declare function validateMany(records: Array<Record<string, unknown>>, options?: { strict?: boolean }): Array<{ valid: true; recordType: string; schemaVersion: string; strict: boolean }>;
export declare function createRunRecord(args?: Record<string, unknown>): Record<string, unknown>;
export declare function createEvidenceRecord(args?: Record<string, unknown>): Record<string, unknown>;
export declare function createPolicyDecisionRecord(args?: Record<string, unknown>): Record<string, unknown>;
export declare function createApprovalRecord(args?: Record<string, unknown>): Record<string, unknown>;
export declare function createAuditEvent(args?: Record<string, unknown>): Record<string, unknown>;
export declare function createReportRecord(args?: Record<string, unknown>): Record<string, unknown>;
export declare function createEvidenceBundle(args?: Record<string, unknown>): Record<string, unknown>;
export declare function verifyEvidenceBundle(bundle: Record<string, unknown>): { valid: boolean; errors: string[]; recordCount: number; bundleHash: string };
export declare function createRedactionManifest(args?: Record<string, unknown>): Record<string, unknown>;
export declare function appendAuditEventChain(events: Array<Record<string, unknown>>, event: Record<string, unknown>): Array<Record<string, unknown>>;
export declare function verifyAuditEventChain(events: Array<Record<string, unknown>>): { valid: boolean; errors: string[]; eventCount: number; lastHash: string | null };

export declare const PYTHON_SDK_COMPATIBILITY: { sdk: string; minimumVersion: string; protocol: string; status: string };
export declare function validatePythonSdkRecord(record: unknown): unknown;
export declare function validatePythonSdkRecords(records: unknown[]): unknown[];
export declare function loadPythonSdkFixtureRecords(fixtureDir?: string): Array<{ file: string; record: unknown }>;
export declare function validatePythonSdkFixtureRecords(fixtureDir?: string): unknown[];

export declare const GOVERNANCE_PROTOCOL_STATUS: {
  readonly name: string; readonly schemaVersion: string; readonly status: string; readonly compatibleCoreLine: string; readonly stabilityContract: string; readonly conformanceCommand: string; readonly pythonConformanceCommand: string; readonly breakingChangePath: string; readonly schemaBacked: boolean; readonly goldenRecords: boolean; readonly crossLanguageFixtures: boolean; readonly recordTypes: readonly string[]; readonly compatibilityRules: readonly string[]; readonly boundary: string;
};
export declare function getGovernanceProtocolStatus(): typeof GOVERNANCE_PROTOCOL_STATUS;

export { PROTOCOL_CONFORMANCE_KIT, runProtocolConformanceKit } from "./conformance-kit.js";
