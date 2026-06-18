import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import { createHash } from "node:crypto";

function idFrom(value, length = 16) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function eventsOf(report) {
  if (Array.isArray(report.auditEvents)) return report.auditEvents;
  if (Array.isArray(report.audit?.events)) return report.audit.events;
  return [];
}

export function reportToOtelEvents(report, { source = "report.json", serviceName = "ruleoak-core" } = {}) {
  const traceId = idFrom(report.run?.id || source, 32);
  const base = {
    serviceName,
    traceId,
    runId: report.run?.id || null,
    runtimeVersion: report.runtimeVersion || "unknown",
    runtimeStage: report.runtimeStage || "unknown",
    source: basename(source)
  };
  const audit = eventsOf(report);
  const auditEvents = audit.map((event, index) => ({
    ...base,
    kind: "audit_event",
    spanId: idFrom(`${traceId}:${event.id || index}`),
    parentSpanId: null,
    name: event.type || event.event || "ruleoak.event",
    timestamp: event.timestamp || event.createdAt || new Date().toISOString(),
    attributes: { sequence: event.sequence ?? index + 1, payload: event.payload || event.metadata || event }
  }));
  const decisions = [];
  for (const d of report.toolDecisions || []) decisions.push({ name: "ruleoak.tool_decision", decision: d.decision, action: d.toolId, attributes: d });
  for (const d of report.writeDecisions || []) decisions.push({ name: "ruleoak.write_decision", decision: d.decision, action: d.action, attributes: d });
  for (const d of report.evidence || []) decisions.push({ name: "ruleoak.evidence_recorded", decision: "recorded", action: d.claim || d.subject || d.id, attributes: d });
  const decisionEvents = decisions.map((d, index) => ({
    ...base,
    kind: "governance_event",
    spanId: idFrom(`${traceId}:decision:${index}`),
    parentSpanId: null,
    name: d.name,
    timestamp: new Date().toISOString(),
    attributes: { action: d.action || null, decision: d.decision || null, ...d.attributes }
  }));
  return [...auditEvents, ...decisionEvents];
}

export function exportReportsToOtel({ reportPaths = [], outputJsonl, outputJson } = {}) {
  const events = [];
  for (const path of reportPaths) {
    try {
      const report = JSON.parse(readFileSync(path, "utf8"));
      events.push(...reportToOtelEvents(report, { source: path }));
    } catch (err) {
      events.push({ kind: "export_error", source: basename(path), error: err.message, timestamp: new Date().toISOString() });
    }
  }
  if (outputJsonl) {
    mkdirSync(dirname(outputJsonl), { recursive: true });
    writeFileSync(outputJsonl, events.map((e) => JSON.stringify(e)).join("\n") + (events.length ? "\n" : ""));
  }
  if (outputJson) {
    mkdirSync(dirname(outputJson), { recursive: true });
    writeFileSync(outputJson, JSON.stringify({ resourceSpans: [{ resource: { attributes: [{ key: "service.name", value: "ruleoak-core" }] }, scopeSpans: [{ scope: { name: "ruleoak.telemetry" }, spans: events }] }] }, null, 2));
  }
  return events;
}
