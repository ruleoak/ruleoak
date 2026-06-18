import { existsSync } from "node:fs";
import { join } from "node:path";
import { exportReportsToOtel } from "../src/telemetry/index.js";
import { defaultReportPaths } from "./report-paths.js";

const reportPaths = defaultReportPaths(process.cwd()).filter(existsSync);
const outDir = join(process.cwd(), "reports", "telemetry");
const events = exportReportsToOtel({
  reportPaths,
  outputJsonl: join(outDir, "ruleoak-otel-events.jsonl"),
  outputJson: join(outDir, "ruleoak-otel-spans.json")
});
console.log(`Telemetry events: ${events.length}`);
console.log(`JSONL: ${join(outDir, "ruleoak-otel-events.jsonl")}`);
console.log(`JSON: ${join(outDir, "ruleoak-otel-spans.json")}`);
