#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, statSync } from "node:fs";
import { join, resolve, extname, basename, dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { renderReportFile } from "../reports/html-report.js";
import { writeReportCatalog } from "../reports/report-catalog.js";

const root = resolve(".");
const reportsDir = join(root, "reports", "html");

function banner(title) {
  console.log(`\nRuleOak ${title}`);
  console.log("=".repeat(Math.min(72, 8 + title.length)));
}
function step(label) { console.log(`\n› ${label}`); }
function ok(text) { console.log(`  ✓ ${text}`); }
function warn(text) { console.log(`  ! ${text}`); }
function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { cwd: root, encoding: "utf8", ...options });
  if (options.stdio === "inherit") return res.status === 0;
  if (res.status !== 0) {
    console.error(res.stdout || "");
    console.error(res.stderr || "");
    throw new Error(`${cmd} ${args.join(" ")} failed`);
  }
  return res.stdout || "";
}
function findReports() {
  const paths = [
    join(root, "examples", "technical-consultant-demo", "out", "case-report.json"),
    join(root, "examples", "research-brief-demo", "out", "research-brief-report.json"),
    join(root, "examples", "tool-guard-demo", "out", "tool-guard-report.json"),
    join(root, "examples", "tool-guard-demo", "out", "mcp-guard-report.json"),
    join(root, "examples", "mcp-guard-demo", "out", "mcp-guard-report.json"),
    join(root, "examples", "evidence-connectors-demo", "out", "evidence-connectors-report.json"),
    join(root, "examples", "write-connectors-demo", "out", "write-connectors-report.json")
  ];
  return paths.filter(existsSync);
}
function htmlReports() {
  mkdirSync(reportsDir, { recursive: true });
  const reports = findReports();
  const rendered = [];
  for (const reportPath of reports) {
    const normalizedPath = reportPath.replaceAll("\\", "/");
    const name = normalizedPath.includes("/write-connectors-demo/") ? "write-connectors-report.html" : normalizedPath.includes("/evidence-connectors-demo/") ? "evidence-connectors-report.html" : normalizedPath.includes("/mcp-guard-demo/") ? "mcp-guard-report.html" : normalizedPath.includes("/tool-guard-demo/") && basename(reportPath).includes("mcp") ? "mcp-guard-tool-demo-report.html" : normalizedPath.includes("/tool-guard-demo/") ? "tool-guard-report.html" : normalizedPath.includes("/research-brief-demo/") ? "research-brief-report.html" : "technical-consultant-report.html";
    rendered.push(renderReportFile(reportPath, join(reportsDir, name)));
  }
  const index = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RuleOak Reports</title><style>body{font-family:system-ui;background:#08111f;color:#eef5ff;padding:40px}a{color:#d6b56d;font-size:20px}li{margin:14px 0}.card{max-width:780px;border:1px solid #2a405e;border-radius:20px;background:#0d1b2e;padding:26px}</style></head><body><div class="card"><h1>RuleOak local report viewer</h1><p>Generated one-page reports:</p><ul>${rendered.map(p => `<li><a href="./${basename(p)}">${basename(p)}</a></li>`).join("")}</ul><p>Run <code>npm run report:view</code> to serve this folder locally.</p></div></body></html>`;
  writeFileSync(join(reportsDir, "index.html"), index);
  writeReportCatalog(reports, join(reportsDir, "catalog.json"));
  return rendered;
}
function printSummary(reportPath) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const title = report.summary?.title || report.summary?.question || report.run?.app || basename(reportPath);
  console.log(`  Report: ${title}`);
  if (report.summary?.policyDecision) console.log(`  Policy: ${report.summary.policyDecision}`);
  if (report.summary?.publishDecision) console.log(`  Publish: ${report.summary.publishDecision}`);
  if (report.evidence?.length) console.log(`  Evidence: ${report.evidence.length} records`);
}

async function chooseWorkflow() {
  banner("onboard");
  console.log("Choose your first governed workflow:");
  console.log("  1) Technical Consultant — evidence, probable cause, approval boundary");
  console.log("  2) Research Brief — sourced claims, confidence, publication approval");
  console.log("  3) Sandbox Demo — deny-by-default filesystem/network/command/tool checks");
  console.log("  4) Tool Guard Demo — govern AI tool calls before execution");
  console.log("  5) MCP Guard Demo — govern MCP-style tool requests before execution");
  console.log("  6) Evidence Connectors Demo — collect read-only evidence from local fixtures");
  console.log("  7) Write Connectors Demo — approval-gated dry-run writes");
  if (!process.stdin.isTTY) {
    warn("No interactive terminal detected. Running full demo instead.");
    return "all";
  }
  const rl = createInterface({ input, output });
  const answer = await rl.question("Select 1, 2, 3, or all [all]: ");
  rl.close();
  const a = answer.trim().toLowerCase();
  if (a === "1") return "consultant";
  if (a === "2") return "research";
  if (a === "3") return "sandbox";
  if (a === "4") return "guard";
  if (a === "5") return "mcp";
  if (a === "6") return "connectors";
  if (a === "7") return "writes";
  return "all";
}

