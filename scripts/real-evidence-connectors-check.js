import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const jsonMode = process.argv.includes("--json");
const checks = [];
function check(name, ok, details = "") { checks.push({ name, ok: Boolean(ok), details }); }

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
check("core release remains v2.1.0", pkg.version === "2.1.0", pkg.version);
check("real connector source exists", existsSync("src/connectors/real-enterprise-api-connectors.js"));
check("real connector example exists", existsSync("examples/real-evidence-connectors-v1/run.js"));
check("real connector docs exist", existsSync("docs/connectors/real-evidence-connectors-v1.md"));
check("real connector test exists", existsSync("tests/real-evidence-connectors.test.js"));

const source = readFileSync("src/connectors/real-enterprise-api-connectors.js", "utf8");
for (const name of ["ServiceNowApiReadOnlyConnector", "ConfluenceApiReadOnlyConnector", "GitLabApiReadOnlyConnector", "PrometheusApiReadOnlyConnector", "GrafanaApiReadOnlyConnector"]) {
  check(`${name} exported`, source.includes(`class ${name}`) || source.includes(`export class ${name}`));
}
check("manifest uses v2.1.0", source.includes('coreRelease: "v2.1.0"'));
check("connector boundary declares read-only", source.includes('mode: "read_only"') && source.includes('writes: false'));

const run = spawnSync(process.execPath, ["examples/real-evidence-connectors-v1/run.js"], { encoding: "utf8" });
check("real connector example runs", run.status === 0, (run.stderr || run.stdout).trim());
check("example report generated", existsSync("examples/real-evidence-connectors-v1/out/real-evidence-connectors-report.json"));
if (existsSync("examples/real-evidence-connectors-v1/out/real-evidence-connectors-report.json")) {
  const report = JSON.parse(readFileSync("examples/real-evidence-connectors-v1/out/real-evidence-connectors-report.json", "utf8"));
  check("example report has five connectors", report.connectorCount === 5, String(report.connectorCount));
  check("example report has evidence", report.evidenceCount >= 10, String(report.evidenceCount));
  check("example report uses v2.1.0", report.coreRelease === "v2.1.0", report.coreRelease);
}

const failed = checks.filter((item) => !item.ok);
const result = { ok: failed.length === 0, passed: checks.length - failed.length, total: checks.length, checks };
if (jsonMode) console.log(JSON.stringify(result, null, 2));
else {
  for (const item of checks) console.log(`${item.ok ? "✓" : "✗"} ${item.name}${item.details ? ` — ${item.details}` : ""}`);
  console.log(`real evidence connectors check: ${result.passed}/${result.total} passed`);
}
if (!result.ok) process.exit(1);
