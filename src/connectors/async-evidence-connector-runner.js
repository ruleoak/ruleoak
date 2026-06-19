import { AuditLog } from "../runtime/audit-log.js";
import { createConnectorRunId } from "./connector-records.js";

export class AsyncEvidenceConnectorRunner {
  constructor({ connectors = [], runId = createConnectorRunId(), actor = "async-connector-runner" } = {}) {
    this.connectors = connectors;
    this.runId = runId;
    this.actor = actor;
    this.auditLog = new AuditLog({ runId });
    this.evidence = [];
    this.auditLog.record("connectors.started", { actor, connectorCount: connectors.length });
  }

  async collect() {
    for (const connector of this.connectors) {
      const records = await connector.collectEvidence();
      for (const record of records) {
        this.evidence.push(record);
        this.auditLog.record("connector.evidence_recorded", { connector: record.connector, evidenceId: record.id, subject: record.subject });
      }
    }
    return [...this.evidence];
  }

  report({ title = "RuleOak Async Evidence Connector Report", summary = "Read-only evidence was collected from configured connectors." } = {}) {
    return {
      runtimeVersion: "2.4.0",
      runtimeStage: "async-read-only-evidence-connectors",
      run: { id: this.runId, app: "RuleOak Async Evidence Connector Runner", status: "completed" },
      summary: { title, summary, evidenceCount: this.evidence.length, connectorCount: this.connectors.length },
      evidence: [...this.evidence],
      auditEvents: this.auditLog.list(),
      connectorBoundary: { mode: "read_only", writes: "not supported by evidence connectors", credentials: "optional for authenticated read APIs" },
      boundaryNote: "Read-only connectors may call external APIs only when explicitly configured. They do not perform writes."
    };
  }
}
