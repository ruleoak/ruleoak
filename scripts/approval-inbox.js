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
  console.log(`Approval UX v2 inbox: ${htmlPath}`);
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
  server.listen(8788, "127.0.0.1", () => console.log("RuleOak Approval UX v2: http://127.0.0.1:8788"));
}

function writeAndPrint(store, message) {
  writeFileSync(htmlPath, renderApprovalInboxHtml(store.state));
  console.log(message);
  console.log(JSON.stringify(store.summary(), null, 2));
}

const command = process.argv[2] || "build";
if (command === "build") build();
else if (command === "serve") serve();
else if (command === "export") {
  const store = new ApprovalInboxStore({ path: statePath });
  const exportPath = store.exportDecisionLog(join(outDir, "approval-decisions.jsonl"));
  console.log(`Approval decision export: ${exportPath}`);
  console.log(JSON.stringify(store.summary(), null, 2));
} else if (command === "packet") {
  const id = process.argv[3];
  if (!id) throw new Error("Usage: npm run approval:packet -- <approval-id>");
  const store = new ApprovalInboxStore({ path: statePath });
  const { path, packet } = store.exportApprovalPacket(id, join(outDir, "packets", `${id}.approval-packet.json`));
  console.log(`Approval packet: ${path}`);
  console.log(JSON.stringify(packet.integrity, null, 2));
} else if (command === "request-evidence") {
  const id = process.argv[3];
  if (!id) throw new Error("Usage: npm run approval:request-evidence -- <approval-id>");
  const store = new ApprovalInboxStore({ path: statePath });
  store.requestEvidence(id, {
    actor: process.env.USER || "human_reviewer",
    reason: "Additional evidence requested from RuleOak CLI",
    evidence: process.argv.slice(4).length ? process.argv.slice(4) : ["Attach supporting evidence before approval."]
  });
  writeAndPrint(store, `evidence requested: ${id}`);
} else if (command === "assign") {
  const id = process.argv[3];
  const reviewer = process.argv[4] || process.env.USER || "human_reviewer";
  if (!id) throw new Error("Usage: node scripts/approval-inbox.js assign <approval-id> [reviewer]");
  const store = new ApprovalInboxStore({ path: statePath });
  store.assign(id, { reviewer, actor: process.env.USER || "approval_coordinator" });
  writeAndPrint(store, `assigned ${id} to ${reviewer}`);
} else if (command === "approve" || command === "reject") {
  const id = process.argv[3];
  if (!id) throw new Error(`Usage: npm run approval:${command} -- <approval-id>`);
  const store = new ApprovalInboxStore({ path: statePath });
  store[command](id, { actor: process.env.USER || "human_reviewer", reason: `Marked ${command} from RuleOak CLI` });
  writeAndPrint(store, `${command}: ${id}`);
} else {
  throw new Error(`Unknown approval inbox command: ${command}`);
}
