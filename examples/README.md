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

Examples use synthetic data only.


## Research Brief Demo

```bash
npm run example:research
```

Shows a non-IT workflow: sourced claims, confidence, known unknowns, recommendation, approval boundary, and audit-style research output.

## Python bridge example

`python-bridge/` shows how a Python application can use the private-preview companion `ruleoak-py` SDK to emit RuleOak Core v1.0-compatible governance records. The example is generic and local-first.


## RuleOak Core v1.3: Governed Tool Calls

RuleOak Core v1.3 adds Tool Guard and an MCP Guard prototype. Start with `npm run guard:demo`, then read `docs/tool-guard.md` and `docs/mcp-guard.md`.

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
