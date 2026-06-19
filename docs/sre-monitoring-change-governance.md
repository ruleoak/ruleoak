# SRE Monitoring Change Governance Reference Vertical

RuleOak Core v2.1.0 includes a serious reference vertical for SRE and microservices monitoring audit scenarios.

The goal is to show the full governance loop for a production monitoring threshold change:

```text
request
→ policy-controlled evidence collection
→ production-write policy decision
→ approval record
→ audit chain
→ evidence-backed report
→ replay verification
```

## Version positioning

The latest public RuleOak Core release is **v2.1.0** and the earlier public baseline is **v1.0.1**. This SRE reference vertical is **RuleOak Core v2.1.0**. It should not be described as a public future major release until you actually publish a future major release.

## Run the reference vertical

```bash
npm run sre:monitoring-change
```

Then open:

```text
examples/sre-monitoring-change-governance/out/sre-monitoring-change-report.html
```

## Replay the governance evidence

```bash
node scripts/protocol-replay.js \
  examples/sre-monitoring-change-governance/out/evidence-bundle.json \
  examples/sre-monitoring-change-governance/out/audit-log.json
```

The replay step verifies:

- all records conform to `ruleoak.governance.v1`;
- record hashes match canonical payloads;
- the evidence bundle hash is valid;
- the audit-event chain is append-only and untampered.

## Policy decisions shown

| Action | Decision | Why |
|---|---|---|
| `read.metric_baseline` | allowed | local read-only evidence collection |
| `write.monitoring_threshold` | approval required, then approved | production monitoring write with risk impact |
| `disable.production_alert` | blocked | dangerous shortcut denied by default |

## Evidence records emitted

| Evidence | Source shape |
|---|---|
| Change request | local change-request fixture |
| Ticket state | Jira-style read-only fixture |
| Metric baseline | observability fixture |
| Current alert policy | Prometheus/Alertmanager-style fixture |
| Runbook control | local runbook fixture |
| Pull request | GitHub-style read-only fixture |
| RACI | local process-control fixture |

## Why this matters for moat

This vertical makes RuleOak easier to understand because it proves a concrete user journey:

> “An SRE team can add governance to an AI-assisted monitoring change workflow without redesigning the app, while still producing audit records, approval evidence, and replayable reports.”

It connects several moat components into one workflow:

- stable governance record protocol;
- policy packs;
- approval UX model;
- evidence-backed report;
- append-only audit chain;
- replay verifier;
- local-first operation;
- regulated-use-case path without overclaiming compliance.

## What this is not

This reference vertical is not:

- a certified compliance system;
- a replacement for Jira, ServiceNow, Prometheus, Grafana, or Alertmanager;
- a production execution engine;
- a security sandbox.

It is a reference governance boundary and evidence pattern that can be adapted to real enterprise connectors later.
