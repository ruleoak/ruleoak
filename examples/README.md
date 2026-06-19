# Examples

Start with:

```bash
npm run example:consultant
```

Then create your own copy:

```bash
npm run create:app -- my-consultant-app
```

## Included examples

| Example | Purpose |
|---|---|
| `technical-consultant-demo` | Copyable generic consultant workflow with policy, evidence, approval, and audit output |
| `basic-domain-pack` | Minimal domain pack structure |
| `sre-monitoring-change-governance` | Serious reference vertical for production monitoring threshold change governance |
| `ai-coding-agent-governance` | Reference vertical for governing coding-agent file, git, shell, secret, approval, and audit actions |
| `enterprise-rag-answer-governance` | Reference vertical for evidence-backed RAG answers with restricted-document approval and unsupported-answer blocking |
| `personal-local-first-assistant-governance` | Reference vertical for local-first assistant reads, external-send approval, and private-upload blocking |

Examples use synthetic data only.


## Research Brief Demo

```bash
npm run example:research
```

Shows a non-IT workflow: sourced claims, confidence, known unknowns, recommendation, approval boundary, and audit-style research output.

## Python bridge example

`python-bridge/` shows how a Python application can use the SDK-preview companion `ruleoak-py` SDK to emit RuleOak Core-compatible governance records. The example is generic and local-first.


## RuleOak Core: Governed Tool Calls

RuleOak Core adds Tool Guard and an MCP Guard prototype. Start with `npm run guard:demo`, then read `docs/tool-guard.md` and `docs/mcp-guard.md`.

## Tool Guard demo

Run `npm run guard:demo` to evaluate sample AI tool calls before execution: one allowed, one approval-required, and one blocked.

## Evidence Connectors Demo

Run `npm run connector:demo` to collect read-only evidence from local GitHub/Jira-style fixtures and a local notes file.


## Approval-gated write connectors

Run `npm run write:demo` to see GitHub-style, Jira-style, and local write intents governed by policy, approval, evidence, and audit before simulated execution.

See `docs/approval-gated-write-connectors.md`.


## Report viewer and telemetry export

Run `npm run viewer:build` to build a local report catalog and `npm run telemetry:export` to export local OpenTelemetry-style governance events.

See `docs/observability/report-viewer-and-telemetry.md`.

- `jira-readonly-demo/` — read-only Jira evidence connector fixture and live GET-only mode.

## SRE Monitoring Change Governance

```bash
npm run sre:monitoring-change
```

Shows a complete request → evidence → policy → approval → audit report → replay verification loop for a production monitoring threshold change.


## AI Coding Agent Governance

```bash
npm run coding:agent-governance
```

Shows governed coding-agent reads, source-edit approval, destructive-command blocking, and replayable evidence.

## Enterprise RAG Answer Governance

```bash
npm run rag:answer-governance
```

Shows evidence-backed answers, restricted-document approval, unsupported-answer blocking, and redaction evidence.

## Personal Local-First Assistant Governance

```bash
npm run personal:local-assistant-governance
```

Shows local-first personal assistant reads, draft creation, external-send approval, private-upload blocking, and audit output.
