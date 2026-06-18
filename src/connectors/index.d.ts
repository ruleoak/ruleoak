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
