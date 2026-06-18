import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reportToOtelEvents, exportReportsToOtel } from "../src/telemetry/index.js";

const report = {
  runtimeVersion: "1.5.0",
  runtimeStage: "tool-guard",
  run: { id: "run-otel" },
  auditEvents: [{ id: "evt-1", type: "tool.policy_decision", timestamp: "2026-01-01T00:00:00.000Z", payload: { decision: "allowed" } }],
  toolDecisions: [{ toolId: "search_docs", decision: "allowed" }]
};
const events = reportToOtelEvents(report, { source: "tool-report.json" });
assert.ok(events.length >= 2);
assert.equal(events[0].traceId.length, 32);
const dir = mkdtempSync(join(tmpdir(), "ruleoak-otel-"));
const input = join(dir, "report.json");
writeFileSync(input, JSON.stringify(report));
const jsonl = join(dir, "events.jsonl");
const json = join(dir, "spans.json");
const exported = exportReportsToOtel({ reportPaths: [input], outputJsonl: jsonl, outputJson: json });
assert.equal(exported.length, events.length);
assert.ok(existsSync(jsonl));
assert.ok(readFileSync(jsonl, "utf8").includes("ruleoak.tool_decision"));
assert.ok(existsSync(json));
console.log("telemetry export tests passed");
