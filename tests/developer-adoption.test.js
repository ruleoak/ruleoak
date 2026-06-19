import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(args) {
  const result = spawnSync("npm", ["run", ...args], { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`npm run ${args.join(" ")} failed`);
  }
  return result;
}

run(["quickstart:all"]);
run(["adoption:real-frameworks"]);

const reportPath = "quickstart/out/04-generate-audit-report/report.json";
if (!existsSync(reportPath)) throw new Error("quickstart 04 report not generated");
const report = JSON.parse(readFileSync(reportPath, "utf8"));
if (report.summary.allowed !== 1) throw new Error("quickstart report should include one allowed decision");
if (report.summary.approvalRequired !== 1) throw new Error("quickstart report should include one approval decision");
if (report.summary.blocked !== 1) throw new Error("quickstart report should include one blocked decision");

const replayPath = "quickstart/out/05-replay-evidence-bundle/replay-result.json";
if (!existsSync(replayPath)) throw new Error("quickstart 05 replay result not generated");
const replay = JSON.parse(readFileSync(replayPath, "utf8"));
if (!replay.evidenceBundle.valid || !replay.auditChain.valid) throw new Error("quickstart replay verification failed");

const adoptionDoc = readFileSync("docs/adoption/10-minute-quickstart.md", "utf8");
for (const phrase of ["quickstart:01", "quickstart:05", "RuleOak is an application-level tool-call governance boundary"]) {
  if (!adoptionDoc.includes(phrase)) throw new Error(`missing adoption doc phrase: ${phrase}`);
}

console.log(JSON.stringify({ ok: true, test: "developer-adoption" }, null, 2));
