export function stableJson(value: unknown): string;
export function hashRecord(value: unknown): string;
export function createConnectorRunId(prefix?: string): string;
export function createConnectorEvidence(args: { connector: string; source: string; subject: string; claim: string; value: unknown; metadata?: Record<string, unknown> }): Record<string, unknown>;
export class LocalFileEvidenceConnector { constructor(args: { workspaceRoot: string }); readEvidence(path: string, args: { subject: string; claim: string }): Record<string, unknown>; }
export class GitHubReadOnlyConnector { static fromFixture(path: string): GitHubReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export class JiraReadOnlyConnector { static fromFixture(path: string): JiraReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export class EvidenceConnectorRunner { constructor(args?: { connectors?: unknown[]; runId?: string; actor?: string }); collect(): Record<string, unknown>[]; report(args?: { title?: string; summary?: string }): Record<string, unknown>; }
export function hashWriteIntent(value: unknown): string;
export function createWriteIntent(args: { connector: string; action: string; target: string; payload?: Record<string, unknown>; actor?: string; metadata?: Record<string, unknown> }): Record<string, unknown>;
export function createWriteRunId(prefix?: string): string;
export class ApprovalGatedWriteRunner { constructor(args?: { connectors?: unknown[]; policy?: Record<string, unknown>; runId?: string; actor?: string; dryRun?: boolean }); propose(intent: Record<string, unknown>): Record<string, unknown>; proposeFromConnectors(): Record<string, unknown>[]; approve(approvalRequestId: string, args?: { actor?: string; reason?: string }): Record<string, unknown>; applyApproved(args?: { outboxPath?: string }): Record<string, unknown>[]; report(args?: { title?: string; summary?: string }): Record<string, unknown>; }
export class FixtureWriteConnector { constructor(args?: { id?: string; source?: string; intents?: unknown[] }); proposeWrites(): Record<string, unknown>[]; applyWrite(intent: Record<string, unknown>, args?: { dryRun?: boolean }): Record<string, unknown>; }
export class GitHubIssueWriteConnector extends FixtureWriteConnector { static demo(): GitHubIssueWriteConnector; }
export class JiraTicketWriteConnector extends FixtureWriteConnector { static demo(): JiraTicketWriteConnector; }
export class LocalOutboxWriteConnector extends FixtureWriteConnector { static demo(): LocalOutboxWriteConnector; }

export declare class GitHubApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export declare function collectGitHubEvidence(options?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
export declare class AsyncEvidenceConnectorRunner { constructor(args?: Record<string, unknown>); collect(): Promise<Array<Record<string, unknown>>>; report(options?: Record<string, unknown>): Record<string, unknown>; }

export declare class JiraApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export declare function collectJiraEvidence(options?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;

export declare class ConnectorReliabilityError extends Error { status: number | null; statusText: string; url: string | null; method: string; rateLimited: boolean; retryAfter: number | null; }
export declare function redactSecret(value: unknown): unknown;
export declare function enforceReadOnlyRequest(args?: { method?: string }): string;
export declare function parseRetryAfter(value?: string | null): number | null;
export declare function parseGitHubRateLimit(headers?: unknown): Record<string, unknown>;
export declare function connectorReliabilityPolicy(args?: Record<string, unknown>): Record<string, unknown>;
export declare function buildPagePlan(args?: Record<string, unknown>): Array<Record<string, unknown>>;
export declare function fetchJsonReadOnly(args?: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function connectorDiagnosticRecord(args?: Record<string, unknown>): Record<string, unknown>;

export const ENTERPRISE_CONNECTOR_MANIFEST: Record<string, unknown>;
export declare class ServiceNowReadOnlyConnector { static fromFixture(path: string): ServiceNowReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class ConfluenceReadOnlyConnector { static fromFixture(path: string): ConfluenceReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class GitLabReadOnlyConnector { static fromFixture(path: string): GitLabReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class SplunkReadOnlyConnector { static fromFixture(path: string): SplunkReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class PrometheusReadOnlyConnector { static fromFixture(path: string): PrometheusReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class KubernetesReadOnlyConnector { static fromFixture(path: string): KubernetesReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class CiCdReadOnlyConnector { static fromFixture(path: string): CiCdReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare class CollaborationReadOnlyConnector { static fromFixture(path: string): CollaborationReadOnlyConnector; collectEvidence(): Record<string, unknown>[]; }
export declare function enterpriseConnectorCatalog(): Record<string, unknown>;

export declare class ServiceNowApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export declare class ConfluenceApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export declare class GitLabApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export declare class PrometheusApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export declare class GrafanaApiReadOnlyConnector { constructor(args?: Record<string, unknown>); collectEvidence(): Promise<Array<Record<string, unknown>>>; }
export const REAL_EVIDENCE_CONNECTOR_V1_MANIFEST: Record<string, unknown>;
export declare function collectRealEnterpriseEvidence(options?: { connectors?: unknown[] }): Promise<Array<Record<string, unknown>>>;
