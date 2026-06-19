import { readFileSync } from "node:fs";
import { createConnectorEvidence } from "./connector-records.js";

function readFixture(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function countBy(items, field, fallback = "Unknown") {
  return items.reduce((acc, item) => {
    const key = item?.[field] || fallback;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function evidence({ id, source, subject, claim, value, fixtureOnly = true, metadata = {} }) {
  return createConnectorEvidence({
    connector: id,
    source,
    subject,
    claim,
    value,
    metadata: {
      readOnly: true,
      fixtureOnly,
      network: "not_used_by_fixture_connector",
      credentials: "not_required_by_fixture_connector",
      writes: "not_supported",
      ...metadata
    }
  });
}

export const ENTERPRISE_CONNECTOR_MANIFEST = Object.freeze({
  protocol: "ruleoak.enterprise_evidence_connectors.v1",
  governanceProtocol: "ruleoak.governance.v1",
  latestPublicCoreRelease: "v2.1.0",
  stage: "RuleOak Core v2.1.0",
  boundary: {
    mode: "read_only",
    writes: "not_supported_by_evidence_connectors",
    network: "disabled_for_fixture_connectors",
    credentials: "not_required_for_fixture_connectors",
    redaction: "connector outputs should avoid raw secrets and high-volume personal data"
  },
  connectors: [
    "github_readonly",
    "jira_readonly",
    "servicenow_readonly",
    "confluence_readonly",
    "gitlab_readonly",
    "splunk_readonly",
    "prometheus_readonly",
    "kubernetes_readonly",
    "cicd_readonly",
    "collaboration_readonly"
  ]
});

export class ServiceNowReadOnlyConnector {
  constructor({ fixture, id = "servicenow_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { instance: {}, changes: [], incidents: [] };
  }

  static fromFixture(path, options = {}) {
    return new ServiceNowReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const instance = this.fixture.instance || {};
    const changes = Array.isArray(this.fixture.changes) ? this.fixture.changes : [];
    const incidents = Array.isArray(this.fixture.incidents) ? this.fixture.incidents : [];
    return [
      evidence({
        id: this.id,
        source: instance.name || "servicenow-fixture",
        subject: "servicenow_instance",
        claim: "ServiceNow instance metadata was loaded from a local read-only fixture.",
        value: { name: instance.name, environment: instance.environment || "unknown" }
      }),
      evidence({
        id: this.id,
        source: "change_requests",
        subject: "change_requests",
        claim: "ServiceNow change request summary was loaded as approval and change-control evidence.",
        value: {
          total: changes.length,
          byState: countBy(changes, "state"),
          highRisk: changes.filter((c) => ["High", "Critical"].includes(c.risk || "")).map((c) => c.number),
          approved: changes.filter((c) => c.approval === "approved").map((c) => c.number)
        }
      }),
      evidence({
        id: this.id,
        source: "incidents",
        subject: "incidents",
        claim: "ServiceNow incident summary was loaded as operational-impact evidence.",
        value: {
          total: incidents.length,
          byPriority: countBy(incidents, "priority"),
          open: incidents.filter((i) => !["Closed", "Resolved"].includes(i.state || "")).map((i) => i.number)
        }
      })
    ];
  }
}

export class ConfluenceReadOnlyConnector {
  constructor({ fixture, id = "confluence_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { space: {}, pages: [] };
  }

  static fromFixture(path, options = {}) {
    return new ConfluenceReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const space = this.fixture.space || {};
    const pages = Array.isArray(this.fixture.pages) ? this.fixture.pages : [];
    return [
      evidence({
        id: this.id,
        source: space.key || "confluence-fixture",
        subject: "confluence_space",
        claim: "Confluence space metadata was loaded from a local read-only fixture.",
        value: { key: space.key, name: space.name }
      }),
      evidence({
        id: this.id,
        source: "pages",
        subject: "runbooks_and_decision_docs",
        claim: "Confluence page metadata was collected as documentation and runbook evidence.",
        value: {
          total: pages.length,
          labels: unique(pages.flatMap((p) => p.labels || [])),
          stalePages: pages.filter((p) => p.stale === true).map((p) => p.title),
          reviewedPages: pages.filter((p) => p.reviewed === true).map((p) => p.title)
        }
      })
    ];
  }
}

export class GitLabReadOnlyConnector {
  constructor({ fixture, id = "gitlab_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { project: {}, mergeRequests: [], pipelines: [] };
  }

  static fromFixture(path, options = {}) {
    return new GitLabReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const project = this.fixture.project || {};
    const mergeRequests = Array.isArray(this.fixture.mergeRequests) ? this.fixture.mergeRequests : [];
    const pipelines = Array.isArray(this.fixture.pipelines) ? this.fixture.pipelines : [];
    return [
      evidence({
        id: this.id,
        source: project.path || project.name || "gitlab-fixture",
        subject: "gitlab_project",
        claim: "GitLab project metadata was loaded from a local read-only fixture.",
        value: { path: project.path, defaultBranch: project.defaultBranch || project.default_branch, visibility: project.visibility || "unknown" }
      }),
      evidence({
        id: this.id,
        source: "merge_requests",
        subject: "merge_requests",
        claim: "GitLab merge-request status was collected as software-delivery evidence.",
        value: { total: mergeRequests.length, byState: countBy(mergeRequests, "state"), approvalsMissing: mergeRequests.filter((m) => (m.approvals || 0) < (m.requiredApprovals || 0)).map((m) => m.iid) }
      }),
      evidence({
        id: this.id,
        source: "pipelines",
        subject: "pipelines",
        claim: "GitLab pipeline status was collected as CI evidence.",
        value: { total: pipelines.length, byStatus: countBy(pipelines, "status"), failed: pipelines.filter((p) => p.status === "failed").map((p) => p.id) }
      })
    ];
  }
}

export class SplunkReadOnlyConnector {
  constructor({ fixture, id = "splunk_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { savedSearches: [], events: [] };
  }

  static fromFixture(path, options = {}) {
    return new SplunkReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const savedSearches = Array.isArray(this.fixture.savedSearches) ? this.fixture.savedSearches : [];
    const events = Array.isArray(this.fixture.events) ? this.fixture.events : [];
    return [
      evidence({
        id: this.id,
        source: "saved_searches",
        subject: "splunk_saved_searches",
        claim: "Splunk saved-search metadata was collected as observability evidence.",
        value: { total: savedSearches.length, names: savedSearches.map((s) => s.name), enabled: savedSearches.filter((s) => s.enabled !== false).map((s) => s.name) }
      }),
      evidence({
        id: this.id,
        source: "events",
        subject: "splunk_events",
        claim: "Splunk event summary was collected without storing raw logs.",
        value: { total: events.length, bySeverity: countBy(events, "severity"), services: unique(events.map((e) => e.service)) },
        metadata: { rawLogsStored: false }
      })
    ];
  }
}

export class PrometheusReadOnlyConnector {
  constructor({ fixture, id = "prometheus_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { targets: [], alerts: [], metrics: [] };
  }

  static fromFixture(path, options = {}) {
    return new PrometheusReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const targets = Array.isArray(this.fixture.targets) ? this.fixture.targets : [];
    const alerts = Array.isArray(this.fixture.alerts) ? this.fixture.alerts : [];
    const metrics = Array.isArray(this.fixture.metrics) ? this.fixture.metrics : [];
    return [
      evidence({
        id: this.id,
        source: "targets",
        subject: "prometheus_targets",
        claim: "Prometheus target health was collected as monitoring evidence.",
        value: { total: targets.length, up: targets.filter((t) => t.health === "up").length, down: targets.filter((t) => t.health !== "up").map((t) => t.job) }
      }),
      evidence({
        id: this.id,
        source: "alerts",
        subject: "prometheus_alerts",
        claim: "Prometheus alert summary was collected as active-risk evidence.",
        value: { total: alerts.length, byState: countBy(alerts, "state"), firing: alerts.filter((a) => a.state === "firing").map((a) => a.name) }
      }),
      evidence({
        id: this.id,
        source: "metrics",
        subject: "service_metrics",
        claim: "Prometheus metric baseline summary was collected for evidence-backed decisions.",
        value: { total: metrics.length, names: metrics.map((m) => m.name) }
      })
    ];
  }
}

export class KubernetesReadOnlyConnector {
  constructor({ fixture, id = "kubernetes_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { cluster: {}, namespaces: [], workloads: [], events: [] };
  }

  static fromFixture(path, options = {}) {
    return new KubernetesReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const cluster = this.fixture.cluster || {};
    const namespaces = Array.isArray(this.fixture.namespaces) ? this.fixture.namespaces : [];
    const workloads = Array.isArray(this.fixture.workloads) ? this.fixture.workloads : [];
    const events = Array.isArray(this.fixture.events) ? this.fixture.events : [];
    return [
      evidence({
        id: this.id,
        source: cluster.name || "kubernetes-fixture",
        subject: "cluster",
        claim: "Kubernetes/OpenShift cluster metadata was loaded from a local read-only fixture.",
        value: { name: cluster.name, distribution: cluster.distribution || "kubernetes", version: cluster.version }
      }),
      evidence({
        id: this.id,
        source: "workloads",
        subject: "workloads",
        claim: "Kubernetes workload readiness was collected as runtime evidence.",
        value: { total: workloads.length, byNamespace: countBy(workloads, "namespace"), notReady: workloads.filter((w) => w.ready !== true).map((w) => `${w.namespace}/${w.name}`) }
      }),
      evidence({
        id: this.id,
        source: "events",
        subject: "cluster_events",
        claim: "Kubernetes warning events were summarized without mutating the cluster.",
        value: { namespaceCount: namespaces.length, warnings: events.filter((e) => e.type === "Warning").map((e) => e.reason), totalEvents: events.length }
      })
    ];
  }
}

export class CiCdReadOnlyConnector {
  constructor({ fixture, id = "cicd_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { provider: {}, runs: [], artifacts: [] };
  }

  static fromFixture(path, options = {}) {
    return new CiCdReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const provider = this.fixture.provider || {};
    const runs = Array.isArray(this.fixture.runs) ? this.fixture.runs : [];
    const artifacts = Array.isArray(this.fixture.artifacts) ? this.fixture.artifacts : [];
    return [
      evidence({
        id: this.id,
        source: provider.name || "cicd-fixture",
        subject: "cicd_provider",
        claim: "CI/CD provider metadata was loaded from a local read-only fixture.",
        value: { name: provider.name, type: provider.type || "unknown" }
      }),
      evidence({
        id: this.id,
        source: "pipeline_runs",
        subject: "pipeline_runs",
        claim: "CI/CD run status was collected as release evidence.",
        value: { total: runs.length, byStatus: countBy(runs, "status"), failed: runs.filter((r) => r.status === "failed").map((r) => r.id), successfulDeployments: runs.filter((r) => r.status === "success" && r.environment === "production").map((r) => r.id) }
      }),
      evidence({
        id: this.id,
        source: "artifacts",
        subject: "build_artifacts",
        claim: "CI/CD artifact metadata was collected without downloading binaries.",
        value: { total: artifacts.length, names: artifacts.map((a) => a.name), checksummed: artifacts.filter((a) => Boolean(a.sha256)).map((a) => a.name) },
        metadata: { binariesDownloaded: false }
      })
    ];
  }
}

export class CollaborationReadOnlyConnector {
  constructor({ fixture, id = "collaboration_readonly" } = {}) {
    this.id = id;
    this.fixture = fixture || { workspace: {}, approvals: [], messages: [] };
  }

  static fromFixture(path, options = {}) {
    return new CollaborationReadOnlyConnector({ ...options, fixture: readFixture(path) });
  }

  collectEvidence() {
    const workspace = this.fixture.workspace || {};
    const approvals = Array.isArray(this.fixture.approvals) ? this.fixture.approvals : [];
    const messages = Array.isArray(this.fixture.messages) ? this.fixture.messages : [];
    return [
      evidence({
        id: this.id,
        source: workspace.name || "collaboration-fixture",
        subject: "collaboration_workspace",
        claim: "Collaboration workspace metadata was loaded from a local read-only fixture.",
        value: { name: workspace.name, system: workspace.system || "unknown" }
      }),
      evidence({
        id: this.id,
        source: "approvals",
        subject: "approval_discussions",
        claim: "Approval discussion summary was collected without storing full chat transcripts.",
        value: { total: approvals.length, byDecision: countBy(approvals, "decision"), approvedBy: unique(approvals.filter((a) => a.decision === "approved").map((a) => a.actor)) },
        metadata: { fullTranscriptStored: false }
      }),
      evidence({
        id: this.id,
        source: "messages",
        subject: "collaboration_messages",
        claim: "Message metadata was summarized for governance evidence without raw message bodies.",
        value: { total: messages.length, channels: unique(messages.map((m) => m.channel)), linkedTickets: unique(messages.map((m) => m.ticket)) },
        metadata: { rawMessagesStored: false }
      })
    ];
  }
}

export function enterpriseConnectorCatalog() {
  return {
    ...ENTERPRISE_CONNECTOR_MANIFEST,
    connectorCount: ENTERPRISE_CONNECTOR_MANIFEST.connectors.length,
    recommendedOrder: [
      "github_readonly",
      "jira_readonly",
      "servicenow_readonly",
      "confluence_readonly",
      "gitlab_readonly",
      "splunk_readonly",
      "prometheus_readonly",
      "kubernetes_readonly",
      "cicd_readonly",
      "collaboration_readonly"
    ]
  };
}
