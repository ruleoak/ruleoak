import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ApprovalGatedWriteRunner, GitHubIssueWriteConnector, JiraTicketWriteConnector, LocalOutboxWriteConnector } from "../src/connectors/index.js";

const policy = {
  boundary: "approval_gated_writes",
  allowedTools: ["local.write_outbox_note"],
  approvalRequired: ["github.comment_issue", "jira.add_comment", "jira.transition_ticket"],
  blockedTools: ["github.close_issue"]
};

const runner = new ApprovalGatedWriteRunner({ connectors: [GitHubIssueWriteConnector.demo(), JiraTicketWriteConnector.demo(), LocalOutboxWriteConnector.demo()], policy, runId: "test-write-run", dryRun: true });
const decisions = runner.proposeFromConnectors();
assert.equal(decisions.length, 5);
assert.equal(decisions.find((d) => d.action === "github.comment_issue").approvalRequired, true);
assert.equal(decisions.find((d) => d.action === "github.close_issue").blocked, true);
assert.equal(decisions.find((d) => d.action === "local.write_outbox_note").allowedNow, true);
const approvalDecision = decisions.find((d) => d.action === "jira.add_comment");
runner.approve(approvalDecision.approvalRequestId, { actor: "reviewer" });
const out = join(mkdtempSync(join(tmpdir(), "ruleoak-write-")), "outbox.json");
const applied = runner.applyApproved({ outboxPath: out });
assert.ok(applied.some((a) => a.action === "jira.add_comment"));
assert.ok(applied.some((a) => a.action === "local.write_outbox_note"));
assert.ok(!applied.some((a) => a.action === "github.close_issue"));
const saved = JSON.parse(readFileSync(out, "utf8"));
assert.equal(saved.dryRun, true);
assert.ok(Array.isArray(saved.applied));
const report = runner.report();
assert.equal(report.summary.blocked, 1);
assert.equal(report.connectorBoundary.writes, "simulated local outbox only");
console.log("write connector tests passed");
