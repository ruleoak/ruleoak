# Enterprise Evidence Connectors

RuleOak Core v2.1.0 includes a broader enterprise evidence connector layer for serious governed workflows.

This is **RuleOak Core v2.1.0**. The latest public RuleOak Core release remains **v2.1.0**. The connector contract is intended to mature without changing the public release history.

## What this layer adds

The connector catalog now covers common enterprise evidence sources:

| Connector | Evidence purpose | Boundary |
|---|---|---|
| GitHub | repository, issues, pull requests | read-only |
| Jira | tickets, status, priority | read-only |
| ServiceNow | change requests, incidents, approvals | read-only |
| Confluence | runbooks, standards, decision pages | read-only |
| GitLab | merge requests, pipelines | read-only |
| Splunk | saved searches, summarized events | read-only, no raw log storage |
| Prometheus | targets, alerts, metric baselines | read-only |
| Kubernetes / OpenShift | cluster metadata, workload readiness, warning events | read-only |
| CI/CD | pipeline runs, artifacts, deployment status | read-only, no binary download |
| Slack / Teams style collaboration | approval metadata and linked discussions | read-only, no full transcript storage |

## Run the reference example

```bash
npm run enterprise:connectors
npm run enterprise:connectors:catalog
```

The example uses local fixtures. It does not call external APIs, use credentials, or write back to enterprise systems.

## Why this strengthens the moat

Evidence connectors are where governance becomes useful to serious teams. They connect AI decisions to the systems auditors and reviewers already understand:

```text
request
→ policy decision
→ enterprise evidence
→ approval record
→ audit report
→ replay verification
```

The moat is not only the connector code. The moat is the common evidence contract:

- every connector emits evidence records;
- every record is read-only by default;
- high-volume logs and chat bodies are summarized;
- credentials are never stored in evidence output;
- generated reports can be reviewed and replayed.

## Safety boundary

Evidence connectors should not mutate external systems. Write actions must use approval-gated write connectors or a separate controlled workflow.

Safe wording:

> RuleOak enterprise evidence connectors collect read-only evidence for governed AI workflows.

Avoid saying:

> RuleOak integrates with all enterprise systems for production compliance.

The current implementation is a reference boundary and fixture-backed example, not a certified enterprise integration pack.
