# RuleOak Core v1.3 Documentation

RuleOak Core is an AGPL early runtime for governed AI workflows: policy, evidence, approval, audit, and deny-by-default boundaries.

## Start

1. [Quickstart](quickstart.md)
2. [Runtime lifecycle](runtime-lifecycle.md)
3. [Sandbox foundation](sandbox-foundation.md)
4. [Examples matrix](examples-matrix.md)
5. [Launch UX](ux/launch-ux.md)

## Build

6. [Build a vertical workflow](build-a-vertical.md)
7. [Local LLM readiness](local-llm.md)
8. [Trust model](trust-model.md)

## Security and boundaries

9. [Release boundaries](release-boundaries.md)
10. [Threat model](security/threat-model.md)
11. [Sandbox boundaries](security/sandbox-boundaries.md)
12. [LLM risk mapping](security/llm-risk-mapping.md)

## Project information

13. [License FAQ](license-faq.md)
14. [Brand rationale](brand-rationale.md)
15. [Two-minute demo script](demo-video-script.md)

## Integrations

- [Python SDK bridge private preview](integrations/python-sdk.md) — evaluate RuleOak Core v1.3-compatible governance records from Python applications through the private-preview bridge.


## Discovery and contribution

- [How RuleOak fits with other agent tools](comparisons.md)
- [Feedback tasks](community/feedback-tasks.md)
- [Python SDK bridge private preview](integrations/python-sdk.md)


## RuleOak Core v1.3: Governed Tool Calls

RuleOak Core v1.3 adds Tool Guard and an MCP Guard prototype. Start with `npm run guard:demo`, then read `docs/tool-guard.md` and `docs/mcp-guard.md`.

- [Read-only evidence connectors](evidence-connectors.md) — collect local fixture evidence from GitHub/Jira-style systems without write access.
- [GitHub/Jira read-only connector pattern](connectors/github-jira-readonly.md) — safe connector boundary for future enterprise integrations.


## Approval-gated write connectors

Run `npm run write:demo` to see GitHub-style, Jira-style, and local write intents governed by policy, approval, evidence, and audit before simulated execution.

See `docs/approval-gated-write-connectors.md`.


## Report viewer and telemetry export

Run `npm run viewer:build` to build a local report catalog and `npm run telemetry:export` to export local OpenTelemetry-style governance events.

See `docs/observability/report-viewer-and-telemetry.md`.


## Governance Record Protocol

RuleOak Core v1.8 adds `ruleoak.governance.v1`, a documented governance record protocol with JSON schemas, golden records, and a conformance test kit. This makes RuleOak records easier to validate across TypeScript Core, the private-preview Python bridge, and future adapters.

```bash
npm run protocol:conformance
npm run test:protocol
```


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

- [Policy packs](policy-packs.md) — reusable governance defaults for common agent risk areas.

- [Approval inbox](approval-inbox.md) — local approval review UX for approval-required actions.

## v2.0.1 polish guides

- [Govern an AI tool call in 10 minutes](integrations/govern-ai-tool-call-in-10-minutes.md)
- [Protocol compatibility statement](protocol/compatibility-statement.md)
- [Python SDK compatibility note](integrations/python-sdk-compatibility.md)
