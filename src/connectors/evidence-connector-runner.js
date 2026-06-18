import { AuditLog } from "../runtime/audit-log.js";
import { createConnectorRunId } from "./connector-records.js";

export class EvidenceConnectorRunner {
  constructor({ connectors = [], runId = createConnectorRunId(), actor = "connector-runner" } = {}) {
    this.connectors = connectors;
    this.runId = runId;
    this.actor = actor;
    this.auditLog = new AuditLog({ runId });
    this.evidence = [];
    this.auditLog.record("connectors.started", { actor, connectorCount: connectors.length });
  }

  collect() {
    for (const connector of this.connectors) {
      const records = connector.collectEvidence();
      for (const record of records) {
        this.evidence.push(record);
        this.auditLog.record("connector.evidence_recorded", { connector: record.connector, evidenceId: record.id, subject: record.subject });
      }
    }
    return [...this.evidence];
  }

  report({ title = "RuleOak Read-only Evidence Connector Report", summary = "Read-only evidence was collected from local fixtures and workspace files." } = {}) {
    return {
      runtimeVersion: "2.0.0",
      runtimeStage: "read-only-evidence-connectors",
      run: { id: this.runId, app: "RuleOak Evidence Connector Runner", status: "completed" },
      summary: { title, summary, evidenceCount: this.evidence.length, connectorCount: this.connectors.length },
      evidence: [...this.evidence],
      auditEvents: this.auditLog.list(),
      connectorBoundary: {
        mode: "read_only",
        network: "not used by demo connectors",
        credentials: "not required by fixture connectors",
        writes: "not supported"
      },
      boundaryNote: "These connectors collect read-only evidence from local fixtures/files. They do not update GitHub, Jira, or external systems."
    };
  }
}
