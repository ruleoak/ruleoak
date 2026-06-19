# SRE Monitoring Change Governance Reference Vertical

This reference vertical shows a realistic governance loop for a production microservices monitoring threshold change.

It is designed for SRE, platform, audit, and governance teams who need to prove:

```text
request → evidence collection → policy decision → approval → audit report → replay verification
```

The example is synthetic and local-first. It does not connect to real Jira, GitHub, Prometheus, Alertmanager, or bank systems.

## Run

```bash
npm run sre:monitoring-change
```

Outputs are written to:

```text
examples/sre-monitoring-change-governance/out/
```

Key outputs:

| Output | Purpose |
|---|---|
| `sre-monitoring-change-report.json` | Human-readable governance report data |
| `sre-monitoring-change-report.html` | Local audit-report viewer output |
| `evidence-bundle.json` | Protocol v1 evidence bundle with canonical bundle hash |
| `audit-log.json` | Append-only audit chain with event hashes |
| `approval-request.json` | Approval record for the threshold write |
| `governance-records.json` | All protocol records emitted by the flow |
| `raci.json` | Process RACI for the monitoring change workflow |

## Replay verification

```bash
node scripts/protocol-replay.js \
  examples/sre-monitoring-change-governance/out/evidence-bundle.json \
  examples/sre-monitoring-change-governance/out/audit-log.json
```

Expected result:

```json
{
  "valid": true
}
```

## What this proves

| Governance question | RuleOak evidence |
|---|---|
| Was evidence collected before the production write? | Seven `EvidenceRecord` objects cover request, ticket, metrics, policy, runbook, PR, and RACI. |
| Was policy separate from the prompt? | `policy.json` and `policy-packs/sre-monitoring-change/pack.json` declare allow / approval / deny actions. |
| Was a risky action gated? | `write.monitoring_threshold` is `approval_required` and receives an `ApprovalRecord`. |
| Was a dangerous shortcut blocked? | `disable.production_alert` is denied by policy. |
| Can audit reproduce the flow? | `evidence-bundle.json` and `audit-log.json` pass replay verification. |
| Is it local-first? | All fixtures, records, report, and verification run locally. |

## Process and RACI shape

The RACI covers five process steps:

1. receive threshold-change request;
2. collect ticket, metric, alert-policy, runbook, PR, and RACI evidence;
3. evaluate policy before production write;
4. approve or reject the change;
5. implement only after approval and retain the evidence bundle.

## Scope boundary

RuleOak provides a governance and evidence boundary. This reference vertical is not a certified compliance product, not an alerting platform, and not a production sandbox.
