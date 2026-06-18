# Examples Matrix

RuleOak includes two first-launch demos to show that the governed-agent pattern is not tied to one domain.

| Example | Domain shape | Main question | Core pattern shown | Run command | Output |
|---|---|---|---|---|---|
| Technical Consultant Demo | Action-oriented case analysis | What happened, what evidence supports it, and what action needs approval? | evidence → probable cause → recommended action → policy decision → approval boundary → audit-style report | `npm run example:consultant` | `examples/technical-consultant-demo/out/case-report.json` |
| Research Brief Demo | Non-IT evidence review | What do the sources support, what is uncertain, and what requires approval before publishing? | sources → claims → confidence → known unknowns → recommendation → publication approval boundary | `npm run example:research` | `examples/research-brief-demo/out/research-brief-report.json` |

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

| Python Bridge | `examples/python-bridge/generic_bridge_sample.py` | Python SDK bridge private preview for RuleOak Core v1.3-compatible governance records | Python app integration |


## RuleOak Core v1.3: Governed Tool Calls

RuleOak Core v1.3 adds Tool Guard and an MCP Guard prototype. Start with `npm run guard:demo`, then read `docs/tool-guard.md` and `docs/mcp-guard.md`.

| Tool Guard | `npm run guard:demo` | Govern AI tool calls before execution with allow, approval-required, and blocked outcomes | Agent tool governance |


## Approval-gated write connectors

Run `npm run write:demo` to see GitHub-style, Jira-style, and local write intents governed by policy, approval, evidence, and audit before simulated execution.

See `docs/approval-gated-write-connectors.md`.


## Report viewer and telemetry export

Run `npm run viewer:build` to build a local report catalog and `npm run telemetry:export` to export local OpenTelemetry-style governance events.

See `docs/observability/report-viewer-and-telemetry.md`.


## LangGraph and CrewAI Adapter Samples

RuleOak Core v1.8 includes dependency-free adapter samples that show how to wrap agent-framework tool calls with RuleOak Tool Guard.

```bash
npm run adapter:demo
npm run test:adapters
```


## MCP Guard Proxy Prototype

RuleOak Core v1.8 includes a local in-process MCP Guard Proxy prototype for JSON-RPC `tools/call` requests.

```bash
npm run mcp:proxy:demo
npm run test:mcp-proxy
```

The proxy demonstrates how RuleOak can sit between an AI client and MCP-style tool execution.

## v2.0.1 polish guides

- [Govern an AI tool call in 10 minutes](integrations/govern-ai-tool-call-in-10-minutes.md)
- [Protocol compatibility statement](protocol/compatibility-statement.md)
- [Python SDK compatibility note](integrations/python-sdk-compatibility.md)
