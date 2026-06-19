# Real Evidence Connectors v1

RuleOak Core v2.1.0 includes a first real-connector layer for read-only enterprise evidence collection.

This is different from the fixture-backed enterprise connector catalog:

- fixture connectors are offline examples;
- real connectors use bounded HTTP GET requests;
- all real connectors are read-only;
- connector output is summarized evidence, not raw high-volume data dumps;
- credentials are never written into evidence records.

## Connectors included

| Connector | Purpose | Boundary |
|---|---|---|
| GitHub API read-only | repository, issue, pull request metadata | GET-only |
| Jira API read-only | issue metadata from JQL search | GET-only |
| ServiceNow API read-only | change and incident summaries | GET-only |
| Confluence API read-only | page/runbook metadata through CQL search | GET-only |
| GitLab API read-only | project, merge request, pipeline metadata | GET-only |
| Prometheus API read-only | targets, alerts, bounded query result | GET-only |
| Grafana API read-only | dashboard and alert-rule metadata | GET-only |

## Run the local smoke example

The example uses mocked fetch responses. It does not call your real enterprise systems.

```bash
npm run evidence:real:v1
npm run evidence:real:check
```

Generated output:

```text
examples/real-evidence-connectors-v1/out/real-evidence-connectors-report.json
```

## Environment variables for real use

```bash
# GitHub
export GITHUB_TOKEN=...
export RULEOAK_GITHUB_REPO=owner/repo

# Jira
export RULEOAK_JIRA_BASE_URL=https://example.atlassian.net
export RULEOAK_JIRA_EMAIL=you@example.com
export RULEOAK_JIRA_API_TOKEN=...
export RULEOAK_JIRA_JQL='project = ABC ORDER BY updated DESC'

# ServiceNow
export RULEOAK_SERVICENOW_BASE_URL=https://example.service-now.com
export RULEOAK_SERVICENOW_TOKEN=...

# Confluence
export RULEOAK_CONFLUENCE_BASE_URL=https://example.atlassian.net
export RULEOAK_CONFLUENCE_EMAIL=you@example.com
export RULEOAK_CONFLUENCE_API_TOKEN=...
export RULEOAK_CONFLUENCE_CQL='space=OPS and type=page order by lastmodified desc'

# GitLab
export RULEOAK_GITLAB_BASE_URL=https://gitlab.com
export RULEOAK_GITLAB_PROJECT_ID=group/project
export RULEOAK_GITLAB_TOKEN=...

# Prometheus
export RULEOAK_PROMETHEUS_BASE_URL=https://prometheus.example
export RULEOAK_PROMETHEUS_QUERY=up

# Grafana
export RULEOAK_GRAFANA_BASE_URL=https://grafana.example
export RULEOAK_GRAFANA_TOKEN=...
```

## Safety boundary

The real connector layer is intentionally narrow:

- only GET/HEAD requests are allowed by the shared HTTP helper;
- no connector has write methods;
- no ticket transitions, comments, deployments, deletes, approvals, or updates are performed;
- raw logs, raw chat transcripts, and raw document bodies are not stored;
- outputs are bounded by `maxRecords`, timeout, retry, and diagnostic controls.

Write actions should continue to use RuleOak approval-gated write workflows instead of evidence connectors.

## Developer value

This layer helps developers generate evidence-backed reports from real enterprise systems without giving the AI agent write credentials. The agent can use RuleOak evidence records to justify a decision while RuleOak keeps the connector boundary read-only and replayable.
