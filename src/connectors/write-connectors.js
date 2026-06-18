import { createWriteIntent } from "./write-intent-records.js";

export class FixtureWriteConnector {
  constructor({ id, source = "fixture", intents = [] } = {}) {
    this.id = id;
    this.source = source;
    this.intents = intents;
  }

  proposeWrites() {
    return this.intents.map((intent) => createWriteIntent({ connector: this.id, metadata: { source: this.source }, ...intent }));
  }

  applyWrite(intent, { dryRun = true } = {}) {
    return {
      status: dryRun ? "dry_run_outbox_recorded" : "applied_by_connector",
      connector: this.id,
      action: intent.action,
      target: intent.target,
      payloadPreview: Object.keys(intent.payload || {}).slice(0, 12),
      note: dryRun ? "No external system was changed." : "Connector applyWrite returned success."
    };
  }
}

export class GitHubIssueWriteConnector extends FixtureWriteConnector {
  constructor({ intents = [] } = {}) {
    super({ id: "github_write", source: "github_write_fixture", intents });
  }

  static demo() {
    return new GitHubIssueWriteConnector({
      intents: [
        { action: "github.comment_issue", target: "github://ruleoak/ruleoak-core/issues/12", actor: "agent", payload: { body: "Suggested triage comment from governed workflow." } },
        { action: "github.close_issue", target: "github://ruleoak/ruleoak-core/issues/13", actor: "agent", payload: { reason: "not planned" } }
      ]
    });
  }
}

export class JiraTicketWriteConnector extends FixtureWriteConnector {
  constructor({ intents = [] } = {}) {
    super({ id: "jira_write", source: "jira_write_fixture", intents });
  }

  static demo() {
    return new JiraTicketWriteConnector({
      intents: [
        { action: "jira.add_comment", target: "jira://PLAT-101", actor: "agent", payload: { body: "Proposed governed update summary." } },
        { action: "jira.transition_ticket", target: "jira://PLAT-102", actor: "agent", payload: { transition: "Done" } }
      ]
    });
  }
}

export class LocalOutboxWriteConnector extends FixtureWriteConnector {
  constructor({ intents = [] } = {}) {
    super({ id: "local_outbox", source: "local_outbox_fixture", intents });
  }

  static demo() {
    return new LocalOutboxWriteConnector({ intents: [{ action: "local.write_outbox_note", target: "outbox://notes/governed-summary.md", actor: "agent", payload: { title: "Governed summary", body: "Local-only outbox note." } }] });
  }
}
