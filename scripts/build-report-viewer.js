import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderReportFile } from "../src/reports/html-report.js";
import { writeReportCatalog } from "../src/reports/report-catalog.js";
import { defaultReportPaths } from "./report-paths.js";

const reportsDir = join(process.cwd(), "reports", "html");
const reportPaths = defaultReportPaths(process.cwd()).filter(existsSync);
for (const path of reportPaths) {
  const name = path.includes("policy-packs-demo") ? "policy-packs-report.html" : path.includes("write-connectors-demo") ? "write-connectors-report.html" : path.includes("evidence-connectors-demo") ? "evidence-connectors-report.html" : path.includes("mcp-guard-demo") ? "mcp-guard-report.html" : path.includes("tool-guard-demo") && path.includes("mcp") ? "mcp-guard-tool-demo-report.html" : path.includes("tool-guard-demo") ? "tool-guard-report.html" : path.includes("research-brief-demo") ? "research-brief-report.html" : "technical-consultant-report.html";
  renderReportFile(path, join(reportsDir, name));
}
const catalog = writeReportCatalog(reportPaths, join(reportsDir, "catalog.json"));
console.log(`Report catalog: ${catalog.reportCount} reports`);
console.log(`Viewer folder: ${reportsDir}`);
