import { createServer } from "node:http";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ApprovalInboxStore, renderApprovalInboxHtml } from "../src/approval/index.js";
import { defaultReportPaths } from "./report-paths.js";

const outDir = join(process.cwd(), "reports", "approval-inbox");
const statePath = join(outDir, "approvals.json");
const htmlPath = join(outDir, "index.html");

function build() {
  mkdirSync(outDir, { recursive: true });
  const reportPaths = defaultReportPaths(process.cwd()).filter(existsSync);
  const store = ApprovalInboxStore.fromReports(reportPaths, { path: statePath });
  writeFileSync(htmlPath, renderApprovalInboxHtml(store.state));
  console.log(`Approval inbox: ${htmlPath}`);
  console.log(`Approval state: ${statePath}`);
  console.log(JSON.stringify(store.summary(), null, 2));
  return store;
}

function serve() {
  build();
  const server = createServer((req, res) => {
    if (req.url === "/approvals.json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(readFileSync(statePath));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(readFileSync(htmlPath));
  });
  server.listen(8788, "127.0.0.1", () => console.log("RuleOak Approval Inbox: http://127.0.0.1:8788"));
}

const command = process.argv[2] || "build";
if (command === "build") build();
else if (command === "serve") serve();
else if (command === "approve" || command === "reject") {
  const id = process.argv[3];
  if (!id) throw new Error(`Usage: npm run approval:${command} -- <approval-id>`);
  const store = new ApprovalInboxStore({ path: statePath });
  store[command](id, { actor: process.env.USER || "human_reviewer", reason: `Marked ${command} from RuleOak CLI` });
  writeFileSync(htmlPath, renderApprovalInboxHtml(store.state));
  console.log(`${command}: ${id}`);
  console.log(JSON.stringify(store.summary(), null, 2));
} else {
  throw new Error(`Unknown approval inbox command: ${command}`);
}
