export type ApprovalInboxRequest = {
  id: string;
  action: string;
  subject?: string | null;
  actor: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  risk?: string;
  evidenceId?: string | null;
  reportSource?: string;
  createdAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionReason?: string | null;
  metadata?: Record<string, unknown>;
};
export declare class ApprovalInboxStore {
  constructor(input?: { path?: string });
  static fromReports(reportPaths?: string[], options?: { path?: string }): ApprovalInboxStore;
  ingestReport(report: Record<string, unknown>, reportSource?: string): this;
  add(request: Partial<ApprovalInboxRequest>): ApprovalInboxRequest;
  list(status?: string): ApprovalInboxRequest[];
  approve(id: string, options?: { actor?: string; reason?: string }): ApprovalInboxRequest;
  reject(id: string, options?: { actor?: string; reason?: string }): ApprovalInboxRequest;
  summary(): { total: number; pending: number; approved: number; rejected: number };
  save(): Record<string, unknown>;
}
export declare function renderApprovalInboxHtml(state: { requests: ApprovalInboxRequest[] }): string;
