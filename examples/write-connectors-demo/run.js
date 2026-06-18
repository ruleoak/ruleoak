import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ApprovalGatedWriteRunner, GitHubIssueWriteConnector, JiraTicketWriteConnector, LocalOutboxWriteConnector } from "../../src/connectors/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const policy = JSON.parse(readFileSync(join(here, "policy.json"), "utf8"));
const runner = new ApprovalGatedWriteRunner({
  connectors: [GitHubIssueWriteConnector.demo(), JiraTicketWriteConnector.demo(), LocalOutboxWriteConnector.demo()],
  policy,
  runId: "ruleoak-write-connectors-demo",
  dryRun: true
});
const decisions = runner.proposeFromConnectors();
for (const decision of decisions.filter((d) => d.approvalRequired)) runner.approve(decision.approvalRequestId, { actor: "human_reviewer", reason: "Approved for local dry-run outbox demo." });
runner.applyApproved({ outboxPath: join(here, "out", "write-outbox.json") });
const report = runner.report({ summary: "Approval-gated GitHub-style, Jira-style, and local write intents were governed before simulated execution." });
mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(join(here, "out", "write-connectors-report.json"), JSON.stringify(report, null, 2));
console.log(`Write intents: ${report.summary.proposed}`);
console.log(`Approval required: ${report.summary.approvalRequired}`);
console.log(`Blocked: ${report.summary.blocked}`);
console.log(`Applied to local outbox: ${report.summary.appliedToOutbox}`);
console.log(`Report: ${join(here, "out", "write-connectors-report.json")}`);
