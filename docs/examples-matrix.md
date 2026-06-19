# Examples Matrix

RuleOak includes two first-launch demos to show that the governed-agent pattern is not tied to one domain.

| Example | Domain shape | Main question | Core pattern shown | Run command | Output |
|---|---|---|---|---|---|
| Technical Consultant Demo | Action-oriented case analysis | What happened, what evidence supports it, and what action needs approval? | evidence → probable cause → recommended action → policy decision → approval boundary → audit-style report | `npm run example:consultant` | `examples/technical-consultant-demo/out/case-report.json` |
| Research Brief Demo | Non-IT evidence review | What do the sources support, what is uncertain, and what requires approval before publishing? | sources → claims → confidence → known unknowns → recommendation → publication approval boundary | `npm run example:research` | `examples/research-brief-demo/out/research-brief-report.json` |
| SRE Monitoring Change Governance | SRE / microservices monitoring audit | Should this production threshold change proceed, who approved it, and what evidence supports it? | request → evidence → policy → approval → audit chain → replayable evidence bundle | `npm run sre:monitoring-change` | `examples/sre-monitoring-change-governance/out/sre-monitoring-change-report.json` |
| AI Coding Agent Governance | Coding-agent / IDE assistant governance | Can an AI coding agent read, edit, test, push, or run shell commands safely? | repository evidence → policy decision → source-edit approval → destructive-command blocking → replayable report | `npm run coding:agent-governance` | `examples/ai-coding-agent-governance/out/ai-coding-agent-governance-report.json` |
| Enterprise RAG Answer Governance | Enterprise knowledge / document Q&A | Can an answer be generated only from approved, cited, redacted evidence? | corpus search → restricted-document approval → citation coverage → unsupported-answer blocking → report | `npm run rag:answer-governance` | `examples/enterprise-rag-answer-governance/out/enterprise-rag-answer-governance-report.json` |
| Personal Local-First Assistant Governance | Personal productivity / local-first apps | Can a local assistant draft safely while gating external actions? | local reads → draft evidence → privacy scan → send approval → private-upload blocking → report | `npm run personal:local-assistant-governance` | `examples/personal-local-first-assistant-governance/out/personal-local-first-assistant-governance-report.json` |

## Optional local LLM paths

| Example | Local LLM command |
|---|---|
| Technical Consultant Demo | `npm run example:consultant:llm` |
| Research Brief Demo | `npm run example:research:llm` |

Before using a local LLM:

```bash
npm run llm:doctor
npm run llm:pull
npm run llm:smoke
```

## Why two demos?

A single technical demo can make RuleOak look domain-specific. Two demos show the abstraction:

```text
policy boundary
+ evidence quality
+ approval decision
+ audit-style record
```

The demos are intentionally synthetic and small. They are not production systems.

| Python Bridge | `examples/python-bridge/generic_bridge_sample.py` | Python SDK bridge SDK preview for RuleOak Core-compatible governance records | Python app integration |


## RuleOak Core: Governed Tool Calls

RuleOak Core adds Tool Guard and an MCP Guard prototype. Start with `npm run guard:demo`, then read `docs/tool-guard.md` and `docs/mcp-guard.md`.

| Tool Guard | `npm run guard:demo` | Govern AI tool calls before execution with allow, approval-required, and blocked outcomes | Agent tool governance |


## Approval-gated write connectors

Run `npm run write:demo` to see GitHub-style, Jira-style, and local write intents governed by policy, approval, evidence, and audit before simulated execution.

See `docs/approval-gated-write-connectors.md`.


## Report viewer and telemetry export

Run `npm run viewer:build` to build a local report catalog and `npm run telemetry:export` to export local OpenTelemetry-style governance events.

See `docs/observability/report-viewer-and-telemetry.md`.


## LangGraph and CrewAI Adapter Samples

RuleOak Core v2.1.0 includes dependency-free adapter samples that show how to wrap agent-framework tool calls with RuleOak Tool Guard.

```bash
npm run adapter:demo
npm run test:adapters
```


## MCP Guard Proxy Prototype

RuleOak Core v2.1.0 includes a local in-process MCP Guard Proxy prototype for JSON-RPC `tools/call` requests.

```bash
npm run mcp:proxy:demo
npm run test:mcp-proxy
```

The proxy demonstrates how RuleOak can sit between an AI client and MCP-style tool execution.

## v2.1.0 user guides

- [Govern an AI tool call in 10 minutes](integrations/govern-ai-tool-call-in-10-minutes.md)
- [Protocol compatibility statement](protocol/compatibility-statement.md)
- [Python SDK compatibility note](integrations/python-sdk-compatibility.md)

## SRE reference vertical

Run `npm run sre:monitoring-change` to see the complete SRE reference vertical for a monitoring threshold change. It emits protocol records, a replayable evidence bundle, an append-only audit chain, an approval record, RACI data, and an HTML audit report.


## Reference vertical expansion

The additional RuleOak Core v2.1.0 verticals prove that RuleOak is a cross-domain governance layer, not only an SRE/audit demo:

```bash
npm run coding:agent-governance
npm run rag:answer-governance
npm run personal:local-assistant-governance
```

All three emit the same artifact pattern: governance records, evidence bundle, approval request, append-only audit log, JSON report, and HTML report.
