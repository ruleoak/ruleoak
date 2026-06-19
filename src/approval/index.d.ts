export type ApprovalStatus = "pending" | "approved" | "rejected" | "evidence_requested" | "cancelled";
export interface ApprovalDecisionOptions { actor?: string; reason?: string; note?: string }
export interface ApprovalEvidenceRequestOptions extends ApprovalDecisionOptions { evidence?: string[] | string }
export declare class ApprovalInboxStore {
  constructor(options?: { path?: string });
  static fromReports(reportPaths?: string[], options?: { path?: string }): ApprovalInboxStore;
  ingestReport(report: unknown, reportSource?: string): this;
  add(request: unknown): unknown;
  list(status?: ApprovalStatus | string): unknown[];
  get(id: string): unknown | null;
  assign(id: string, options: { reviewer: string; reviewerRole?: string | null; actor?: string; reason?: string }): unknown;
  requestEvidence(id: string, options?: ApprovalEvidenceRequestOptions): unknown;
  approve(id: string, options?: ApprovalDecisionOptions): unknown;
  reject(id: string, options?: ApprovalDecisionOptions): unknown;
  summary(): { version: string; total: number; pending: number; approved: number; rejected: number; evidenceRequested: number; overdue: number; risks: Record<string, number>; priorities: Record<string, number> };
  exportDecisionLog(path?: string): string;
  exportApprovalPacket(id: string, path?: string): { path: string; packet: unknown };
  save(): unknown;
}
export declare function renderApprovalInboxHtml(state?: { requests?: unknown[] }): string;
