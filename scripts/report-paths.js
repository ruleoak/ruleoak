import { join } from "node:path";
export function defaultReportPaths(root = process.cwd()) {
  return [
    join(root, "examples", "technical-consultant-demo", "out", "case-report.json"),
    join(root, "examples", "research-brief-demo", "out", "research-brief-report.json"),
    join(root, "examples", "tool-guard-demo", "out", "tool-guard-report.json"),
    join(root, "examples", "tool-guard-demo", "out", "mcp-guard-report.json"),
    join(root, "examples", "mcp-guard-demo", "out", "mcp-guard-report.json"),
    join(root, "examples", "evidence-connectors-demo", "out", "evidence-connectors-report.json"),
    join(root, "examples", "write-connectors-demo", "out", "write-connectors-report.json"),
    join(root, "examples", "policy-packs-demo", "out", "policy-packs-report.json")
  ];
}
