import { readFileSync } from "node:fs";
import { createConnectorEvidence } from "./connector-records.js";

export class JiraReadOnlyConnector {
  constructor({ fixture, id = "jira_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { project: {}, issues: [] };
  }

  static fromFixture(path, options = {}) {
    return new JiraReadOnlyConnector({ ...options, fixture: JSON.parse(readFileSync(path, "utf8")) });
  }

  collectEvidence() {
    const project = this.fixture.project || {};
    const issues = Array.isArray(this.fixture.issues) ? this.fixture.issues : [];
    const byStatus = issues.reduce((acc, issue) => {
      const status = issue.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const highPriority = issues.filter((i) => ["High", "Critical", "Blocker"].includes(i.priority || ""));
    return [
      createConnectorEvidence({
        connector: this.id,
        source: project.key || "jira-fixture",
        subject: "project",
        claim: "Project metadata was loaded from a local read-only Jira fixture.",
        value: { key: project.key, name: project.name },
        metadata: { fixtureOnly: true }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: "jira_issues",
        subject: "jira_issues",
        claim: "Jira issue status summary was loaded from a local read-only fixture.",
        value: { total: issues.length, byStatus, highPriority: highPriority.map((i) => i.key) },
        metadata: { fixtureOnly: true }
      })
    ];
  }
}
