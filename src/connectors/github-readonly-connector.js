import { readFileSync } from "node:fs";
import { createConnectorEvidence } from "./connector-records.js";

export class GitHubReadOnlyConnector {
  constructor({ fixture, id = "github_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { repository: {}, issues: [], pullRequests: [] };
  }

  static fromFixture(path, options = {}) {
    return new GitHubReadOnlyConnector({ ...options, fixture: JSON.parse(readFileSync(path, "utf8")) });
  }

  collectEvidence() {
    const repo = this.fixture.repository || {};
    const issues = Array.isArray(this.fixture.issues) ? this.fixture.issues : [];
    const pullRequests = Array.isArray(this.fixture.pullRequests) ? this.fixture.pullRequests : [];
    return [
      createConnectorEvidence({
        connector: this.id,
        source: repo.fullName || repo.name || "github-fixture",
        subject: "repository",
        claim: "Repository metadata was loaded from a local read-only GitHub fixture.",
        value: { name: repo.fullName || repo.name, defaultBranch: repo.defaultBranch || repo.default_branch || "unknown", visibility: repo.visibility || "unknown" },
        metadata: { fixtureOnly: true }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: "issues",
        subject: "issues",
        claim: "Open issue count was loaded from a local read-only GitHub fixture.",
        value: { total: issues.length, open: issues.filter((i) => (i.state || "open") === "open").length, labels: [...new Set(issues.flatMap((i) => i.labels || []))] },
        metadata: { fixtureOnly: true }
      }),
      createConnectorEvidence({
        connector: this.id,
        source: "pull_requests",
        subject: "pull_requests",
        claim: "Pull request metadata was loaded from a local read-only GitHub fixture.",
        value: { total: pullRequests.length, open: pullRequests.filter((p) => (p.state || "open") === "open").length },
        metadata: { fixtureOnly: true }
      })
    ];
  }
}