function runWorkflow(choice = "all") {
  if (choice === "consultant" || choice === "all") {
    step("Run Technical Consultant demo");
    run("npm", ["run", "example:consultant"], { stdio: "inherit" });
    const p = join(root, "examples", "technical-consultant-demo", "out", "case-report.json");
    if (existsSync(p)) printSummary(p);
  }
  if (choice === "research" || choice === "all") {
    step("Run Research Brief demo");
    run("npm", ["run", "example:research"], { stdio: "inherit" });
    const p = join(root, "examples", "research-brief-demo", "out", "research-brief-report.json");
    if (existsSync(p)) printSummary(p);
  }
  if (choice === "sandbox" || choice === "all") {
    step("Run sandbox demo");
    run("npm", ["run", "sandbox:demo"], { stdio: "inherit" });
  }
  if (choice === "guard" || choice === "all") {
    step("Run Tool Guard demo");
    run("npm", ["run", "guard:demo"], { stdio: "inherit" });
    const p = join(root, "examples", "tool-guard-demo", "out", "tool-guard-report.json");
    if (existsSync(p)) printSummary(p);
  }
  if (choice === "mcp" || choice === "all") {
    step("Run MCP Guard demo");
    run("npm", ["run", "mcp:demo"], { stdio: "inherit" });
    const p = join(root, "examples", "mcp-guard-demo", "out", "mcp-guard-report.json");
    if (existsSync(p)) printSummary(p);
  }
  if (choice === "connectors" || choice === "all") {
    step("Run Evidence Connectors demo");
    run("npm", ["run", "connector:demo"], { stdio: "inherit" });
    const p = join(root, "examples", "evidence-connectors-demo", "out", "evidence-connectors-report.json");
    if (existsSync(p)) printSummary(p);
  }
  if (choice === "writes" || choice === "all") {
    step("Run Approval-gated Write Connectors demo");
    run("npm", ["run", "write:demo"], { stdio: "inherit" });
    const p = join(root, "examples", "write-connectors-demo", "out", "write-connectors-report.json");
    if (existsSync(p)) printSummary(p);
  }
}

function initApp(args) {
  banner("init");
  const name = args.find(a => !a.startsWith("--")) || "my-ruleoak-workflow";
  const templateArg = args.find(a => a.startsWith("--template="));
  const templateName = templateArg ? templateArg.split("=")[1] : "minimal-governed-workflow";
  const src = join(root, "templates", templateName);
  if (!existsSync(src)) throw new Error(`Unknown template: ${templateName}. Try consultant-workflow, research-workflow, or minimal-governed-workflow.`);
  const dest = resolve(name);
  if (existsSync(dest)) throw new Error(`Destination already exists: ${dest}`);
  cpSync(src, dest, { recursive: true });
  ok(`Created ${dest}`);
  console.log("\nNext:");
  console.log(`  cd ${name}`);
  console.log("  read README.md");
  console.log("  adapt policy.json and workflow.md");
}

function serveReports(args) {
  const portArg = args.find(a => a.startsWith("--port="));
  const port = portArg ? Number(portArg.split("=")[1]) : 8787;
  htmlReports();
  const base = reportsDir;
  const types = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".json":"application/json", ".png":"image/png" };
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let path = join(base, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!path.startsWith(base)) { res.writeHead(403); res.end("Forbidden"); return; }
    if (!existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" });
    res.end(readFileSync(path));
  });
  server.listen(port, "127.0.0.1", () => {
    banner("local report viewer");
    ok(`Open http://127.0.0.1:${port}/`);
    console.log("Press Ctrl+C to stop.");
  });
}

async function main() {
  const [cmd, sub, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    banner("CLI");
    console.log("Commands:");
    console.log("  roak launch              guided first-launch path");
    console.log("  roak demo                run demos + sandbox + HTML reports");
    console.log("  roak onboard             choose your first workflow");
    console.log("  roak init <dir>          copy a governed workflow template");
    console.log("  roak report html         generate one-page HTML reports");
    console.log("  roak report view         start browser-based local report viewer");
    console.log("  npm run mcp:demo         run MCP Guard demo");
    console.log("  npm run connector:demo   run read-only evidence connectors demo");
    console.log("  npm run write:demo       run approval-gated write connectors demo");
    console.log("  npm run telemetry:export run local OpenTelemetry-style export");
    return;
  }
  if (cmd === "launch") {
    banner("launch path");
    console.log("AGPL runtime foundation for governed AI workflows and governed AI tool calls.");
    step("List examples"); run("npm", ["run", "examples:list"], { stdio: "inherit" });
    runWorkflow("all");
    step("Generate one-page HTML reports"); const rendered = htmlReports(); rendered.forEach(p => ok(p));
    console.log("\nNext UX commands:");
    console.log("  npm run report:view       # browser-based local report viewer");
    console.log("  npm run roak:init -- my-workflow --template=consultant-workflow");
    return;
  }
  if (cmd === "demo") {
    banner("demo");
    runWorkflow("all");
    step("Generate one-page HTML reports"); htmlReports().forEach(p => ok(p));
    return;
  }
  if (cmd === "onboard") {
    const choice = await chooseWorkflow();
    runWorkflow(choice);
    if (choice !== "sandbox") htmlReports().forEach(p => ok(`HTML report: ${p}`));
    return;
  }
  if (cmd === "init") { initApp([sub, ...rest].filter(Boolean)); return; }
  if (cmd === "report" && sub === "html") { banner("report html"); htmlReports().forEach(p => ok(p)); return; }
  if (cmd === "report" && sub === "view") { serveReports(rest); return; }
  throw new Error(`Unknown command: ${[cmd, sub].filter(Boolean).join(" ")}`);
}

main().catch((err) => { console.error(`\nRuleOak error: ${err.message}`); process.exit(1); });
